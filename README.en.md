# Supermarket price alerts for Chile

[![Tests](https://github.com/Pricto/alertas-de-precios-chile/actions/workflows/tests.yml/badge.svg)](https://github.com/Pricto/alertas-de-precios-chile/actions/workflows/tests.yml)
[![MIT license](https://img.shields.io/badge/license-MIT-0f5a45.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Node%2022-0f5a45.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-sandbox%2C%20no%20login-b0401f.svg)](https://pricto.dev/docs/mcp)

Get notified when a product at Jumbo, Unimarc, Santa Isabel, Cruz Verde or another Chilean store drops below the price you picked: on the console, as an [ntfy](https://ntfy.sh) push notification (no account needed) or through a webhook (Slack, Discord or your own server). It uses the [Pricto](https://pricto.dev) price API over MCP, with the same tools an agent uses, and an agent can set up the alerts for you.

[Español](README.md) · [MCP docs](https://pricto.dev/docs/mcp) · [Coverage](https://pricto.dev/cobertura) · [Create a free account](https://pricto.dev/registro)

![The bot finds a product and reports two price drops](docs/terminal-en.png)

## Try it in a minute

Needs Node 22 or later. No account needed: without `PRICTO_API_KEY` it connects to Pricto's public sandbox over MCP (`/mcp/sandbox`, no login), which answers with sample data.

```bash
git clone https://github.com/Pricto/alertas-de-precios-chile && cd alertas-de-precios-chile
npm install
npm start                        # checks alerts.json
npm start -- find "sunscreen"    # finds the product_id for an alert
```

## Alerts

`alerts.json` is a list. Each alert says which product to watch and below which price to notify:

```json
[
  { "product": "prd_0xnive", "below": 13000 },
  { "product": "prd_0gnesc", "below": 5500, "retailers": ["cl-jumbo", "cl-unimarc"] }
]
```

| Field | What it is |
|---|---|
| `product` | `product_id` (from `find` or the `search_products` tool) or a barcode |
| `below` | Notify when the price falls below this amount, in local currency (CLP has no decimals) |
| `retailers` | Optional: only these stores |

The bot notifies once, on the day the price crosses the threshold: it compares today's price with the previous day's (`get_prices` with `as_of`), so it keeps no state and doesn't repeat the alert while the price stays low. `npm start -- --all` reports every store under the threshold today, and `--dry-run` shows what it would send without sending anything.

## Which stores it watches

The ones the Pricto API captures daily ([full list and status of each](https://pricto.dev/cobertura), source registry as of 2026-10-24):

- Supermarkets: Jumbo, Santa Isabel, Unimarc, Alvi, Mayorista Nacional, Supermercado La Herradura, Supermercados José González, Alimentika, Compras Aqui and Distribuidora Fermarket.
- Pharmacies: Cruz Verde, Farmacias Ahumada, Farmacias del Dr. Simi, Farmacias Knop, Farmacias Novasalud, EcoFarmacias, Farmacia Meki, Farmaloop, Farmazon and Cofar.
- And more than 100 electronics, home, department, pet, sports and other stores.

It does not cover Lider, Tottus, Superbodega aCuenta, Salcobrand or Preunic: they block bots that identify themselves or their terms don't allow it. The sandbox has made-up data for Jumbo, Santa Isabel, Unimarc, Cruz Verde, Farmacias Ahumada, Dr. Simi and Knop; real prices need a [free account](https://pricto.dev/registro).

## Where alerts go

| Variable | What it does |
|---|---|
| `NTFY_TOPIC` | Publishes to `ntfy.sh/<topic>`. Install the ntfy app (or open `https://ntfy.sh/<topic>`) and subscribe to the same topic. There is no account: the topic name works as a password, so pick one that is hard to guess. `NTFY_URL` points to your own server if you have one. |
| `WEBHOOK_URL` | Sends a JSON `POST`: `text` and `content` hold the message (the fields Slack and Discord incoming webhooks read) and `alerts` holds the details of each alert. |
| `PRICTO_API_KEY` | Your API key ([create a free account](https://pricto.dev/registro)). Without it, the sandbox. |
| `PRICTO_API_URL` | Another API instance (default `https://pricto.dev`) |
| `LANG` | `es_CL.UTF-8` for messages and product names in Spanish; English otherwise. |

Without `NTFY_TOPIC` or `WEBHOOK_URL`, alerts only go to the console.

## Run it every day

The repo includes [`.github/workflows/alerts.yml`](.github/workflows/alerts.yml): GitHub Actions runs it once a day (13:00 UTC) and on demand from the Actions tab. Under Settings → Secrets and variables → Actions add `NTFY_TOPIC` or `WEBHOOK_URL`, and `PRICTO_API_KEY` for real data. To change the alerts, edit `alerts.json` and commit.

## With your agent

The repo includes [`.mcp.json`](.mcp.json) with the sandbox MCP server and [`AGENTS.md`](AGENTS.md) with instructions. Claude Code reads both when you open the repo (it asks you to approve the server the first time); in Cursor or VS Code, add the same URL to their MCP settings ([how, for each client](https://pricto.dev/docs/mcp)). Then ask in your own words. Requests and questions that work with the sandbox data:

- Let me know when Nescafé Tradición coffee drops below CLP 5,500 at Jumbo or Unimarc.
- Add an alert for Nivea SPF 50 sunscreen below CLP 13,000 at any store.
- Which of my alerts is under its threshold today?
- Which pharmacy has paracetamol 16 tablets cheapest, and since when?

The agent finds the product with `search_products`, checks today's price with `get_prices`, tells you which store and when it was observed, and adds the alert to `alerts.json`. For real data, change the URL in `.mcp.json` to `https://pricto.dev/mcp` and add the header `Authorization: Bearer <your key>`.

## How it works

```
src/mcp.ts      MCP client (official SDK): /mcp/sandbox without a key, /mcp with one; retries 429s
src/check.ts    get_prices today and the day before → stores that crossed the threshold
src/notify.ts   console, ntfy and webhook
src/index.ts    the command line
```

Alerts use `price`, what anyone pays; the store-card price (`card_price`) and multi-buy promotions come separately in the response.

What it costs with a real key: `get_prices` charges 1 credit per store, and the previous-day lookup only runs for products under the threshold today. Repeating the same query within 24 hours is free. Plans at [pricto.dev/precios](https://pricto.dev/precios).

## Tests

The logic is tested with fake tools, and the whole bot against the public sandbox over MCP:

```bash
npm test
npm run typecheck
```

`PRICTO_API_URL=http://localhost:8787 npm test` runs them against a local instance.

## FAQ

**How do I get notified when a Chilean supermarket product drops in price?**
Add the product and your price to `alerts.json` and let the daily workflow run the bot: when the price at Jumbo, Unimarc, Cruz Verde or another covered store falls below your threshold, you get an ntfy or webhook notification.

**Is there an MCP server for Chilean supermarkets for Claude or ChatGPT?**
Yes: [Pricto's MCP server](https://pricto.dev/docs/mcp). The sandbox at `https://pricto.dev/mcp/sandbox` needs no login and works with Claude, ChatGPT, Cursor and VS Code; for real data, `https://pricto.dev/mcp` with your key.

**Do I need a Telegram, Slack or email account?**
No. ntfy needs no account. If you already use Slack or Discord, point `WEBHOOK_URL` at an incoming webhook.

**Does it watch Lider and Tottus?**
No: they block bots that identify themselves. If a chain provides a feed or permission, it comes into coverage ([pricto.dev/cobertura](https://pricto.dev/cobertura)).

**Are sandbox prices real?**
No: it is sample data. With a free account (100 credits a month, no card) the API returns real prices.

**Does it notify me every day while the price stays low?**
No: only on the day it crosses. To see everything under the threshold today, `npm start -- --all`.

## License

[MIT](LICENSE).
