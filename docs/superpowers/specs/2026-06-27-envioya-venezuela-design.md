# EnvíoYA Venezuela — Design Spec

**Date:** 2026-06-27
**Status:** Approved for planning
**Context:** Built for the Build4Venezuela humanitarian hackathon (Jun 26–28, 2026), responding to the Mw 7.2 + 7.5 earthquakes near Caracas/La Guaira on June 24, 2026.

## Problem

Families abroad need to send money to relatives in Venezuela **fast** after the
earthquake. Physical bank branches may be damaged or inaccessible, so the
reliable channel is **Pago Móvil** — instant, phone-based bolívar transfers.

The hard question for a sender is: *"From my country and currency, what is the
route that delivers the most bolívares, fastest, with the fewest requirements
for my relative?"* Nobody answers this with live data — except us. Saldoar's API
exposes live best rates, fees, settlement times, and receiver requirements for
routes landing on Pago Móvil from ~13 source corridors. That live, proprietary
data is our unfair advantage and the entire reason this product exists.

## Goal

A lightweight server-rendered web page where a sender picks **origin
country/currency + amount** and instantly sees the ranked routes to deliver
bolívares via Pago Móvil, each showing how much arrives, how long it takes, and
what the receiver needs. Shareable by WhatsApp with the result baked into the URL.

## Non-Goals (YAGNI)

- No login, accounts, or saved recipients.
- No multi-language (UI is Spanish only — the audience is Venezuelan/LatAm senders).
- No comparison against external providers (Western Union, Binance P2P, etc.) —
  we do not have verified data for them and faking it would be dishonest.
- No transactional execution — we inform and link out to Saldoar to operate.

## Data Source

Saldoar JSON:API at `https://api.saldo.com.ar/v3/`. Requires a `User-Agent`
header (urllib without UA → 403; use a proper UA). JSON:API params: `include`,
`fields[type]`, `filter[x]`, `sort`, `page[number]`/`page[size]`.

Endpoints used:

| Endpoint | Used for |
|---|---|
| `GET /v3/best_rates` | Best price per pair `currencyX → VES` via `system2=pago_movil` |
| `GET /v3/systems` | Per-method fees (`fixed_fee_*`, `percent_fee_*`), receiver requirements (`account_required`, `bank_required`, `identification_number_required`), `minimum_amount_*`, `maximum_amount_*` |
| `GET /v3/systems/{id}/system_information` | `time_average` (settlement time) per method |
| `GET /v3/currencies` | Currency list / labels |

Confirmed source corridors landing on Pago Móvil (VES): USD (zinli), USDT, USDC,
EUR (banco_eur), COP (bre-b), CLP (transfer-chile), PEN (yape-plin), BRL (pix),
BOB (banco_bol), MXN (banco_mex), BTC, DAI, ARS (banco). All 13 ship day one.

## Architecture

Astro SSR. The form is a GET form, so the result lives in the URL
(`/?from=USD&amount=100&sort=amount`) → shareable by WhatsApp, indexable, near-zero JS.

Units, each with one responsibility:

- **`src/lib/saldoar.ts`** — the only module that talks to the Saldoar API.
  Fetches `best_rates`, `systems`, `system_information`. In-memory cache with a
  ~10 min TTL; on API failure serves the last good cache (stale-on-error). Never
  exposes the API to the client; never hammers it.
- **`src/lib/routes.ts`** — the engine. Pure function: given `(origin, amount, sort)`
  and the cached dataset, returns the ranked list of routes to Pago Móvil.
  Computes net arrival, time, and requirements. No network → fully unit-testable.
- **`src/pages/index.astro`** — home. GET form (origin select + amount input).
  When query params are present, renders results server-side.
- **Presentation components** (`RouteCard`, `ResultList`, `OriginSelect`) — dumb,
  display only.

### Data flow

1. Request `/?from=USD&amount=100&sort=amount`.
2. Server calls `getDataset()` (cache hit, or fetch from Saldoar + cache).
3. `routes.ts` filters pairs where `currency2 = VES` and `system2 = pago_movil`
   and `currency1 = from`.
4. For each route: compute net arrival, attach `time_average` and receiver
   requirements.
5. Sort by `sort` (`amount` default, `speed` optional).
6. Render SSR. Sort toggle is a query param (`sort=speed`), not JS.

### Calculation model (the delicate part)

- Gross bolívares = `best_rate.price × amount`.
- Subtract known fees from `systems` (`fixed_fee_*`, `percent_fee_*`).
- Labelled **"estimado"** with a visible breakdown — we never promise an exact
  figure we don't control. Final number is confirmed by Saldoar at operation time.
- Edge cases: amount below `minimum_amount_send` → show the minimum; above
  `maximum_amount_send` → show the cap; origin with no route → "probá USD/USDT".

### Error handling

- API down + cache present → serve cache with a visible "datos de hace X min".
- API down + no cache → clear message + direct link to Saldoar.
- Data freshness timestamp is always visible — in a disaster, that is trust.

## Testing (TDD)

- Capture real API responses as **fixtures**; unit-test `routes.ts` against them:
  net calculation, ranking by amount and by speed, minimum/maximum handling,
  no-route origin, API-down (stale cache) path.
- No flaky network tests — the engine is pure and the client is mockable.

## Deployment

Cloudflare Pages or Vercel (decided at implementation; both deploy instantly).

## UI copy language

All user-facing copy is **Spanish** (Venezuelan/LatAm audience). This spec and all
code identifiers/comments are English.
