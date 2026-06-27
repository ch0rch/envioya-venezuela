# EnvíoYA Venezuela

Built for the Build4Venezuela hackathon. Given an origin currency and amount,
shows the routes that deliver the most bolívares to a relative in Venezuela via
Pago Móvil, using Saldoar's live rate data.

## Dev
- `npm install`
- `npm run dev` → http://localhost:4321
- `npm test`

## Data
Live data from the Saldoar JSON:API (`api.saldo.com.ar/v3`), cached server-side
for 10 minutes with stale-on-error fallback. Figures are estimates; the final
amount is confirmed by Saldoar at operation time.
