# Alertas de precios de supermercados en Chile

[![Tests](https://github.com/Pricto/alertas-de-precios-chile/actions/workflows/tests.yml/badge.svg)](https://github.com/Pricto/alertas-de-precios-chile/actions/workflows/tests.yml)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-0f5a45.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Node%2022-0f5a45.svg)](package.json)
[![MCP](https://img.shields.io/badge/MCP-sandbox%20sin%20login-b0401f.svg)](https://pricto.dev/docs/mcp)

Te avisa cuando un producto de Jumbo, Unimarc, Santa Isabel, Cruz Verde u otra tienda de Chile baja del precio que elegiste: por la consola, con una notificación push de [ntfy](https://ntfy.sh) (sin crear cuenta) o con un webhook (Slack, Discord o tu propio servidor). Usa la API de precios de [Pricto](https://pricto.dev) por MCP, con las mismas tools que usa un agente, y un agente puede configurarle las alertas.

[In English](#in-english) · [Docs del MCP](https://pricto.dev/docs/mcp) · [Cobertura](https://pricto.dev/cobertura) · [Crear cuenta gratis](https://pricto.dev/registro)

![El bot encuentra un producto y avisa dos bajas de precio](docs/terminal-es.png)

## Pruébalo en un minuto

Requiere Node 22 o superior. No necesitas cuenta: sin `PRICTO_API_KEY` se conecta a la sandbox pública de Pricto por MCP (`/mcp/sandbox`, sin login), que responde con datos de ejemplo.

```bash
git clone https://github.com/Pricto/alertas-de-precios-chile && cd alertas-de-precios-chile
npm install
npm start                             # revisa alerts.json
npm start -- find "protector solar"   # busca el product_id para una alerta
```

## Las alertas

`alerts.json` es una lista. Cada alerta dice qué producto vigilar y bajo qué precio avisar:

```json
[
  { "product": "prd_0xnive", "below": 13000 },
  { "product": "prd_0gnesc", "below": 5500, "retailers": ["cl-jumbo", "cl-unimarc"] }
]
```

| Campo | Qué es |
|---|---|
| `product` | `product_id` (de `find` o de la tool `search_products`) o código de barras |
| `below` | Avisa cuando el precio queda bajo este monto, en moneda local (CLP sin decimales) |
| `retailers` | Opcional: solo estas tiendas |

El bot avisa una vez, el día en que el precio cruza el umbral: compara el precio de hoy con el del día anterior (`get_prices` con `as_of`), así que no guarda estado y no repite el aviso mientras el precio siga abajo. `npm start -- --all` avisa todas las tiendas que están bajo el umbral hoy, y `--dry-run` muestra lo que avisaría sin mandar nada.

## Qué tiendas vigila

Las que la API de Pricto captura a diario ([lista completa y estado de cada una](https://pricto.dev/cobertura), registro de fuentes al 24-10-2026):

- Supermercados: Jumbo, Santa Isabel, Unimarc, Alvi, Mayorista Nacional, Supermercado La Herradura, Supermercados José González, Alimentika, Compras Aqui y Distribuidora Fermarket.
- Farmacias: Cruz Verde, Farmacias Ahumada, Farmacias del Dr. Simi, Farmacias Knop, Farmacias Novasalud, EcoFarmacias, Farmacia Meki, Farmaloop, Farmazon y Cofar.
- Y más de 100 tiendas de tecnología, hogar, departamento, mascotas, deportes y otras categorías.

No cubre Líder, Tottus, Superbodega aCuenta, Salcobrand ni Preunic: bloquean a los robots que se identifican o sus términos no lo permiten. La sandbox trae datos inventados de Jumbo, Santa Isabel, Unimarc, Cruz Verde, Farmacias Ahumada, Dr. Simi y Knop; los precios reales se ven con una [cuenta gratis](https://pricto.dev/registro).

## Dónde llegan los avisos

| Variable | Qué hace |
|---|---|
| `NTFY_TOPIC` | Publica en `ntfy.sh/<tema>`. Instala la app de ntfy (o abre `https://ntfy.sh/<tema>`) y suscríbete al mismo tema. No hay cuenta: el nombre del tema funciona como contraseña, así que elige uno difícil de adivinar. `NTFY_URL` cambia el servidor si tienes uno propio. |
| `WEBHOOK_URL` | Hace `POST` con JSON: `text` y `content` traen el mensaje (los campos que leen los webhooks entrantes de Slack y de Discord) y `alerts`, el detalle de cada aviso. |
| `PRICTO_API_KEY` | Tu API key ([crear cuenta gratis](https://pricto.dev/registro)). Sin ella, la sandbox. |
| `PRICTO_API_URL` | Otra instancia de la API (por omisión `https://pricto.dev`) |
| `LANG` | `es_CL.UTF-8` para mensajes y nombres en español; si no, en inglés. |

Sin `NTFY_TOPIC` ni `WEBHOOK_URL`, el aviso sale solo por la consola.

## Que corra todos los días

El repo trae [`.github/workflows/alerts.yml`](.github/workflows/alerts.yml): GitHub Actions lo corre una vez al día (13:00 UTC) y también a mano desde la pestaña Actions. En Settings → Secrets and variables → Actions agrega `NTFY_TOPIC` o `WEBHOOK_URL`, y `PRICTO_API_KEY` para datos reales. Para cambiar las alertas, edita `alerts.json` y haz commit.

## Con tu agente

El repo trae [`.mcp.json`](.mcp.json) con el servidor MCP de la sandbox y [`AGENTS.md`](AGENTS.md) con las instrucciones. Claude Code lee los dos al abrir el repo (te pide aprobar el servidor la primera vez); en Cursor o VS Code, agrega la misma URL en su configuración de MCP ([cómo, en cada cliente](https://pricto.dev/docs/mcp)). Después pídeselo en tus palabras. Preguntas y pedidos que funcionan con los datos de la sandbox:

- Avísame cuando el café Nescafé Tradición baje de $5.500 en Jumbo o en Unimarc.
- Agrega una alerta para el protector solar Nivea FPS 50 bajo $13.000 en cualquier tienda.
- ¿Cuál de mis alertas está hoy bajo el umbral?
- ¿En qué farmacia está más barato el paracetamol de 16 comprimidos y desde cuándo?

El agente busca el producto con `search_products`, revisa el precio de hoy con `get_prices`, te dice en qué tienda y a qué hora se observó, y agrega la alerta a `alerts.json`. Para usar datos reales, cambia la URL de `.mcp.json` por `https://pricto.dev/mcp` y agrega el header `Authorization: Bearer <tu key>`.

## Cómo funciona

```
src/mcp.ts      cliente MCP (SDK oficial): /mcp/sandbox sin key, /mcp con key; reintenta los 429
src/check.ts    get_prices hoy y el día anterior → tiendas que cruzaron el umbral
src/notify.ts   consola, ntfy y webhook
src/index.ts    la línea de comandos
```

El aviso usa `price`, lo que paga cualquier persona; el precio con tarjeta de la tienda (`card_price`) y las promociones por cantidad vienen aparte en la respuesta.

Cuánto cuesta con una key real: `get_prices` cobra 1 crédito por tienda, y la consulta del día anterior se hace solo para los productos que hoy están bajo el umbral. Repetir la misma consulta dentro de 24 horas es gratis. Planes en [pricto.dev/precios](https://pricto.dev/precios).

## Tests

La lógica se prueba con tools falsas y el bot completo, contra la sandbox pública por MCP:

```bash
npm test
npm run typecheck
```

`PRICTO_API_URL=http://localhost:8787 npm test` los corre contra una instancia local.

## Preguntas frecuentes

**¿Cómo me avisan cuando baja el precio de un producto en un supermercado de Chile?**
Agrega el producto y tu precio a `alerts.json` y deja que el workflow diario corra el bot: cuando el precio de Jumbo, Unimarc, Cruz Verde u otra tienda cubierta queda bajo tu umbral, te llega una notificación por ntfy o webhook.

**¿Hay un MCP de supermercados de Chile para Claude o ChatGPT?**
Sí: el servidor MCP de [Pricto](https://pricto.dev/docs/mcp). La sandbox, en `https://pricto.dev/mcp/sandbox`, no pide login y funciona con Claude, ChatGPT, Cursor y VS Code; para datos reales, `https://pricto.dev/mcp` con tu key.

**¿Necesito una cuenta de Telegram, Slack o email?**
No. ntfy no pide cuenta. Si ya usas Slack o Discord, apunta `WEBHOOK_URL` a un webhook entrante.

**¿Vigila Líder y Tottus?**
No: bloquean a los robots que se identifican. Si una cadena entrega un feed o un permiso, entra a la cobertura ([pricto.dev/cobertura](https://pricto.dev/cobertura)).

**¿Los precios de la sandbox son reales?**
No: son datos de ejemplo. Con una cuenta gratis (100 créditos al mes, sin tarjeta) la API responde con los precios reales.

**¿Me avisa todos los días mientras el precio siga bajo?**
No: solo el día del cruce. Para ver todo lo que está bajo el umbral hoy, `npm start -- --all`.

## In English

Get notified when a product at Jumbo, Unimarc, Santa Isabel, Cruz Verde or another Chilean store drops below your price, by console, [ntfy](https://ntfy.sh) push (no account) or webhook. It talks to the [Pricto](https://pricto.dev) price API over MCP and runs daily on GitHub Actions; an agent can set up the alerts for you.

```bash
git clone https://github.com/Pricto/alertas-de-precios-chile && cd alertas-de-precios-chile
npm install && npm start
```

Full documentation in English: [README.en.md](README.en.md). MCP docs at [pricto.dev/docs/mcp](https://pricto.dev/docs/mcp).

## Licencia

[MIT](LICENSE).
