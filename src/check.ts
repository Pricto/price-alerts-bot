import type { Tools } from "./mcp.js";

/** Una alerta de alerts.json: avisar cuando `product` (product_id o código de barras) cueste menos que `below`. */
export type Alert = { product: string; below: number; retailers?: string[] };

export type Hit = {
  product: string; name: string; retailer: string; price: number; before: number | null;
  below: number; currency: string; url: string; observed_at: string; attribution: string;
};

type Prices = {
  product: { product_id: string; name: string };
  currency: string;
  prices: { retailer: string; retailer_id: string; price: number; url: string; observed_at: string }[];
  attribution: string;
};

const dayBefore = (iso: string) => new Date(Date.parse(iso.slice(0, 10)) - 86_400_000).toISOString().slice(0, 10);

/**
 * Tiendas donde el precio está bajo el umbral. Con `onlyNew`, solo las que el día anterior estaban
 * en el umbral o sobre él: así el bot no necesita guardar estado y no repite el aviso cada día.
 */
export async function check(tools: Tools, alerts: Alert[], onlyNew = true): Promise<Hit[]> {
  const hits: Hit[] = [];
  for (const alert of alerts) {
    const args = { product: alert.product, ...(alert.retailers && { retailers: alert.retailers }) };
    const now = await tools.call<Prices>("get_prices", args);
    const under = now.prices.filter((p) => p.price < alert.below);
    if (!under.length) continue;

    let before = new Map<string, number>();
    if (onlyNew) {
      const previous = await tools.call<Prices>("get_prices", { ...args, as_of: dayBefore(under[0].observed_at) });
      before = new Map(previous.prices.map((p) => [p.retailer_id, p.price]));
    }
    for (const p of under) {
      const was = before.get(p.retailer_id) ?? null;
      if (onlyNew && was !== null && was < alert.below) continue;
      hits.push({
        product: now.product.product_id, name: now.product.name, retailer: p.retailer, price: p.price, before: was,
        below: alert.below, currency: now.currency, url: p.url, observed_at: p.observed_at, attribution: now.attribution,
      });
    }
  }
  return hits;
}
