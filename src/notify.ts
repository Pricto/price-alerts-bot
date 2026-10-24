import type { Hit } from "./check.js";

export const es = (process.env.LANG ?? "").startsWith("es");

export const money = (n: number, currency: string) =>
  new Intl.NumberFormat(es ? "es-CL" : "en-US", { style: "currency", currency, currencyDisplay: es ? "symbol" : "code", maximumFractionDigits: currency === "CLP" ? 0 : 2 }).format(n);

export function message(h: Hit): string {
  const price = money(h.price, h.currency), below = money(h.below, h.currency);
  const before = h.before === null ? "" : es ? `; antes ${money(h.before, h.currency)}` : `; was ${money(h.before, h.currency)}`;
  return es
    ? `${h.name}: ${price} en ${h.retailer} (bajo tu umbral de ${below}${before}). ${h.url}`
    : `${h.name}: ${price} at ${h.retailer} (below your ${below}${before}). ${h.url}`;
}

/** Siempre a la consola; además a ntfy y a un webhook si están configurados. */
export async function notify(hits: Hit[], env = process.env): Promise<void> {
  // Cada producto con sus tiendas y la línea de fuente que entrega la API.
  const products = Map.groupBy(hits, (h) => h.product);
  const text = [...products.values()].map((group) => [...group.map(message), group[0].attribution].join("\n")).join("\n\n");
  console.log(text);
  const title = es ? "Alerta de precio" : "Price alert";
  const sends: Promise<Response>[] = [];
  if (env.NTFY_TOPIC) {
    // ntfy.sh: notificaciones push al celular o al navegador sin crear cuenta.
    sends.push(fetch(env.NTFY_URL || "https://ntfy.sh", {
      method: "POST",
      body: JSON.stringify({ topic: env.NTFY_TOPIC, title, message: text, ...(hits.length === 1 && { click: hits[0].url }) }),
    }));
  }
  if (env.WEBHOOK_URL) {
    // `text` y `content` son los campos que leen los webhooks entrantes de Slack y de Discord.
    sends.push(fetch(env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text, alerts: hits }),
    }));
  }
  for (const res of await Promise.all(sends)) {
    if (!res.ok) throw new Error(`${res.url}: HTTP ${res.status}`);
  }
}
