// El bot usa las mismas tools del MCP de Pricto que un agente: search_products, get_prices, etc.
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const DEFAULT_URL = "https://pricto.dev";

export type Tools = { call<T>(name: string, args: Record<string, unknown>): Promise<T>; close(): Promise<void> };

/** Sin PRICTO_API_KEY se conecta a la sandbox sin login (/mcp/sandbox); con key, a /mcp. */
export async function connect(key = process.env.PRICTO_API_KEY, base = process.env.PRICTO_API_URL || DEFAULT_URL): Promise<Tools> {
  const url = new URL(key ? "/mcp" : "/mcp/sandbox", base);
  const options = key ? { requestInit: { headers: { Authorization: `Bearer ${key}` } } } : undefined;
  const client = new Client({ name: "price-alerts-bot", version: "0.1.0" });
  await withRetry(() => client.connect(new StreamableHTTPClientTransport(url, options)));
  const lang = (process.env.LANG ?? "").startsWith("es") ? "es" : "en";

  return {
    async call<T>(name: string, args: Record<string, unknown>) {
      const result = await withRetry(() => client.callTool({ name, arguments: { lang, ...args } }));
      // Los errores de las tools vuelven como texto con la pista de qué hacer.
      if (result.isError) throw new Error(result.content.map((c) => ("text" in c ? c.text : "")).join(" "));
      return result.structuredContent as T;
    },
    close: () => client.close(),
  };
}

// 429: se espera 1, 2, 4 y 8 segundos antes de rendirse.
async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      if ((error as { data?: { status?: number } }).data?.status !== 429 || i === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (i - 1)));
    }
  }
}
