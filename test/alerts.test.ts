// Lógica de las alertas con tools falsas, y el bot completo contra la sandbox pública por MCP.
import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../src/check.js";
import { connect, type Tools } from "../src/mcp.js";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { message, notify } from "../src/notify.js";

// get_prices de mentira: hoy y el día anterior (as_of).
function fakeTools(today: Record<string, number>, yesterday: Record<string, number>): Tools {
  const prices = (day: Record<string, number>) => Object.entries(day).map(([retailer, price]) => ({
    retailer, retailer_id: retailer, price, url: `https://example.com/${retailer}`, observed_at: "2026-10-23T11:00:00Z",
  }));
  return {
    async call<T>(_name: string, args: Record<string, unknown>) {
      return { product: { product_id: "prd_x", name: "Leche" }, currency: "CLP", attribution: "Fuente", prices: prices(args.as_of ? yesterday : today) } as T;
    },
    async close() {},
  };
}

test("avisa solo cuando el precio cruza el umbral, no cada día que sigue abajo", async () => {
  const tools = fakeTools({ a: 990, b: 980, c: 1200, d: 900 }, { a: 1090, b: 950, c: 1300 });
  const hits = await check(tools, [{ product: "prd_x", below: 1000 }]);
  assert.deepEqual(hits.map((h) => [h.retailer, h.before]), [["a", 1090], ["d", null]]);
});

test("--all avisa todas las tiendas bajo el umbral", async () => {
  const tools = fakeTools({ a: 990, b: 980, c: 1200 }, { a: 1090, b: 950, c: 1300 });
  const hits = await check(tools, [{ product: "prd_x", below: 1000 }], false);
  assert.deepEqual(hits.map((h) => h.retailer), ["a", "b"]);
});

test("el mensaje lleva producto, precio, tienda, umbral y enlace", () => {
  const text = message({ product: "prd_x", name: "Leche", retailer: "Jumbo", price: 990, before: 1090, below: 1000, currency: "CLP", url: "https://example.com/x", observed_at: "", attribution: "" });
  assert.match(text, /Leche.*990.*Jumbo.*1[.,]000.*1[.,]090.*https:\/\/example\.com\/x/);
});

test("ntfy y webhook reciben el aviso", async () => {
  const received: Record<string, any> = {};
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received[req.url!] = JSON.parse(body);
    res.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const hit = { product: "prd_x", name: "Leche", retailer: "Jumbo", price: 990, before: 1090, below: 1000, currency: "CLP", url: "https://example.com/x", observed_at: "", attribution: "Fuente" };
  try {
    await notify([hit], { NTFY_URL: `${base}/ntfy`, NTFY_TOPIC: "mis-precios", WEBHOOK_URL: `${base}/hook` });
  } finally {
    server.close();
  }
  assert.equal(received["/ntfy"].topic, "mis-precios");
  assert.equal(received["/ntfy"].click, "https://example.com/x");
  assert.match(received["/hook"].text, /Leche/);
  assert.equal(received["/hook"].alerts[0].price, 990);
});

test("sandbox por MCP: buscar, y un umbral sobre el precio máximo avisa en cada tienda", async () => {
  const tools = await connect(undefined);
  try {
    const found = await tools.call<{ results: { product_id: string; max_price: number; retailers: number }[] }>("search_products", { query: "leche entera 1 litro", limit: 1 });
    const [first] = found.results;
    const all = await check(tools, [{ product: first.product_id, below: first.max_price + 1 }], false);
    assert.equal(all.length, first.retailers);
    assert.deepEqual(await check(tools, [{ product: first.product_id, below: 1 }]), []);
  } finally {
    await tools.close();
  }
});

test("un producto que no existe falla con la pista de la API", async () => {
  const tools = await connect(undefined);
  try {
    await assert.rejects(check(tools, [{ product: "prd_no_existe", below: 1 }]), /search_products/);
  } finally {
    await tools.close();
  }
});
