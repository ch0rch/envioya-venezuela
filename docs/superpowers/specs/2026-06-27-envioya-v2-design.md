# EnvíoYA Venezuela v2 — Branding, Method Selector & Saldoar Deep-Link

**Date:** 2026-06-27
**Status:** Approved for planning
**Builds on:** `2026-06-27-envioya-venezuela-design.md` (v1). This is a delta — v1's data layer, route engine, API client, and SSR page stay as-is.

## Goal

Make EnvíoYA feel like a trustworthy Saldoar product and close the loop to action:
1. Apply Saldoar's real brand (palette, fonts, logo) instead of the placeholder teal.
2. Show each payment method's real logo (served remotely by Saldoar).
3. Let the sender switch to "the method they already use" via an enriched visual selector — without dishonest cross-currency amount comparisons.
4. Hand off to Saldoar with a ready-to-use deep-link that carries the amount.

## Honesty constraints (carried from v1, non-negotiable)
- Amounts stay labelled "estimado"; never promise an exact figure.
- The "otras formas" panel is a **method selector, NOT an amount comparator**. We never place amounts in different currencies side by side as if comparable. Switching method recalculates in that method's own currency.
- Destination (receiver's Pago Móvil phone) cannot be pre-filled by URL — it is collected inside Saldoar. Do not imply otherwise.

## Piece 1 — Saldoar branding

Replace the placeholder palette/fonts added in v1's styling commit.

**Palette (CSS custom properties, from Saldoar `_tokens.colors.scss`):**
| Role | Value |
|---|---|
| Brand text | `#006e53` |
| Primary button bg / accent | `#4cdfb0` |
| Primary button hover | `#14cd92` |
| Success (hero amount) | `#007808` |
| Warning | `#876500` |
| Alert | `#d7000b` |
| Page bg | `#f9f9f9` |
| Text primary | `#2b2b2b` |
| Text secondary | `#535353` |
| Divider | `#e9e9e9` |

**Fonts:** Outfit (headings) + Roboto Flex (body), variable woff2. Copy from the Saldoar repo to `public/fonts/`:
- `saldoar/repo/apps/solido-app/src/assets/fonts/outfit/Outfit-VariableFont.woff2`
- `saldoar/repo/apps/solido-app/src/assets/fonts/roboto-flex/RobotoFlex-VariableFont.woff2`
Declare with `@font-face` (`font-display: swap`); `--font-headline: 'Outfit'`, `--font-body: 'Roboto Flex'`.

**Logo:** copy `saldoar/repo/apps/solido-app/src/assets/logo-saldo-color.svg` to `public/` and place it in the page header.

## Piece 2 — Method logos (`SystemLogo` component)

A presentational Astro component that renders Saldoar's remote logo for a system id.

- Props: `systemId: string`, `alt: string`, optional `size = 'small'`.
- Markup:
  ```astro
  <picture>
    <source srcset={`https://api.saldo.com.ar/img/sistemas2/${systemId}-saldo.${size}.webp`} type="image/webp" />
    <img src={`https://api.saldo.com.ar/img/sistemas2/${systemId}-saldo.${size}.png`} alt={alt} loading="lazy" width="32" height="32" />
  </picture>
  ```
- Used in `RouteCard` (next to the system name) and in the new method selector.
- These `<img>` load from `api.saldo.com.ar` in the browser. That is acceptable: they are public image assets, not the data API, so it does not break the "data API is server-only" rule. Add `width`/`height` to avoid layout shift; `loading="lazy"` for the selector grid.

## Piece 3 — "Otras formas de mandar" selector

Below the highlighted result, a grid of the OTHER available origin currencies/methods.

- Source: `availableCorridors(dataset)` minus the currently selected `from`.
- Each item is a **GET link** to `/?from={currency}&amount={amount}` — keeps the current `amount`, swaps `from`, recalculates server-side. No JS.
- Each item shows the method `SystemLogo` + the corridor label (e.g. "🇪🇸 Euro (EUR) — España"). The logo's `systemId` is the `system1` of that corridor's route (e.g. EUR → `banco_eur`), so the dataset must expose `system1` per corridor (see Data note).
- Heading copy: "¿Mandás con otra cosa?" / subtitle "Elegí el método que ya usás." Honest framing — it offers a switch, it does not rank amounts.
- New component `MethodSwitcher.astro`; rendered only when there is at least one other corridor.

**Data note:** `availableCorridors` currently returns `{ currency, label, flag }`. It must also expose the `system1` id for that corridor so the selector can show the right logo. Extend `Corridor` with `systemId: string` (the `system1` of that currency's pago_movil route) and populate it in `availableCorridors` from the dataset. The amount carried in the link is the raw current `amount` (same number, new currency — the user adjusts if needed; we do NOT convert).

## Piece 4 — Saldoar deep-link (amount-carrying)

On the highlighted `RouteCard`, a primary CTA: **"Iniciá el envío en Saldoar →"**.

- Target route (carries the amount): `/{locale}/a/{system1}/{system2}/{amount1}/{amount2}`, locale `es-VE`.
- Confirmed building blocks (from repo recon): the `/a/...` route is public, no auth to view, and accepts amount path segments; `/cobrar/{s1}-a-{s2}` is the no-amount fallback.
- **Open risk to resolve in implementation:** the exact assignment of `system1`/`system2` and which of `amount1`/`amount2` is the send vs receive side is NOT certain from static reading (the repo example was `/es-VE/a/pago_movil/palpal/0/100`). Resolution: during implementation, verify empirically by loading candidate URLs against saldo.com.ar and observing which field/side gets pre-filled. A `buildSaldoarLink(systemId, amount)` helper isolates this so the format lives in one tested place.
- **Fallback:** if the `/a/` amount semantics cannot be determined with confidence, `buildSaldoarLink` falls back to `/{locale}/cobrar/{systemId}-a-pago_movil` (par pre-selected, no amount). The CTA still works; the user re-enters the amount in Saldoar.
- The link opens in a new tab (`target="_blank" rel="noopener"`).
- Below the CTA, a one-line honest note: the receiver's Pago Móvil phone is entered inside Saldoar.

## Non-goals (YAGNI)
- No cross-currency amount comparison / normalization (explicitly rejected for honesty).
- No pre-filling the receiver account.
- No auth/login integration — we link out; Saldoar handles the account.
- No new endpoints; the data layer is unchanged except the `Corridor.systemId` addition.

## Architecture impact (delta only)
- `src/lib/corridors.ts` — extend `Corridor` with `systemId`; populate from dataset. (unit-tested)
- `src/lib/saldoar-link.ts` — new pure `buildSaldoarLink(systemId, amount)` with the `/a/` format + `/cobrar/` fallback. (unit-tested)
- `src/components/SystemLogo.astro` — new presentational component.
- `src/components/MethodSwitcher.astro` — new; the "otras formas" grid.
- `src/components/RouteCard.astro` — add `SystemLogo` + the Saldoar CTA.
- `src/pages/index.astro` — render `MethodSwitcher`; apply branding; header logo.
- Styling: replace the placeholder palette/fonts with the Saldoar tokens (global `<style>`).
- `public/fonts/`, `public/logo-saldo-color.svg` — copied assets.

## Testing
- `corridors.ts`: assert each corridor now carries the correct `systemId` (e.g. USD → `zinli`, EUR → `banco_eur`), against real fixtures.
- `saldoar-link.ts`: unit-test the URL format for a known system+amount, and the `/cobrar/` fallback path.
- Components (Astro): verified via the running dev server (logos load, selector links carry `amount`, CTA href is correct) — visual confirmation is the user's.
- The `/a/` amount-semantics verification is an implementation step with a documented fallback, not a unit test.

## UI copy language
All user-facing copy Spanish; identifiers/comments English.
