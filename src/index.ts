// price-alerts-bot [--config alerts.json] [--all] [--dry-run] · price-alerts-bot find "texto"
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { check, type Alert } from "./check.js";
import { connect, type Tools } from "./mcp.js";
import { es, money, notify } from "./notify.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    config: { type: "string", default: "alerts.json" },
    all: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

type Search = { results: { product_id: string; name: string; min_price: number | null; currency: string; retailers: number }[] };

let tools: Tools | undefined;
try {
  tools = await connect();
  if (positionals[0] === "find") {
    // Para encontrar el product_id que va en alerts.json.
    const { results } = await tools.call<Search>("search_products", { query: positionals.slice(1).join(" "), limit: 8 });
    for (const r of results) {
      const from = r.min_price === null ? "" : `${es ? "desde" : "from"} ${money(r.min_price, r.currency)}`;
      console.log(`${r.product_id}  ${r.name}  ${from}`);
    }
  } else {
    const alerts: Alert[] = JSON.parse(await readFile(values.config, "utf8"));
    const hits = await check(tools, alerts, !values.all);
    if (!hits.length) console.log(es ? `Sin alertas nuevas (${alerts.length} productos revisados).` : `No new alerts (${alerts.length} products checked).`);
    else if (values["dry-run"]) console.log(hits);
    else await notify(hits);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await tools?.close();
}
