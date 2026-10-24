# Instrucciones para agentes

Este repo avisa cuando un producto baja de un precio. Las alertas están en `alerts.json`:

```json
[{ "product": "prd_01colu", "below": 1100, "retailers": ["cl-jumbo"] }]
```

- `product`: el `product_id` que devuelve la tool `search_products`, o un código de barras.
- `below`: el aviso sale cuando el precio queda bajo este monto, en la moneda local (CLP sin decimales).
- `retailers` (opcional): IDs de tienda; sin él, todas.

El servidor MCP `pricto` (en `.mcp.json`, la sandbox de Pricto sin login) trae las tools. Cuando la persona pida una alerta:

1. Busca el producto con `search_products` y confirma con ella cuál es si hay más de uno parecido.
2. Mira el precio de hoy con `get_prices` y dile en qué tienda y a qué hora se observó. Si el umbral ya está sobre el precio actual, avísale que la alerta saldría de inmediato.
3. Agrega la alerta a `alerts.json` sin borrar las que ya existen.
4. Para probar: `npm start -- --all --dry-run`.

`price` es lo que paga cualquiera; `card_price` exige la tarjeta de la tienda y las promociones piden una cantidad mínima. Las alertas usan `price`. En la sandbox los precios, códigos de barras y URLs son inventados: díselo a la persona.
