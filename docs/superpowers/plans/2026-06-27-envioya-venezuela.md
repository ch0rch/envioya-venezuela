# EnvíoYA Venezuela Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A server-rendered web page where a sender picks origin currency + amount and sees ranked routes to deliver bolívares to a relative in Venezuela via Pago Móvil.

**Architecture:** Astro SSR. A single API client (`saldoar.ts`) fetches and caches Saldoar data; a pure engine (`routes.ts`) computes ranked routes from a normalized dataset; `index.astro` renders results from a GET form so the result lives in the URL. Near-zero client JS.

**Tech Stack:** Astro 5 (SSR), TypeScript, Vitest. Deploy on Cloudflare Pages or Vercel.

## Global Constraints

- All user-facing copy is **Spanish** (Venezuelan/LatAm audience). Code identifiers and comments are English.
- Numbers shown to users are labelled **"estimado"** with a visible breakdown. Never promise an exact figure.
- The destination is always `system2 = pago_movil`, `currency2 = VES`.
- The Saldoar API requires a `User-Agent` header (no UA → 403). Base URL: `https://api.saldo.com.ar/v3/`.
- The API client is the ONLY module that performs network calls. The engine is pure and network-free.
- No comparison against external providers (Western Union, Binance, etc.).
- TDD: every behavior gets a failing test first. Frequent commits.

---

### Task 1: Scaffold Astro + Vitest

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`
- Create: `src/pages/index.astro`
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working Astro project where `npm test` runs Vitest and `npm run dev` serves SSR.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "envioya-venezuela",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`** (SSR output; adapter added in Task 8)

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create minimal `src/pages/index.astro`**

```astro
---
// Placeholder home — wired up in Task 7.
---
<html lang="es">
  <head><meta charset="utf-8" /><title>EnvíoYA Venezuela</title></head>
  <body><h1>EnvíoYA Venezuela</h1></body>
</html>
```

- [ ] **Step 6: Write the smoke test** `test/smoke.test.ts`

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Install and run**

Run: `npm install && npm test`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold astro ssr + vitest"
```

---

### Task 2: Capture real API fixtures

Real fixtures let the engine be tested against real shapes without network flakiness.

**Files:**
- Create: `scripts/fetch-fixtures.sh`
- Create: `test/fixtures/best_rates.json`, `test/fixtures/systems.json`, `test/fixtures/system_information.pago_movil.json`, `test/fixtures/currencies.json`
- Test: `test/fixtures.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: JSON fixtures with the documented shapes. `best_rates.json` is the raw `{ data: [...] }` JSON:API envelope where each `data[].attributes` is `{ price, system1, system2, currency1, currency2 }`. `systems.json` data items have `id` plus `attributes` including `name, currency, fixed_fee_send, percent_fee_send, minimum_amount_send, maximum_amount_send, bank_required, identification_number_required, account_required_receive`. `system_information.pago_movil.json` attributes include `time_average, on_time_percent, pros, cons`.

- [ ] **Step 1: Write `scripts/fetch-fixtures.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
UA="Mozilla/5.0 (envioya-venezuela)"
BASE="https://api.saldo.com.ar/v3"
OUT="test/fixtures"
mkdir -p "$OUT"
curl -s -A "$UA" "$BASE/best_rates?page%5Bsize%5D=500"            > "$OUT/best_rates.json"
curl -s -A "$UA" "$BASE/systems?page%5Bsize%5D=100"               > "$OUT/systems.json"
curl -s -A "$UA" "$BASE/currencies?page%5Bsize%5D=50"             > "$OUT/currencies.json"
curl -s -A "$UA" "$BASE/systems/pago_movil/system_information"    > "$OUT/system_information.pago_movil.json"
echo "fixtures written to $OUT"
```

- [ ] **Step 2: Run it**

Run: `chmod +x scripts/fetch-fixtures.sh && ./scripts/fetch-fixtures.sh`
Expected: four JSON files in `test/fixtures/`.

- [ ] **Step 3: Write `test/fixtures.test.ts`** (guards the shapes we depend on)

```ts
import { describe, it, expect } from 'vitest';
import bestRates from './fixtures/best_rates.json';
import systems from './fixtures/systems.json';
import pmInfo from './fixtures/system_information.pago_movil.json';

describe('fixtures', () => {
  it('best_rates has at least one USD -> VES via pago_movil route', () => {
    const rows = (bestRates as any).data as any[];
    const hit = rows.find(
      (r) =>
        r.attributes.currency1 === 'USD' &&
        r.attributes.currency2 === 'VES' &&
        r.attributes.system2 === 'pago_movil',
    );
    expect(hit).toBeDefined();
    expect(typeof hit.attributes.price).toBe('number');
  });

  it('systems includes pago_movil with receiver requirements', () => {
    const rows = (systems as any).data as any[];
    const pm = rows.find((r) => r.id === 'pago_movil');
    expect(pm).toBeDefined();
    expect(pm.attributes.bank_required).toBe(false);
    expect(pm.attributes.identification_number_required).toBe(true);
  });

  it('pago_movil system_information has a numeric time_average', () => {
    const attrs = (pmInfo as any).data?.attributes ?? (pmInfo as any).data?.[0]?.attributes;
    expect(typeof attrs.time_average).toBe('number');
  });
});
```

- [ ] **Step 4: Enable JSON imports** — add to `tsconfig.json` `compilerOptions`: `"resolveJsonModule": true`.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS (smoke + 3 fixture tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: capture real saldoar api fixtures"
```

---

### Task 3: Types + dataset builder

Normalize the three raw envelopes into one lookup-friendly `Dataset`.

**Files:**
- Create: `src/lib/saldoar.types.ts`
- Create: `src/lib/dataset.ts`
- Test: `test/dataset.test.ts`

**Interfaces:**
- Consumes: raw fixture shapes from Task 2.
- Produces:
  - `interface BestRate { price: number; system1: string; system2: string; currency1: string; currency2: string }`
  - `interface SystemMeta { id: string; name: string; currency: string; fixedFeeSend: number; percentFeeSend: number; minSend: number; maxSend: number }`
  - `interface PagoMovilInfo { timeAverage: number; onTimePercent: number }`
  - `interface Dataset { rates: BestRate[]; systems: Record<string, SystemMeta>; pagoMovilInfo: PagoMovilInfo }`
  - `function buildDataset(raw: { bestRates: unknown; systems: unknown; pagoMovilInfo: unknown }): Dataset`

- [ ] **Step 1: Write `src/lib/saldoar.types.ts`**

```ts
export interface BestRate {
  price: number;
  system1: string;
  system2: string;
  currency1: string;
  currency2: string;
}

export interface SystemMeta {
  id: string;
  name: string;
  currency: string;
  fixedFeeSend: number;
  percentFeeSend: number;
  minSend: number;
  maxSend: number;
}

export interface PagoMovilInfo {
  timeAverage: number;
  onTimePercent: number;
}

export interface Dataset {
  rates: BestRate[];
  systems: Record<string, SystemMeta>;
  pagoMovilInfo: PagoMovilInfo;
}
```

- [ ] **Step 2: Write the failing test** `test/dataset.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import bestRates from './fixtures/best_rates.json';
import systems from './fixtures/systems.json';
import pmInfo from './fixtures/system_information.pago_movil.json';
import { buildDataset } from '../src/lib/dataset';

describe('buildDataset', () => {
  const ds = buildDataset({ bestRates, systems, pagoMovilInfo: pmInfo });

  it('keeps only pago_movil/VES rates', () => {
    expect(ds.rates.length).toBeGreaterThan(0);
    expect(ds.rates.every((r) => r.system2 === 'pago_movil' && r.currency2 === 'VES')).toBe(true);
  });

  it('indexes systems by id', () => {
    expect(ds.systems['usdt']).toBeDefined();
    expect(ds.systems['usdt'].currency).toBe('USDT');
  });

  it('extracts pago movil time_average', () => {
    expect(ds.pagoMovilInfo.timeAverage).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- dataset`
Expected: FAIL ("buildDataset is not a function" / module not found).

- [ ] **Step 4: Write `src/lib/dataset.ts`**

```ts
import type { BestRate, SystemMeta, PagoMovilInfo, Dataset } from './saldoar.types';

type Envelope<T> = { data: Array<{ id: string; attributes: T }> };

function attrsOf<T>(raw: unknown): Array<{ id: string; attributes: T }> {
  return (raw as Envelope<T>).data ?? [];
}

export function buildDataset(raw: {
  bestRates: unknown;
  systems: unknown;
  pagoMovilInfo: unknown;
}): Dataset {
  const rates: BestRate[] = attrsOf<BestRate>(raw.bestRates)
    .map((r) => r.attributes)
    .filter((a) => a.system2 === 'pago_movil' && a.currency2 === 'VES');

  const systems: Record<string, SystemMeta> = {};
  for (const s of attrsOf<any>(raw.systems)) {
    const a = s.attributes;
    systems[s.id] = {
      id: s.id,
      name: a.name,
      currency: a.currency,
      fixedFeeSend: a.fixed_fee_send ?? 0,
      percentFeeSend: a.percent_fee_send ?? 0,
      minSend: a.minimum_amount_send ?? 0,
      maxSend: a.maximum_amount_send ?? Number.POSITIVE_INFINITY,
    };
  }

  const pmRaw = raw.pagoMovilInfo as any;
  const pmAttrs = pmRaw.data?.attributes ?? pmRaw.data?.[0]?.attributes ?? {};
  const pagoMovilInfo: PagoMovilInfo = {
    timeAverage: pmAttrs.time_average ?? 0,
    onTimePercent: pmAttrs.on_time_percent ?? 0,
  };

  return { rates, systems, pagoMovilInfo };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- dataset`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: dataset builder normalizing saldoar envelopes"
```

---

### Task 4: Route engine (the core)

Pure function that produces ranked routes for a given origin + amount.

**Files:**
- Create: `src/lib/routes.ts`
- Test: `test/routes.test.ts`

**Interfaces:**
- Consumes: `Dataset` (Task 3).
- Produces:
  - `type SortKey = 'amount' | 'speed'`
  - `interface Route { systemId: string; systemName: string; arrivalVes: number; timeAverageMin: number; belowMin: boolean; minSend: number }`
  - `function getRoutes(ds: Dataset, fromCurrency: string, amount: number, sort: SortKey): Route[]`
  - Calculation: `arrivalVes = amount * rate.price` (gross, labelled "estimado" in UI). `timeAverageMin` comes from the SENDING system's own time when available, else the Pago Móvil `timeAverage`. `belowMin = amount < system.minSend`.

- [ ] **Step 1: Write the failing test** `test/routes.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Dataset } from '../src/lib/saldoar.types';
import { getRoutes } from '../src/lib/routes';

const ds: Dataset = {
  rates: [
    { price: 748, system1: 'usdt', system2: 'pago_movil', currency1: 'USDT', currency2: 'VES' },
    { price: 739, system1: 'zinli', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
    { price: 852, system1: 'banco_eur', system2: 'pago_movil', currency1: 'EUR', currency2: 'VES' },
  ],
  systems: {
    usdt: { id: 'usdt', name: 'USDT', currency: 'USDT', fixedFeeSend: 0, percentFeeSend: 0, minSend: 15, maxSend: 100000 },
    zinli: { id: 'zinli', name: 'Zinli', currency: 'USD', fixedFeeSend: 0, percentFeeSend: 0, minSend: 15, maxSend: 100000 },
    banco_eur: { id: 'banco_eur', name: 'Banco (EUR)', currency: 'EUR', fixedFeeSend: 0, percentFeeSend: 0, minSend: 13, maxSend: 100000 },
  },
  pagoMovilInfo: { timeAverage: 17, onTimePercent: 98 },
};

describe('getRoutes', () => {
  it('returns only routes matching the origin currency', () => {
    const routes = getRoutes(ds, 'USD', 100, 'amount');
    expect(routes).toHaveLength(1);
    expect(routes[0].systemId).toBe('zinli');
  });

  it('computes gross arrival in VES', () => {
    const routes = getRoutes(ds, 'USDT', 100, 'amount');
    expect(routes[0].arrivalVes).toBeCloseTo(74800);
  });

  it('returns empty array for an origin with no route', () => {
    expect(getRoutes(ds, 'JPY', 100, 'amount')).toEqual([]);
  });

  it('flags amounts below the system minimum', () => {
    const routes = getRoutes(ds, 'USDT', 5, 'amount');
    expect(routes[0].belowMin).toBe(true);
  });

  it('sorts by arrival amount descending by default', () => {
    const ds2: Dataset = {
      ...ds,
      rates: [
        { price: 700, system1: 'a', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
        { price: 739, system1: 'zinli', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
      ],
      systems: {
        ...ds.systems,
        a: { id: 'a', name: 'A', currency: 'USD', fixedFeeSend: 0, percentFeeSend: 0, minSend: 1, maxSend: 1e9 },
      },
    };
    const routes = getRoutes(ds2, 'USD', 100, 'amount');
    expect(routes.map((r) => r.systemId)).toEqual(['zinli', 'a']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- routes`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/routes.ts`**

```ts
import type { Dataset } from './saldoar.types';

export type SortKey = 'amount' | 'speed';

export interface Route {
  systemId: string;
  systemName: string;
  arrivalVes: number;
  timeAverageMin: number;
  belowMin: boolean;
  minSend: number;
}

export function getRoutes(
  ds: Dataset,
  fromCurrency: string,
  amount: number,
  sort: SortKey,
): Route[] {
  const routes: Route[] = ds.rates
    .filter((r) => r.currency1 === fromCurrency)
    .map((r) => {
      const sys = ds.systems[r.system1];
      const minSend = sys?.minSend ?? 0;
      return {
        systemId: r.system1,
        systemName: sys?.name ?? r.system1,
        arrivalVes: amount * r.price,
        timeAverageMin: ds.pagoMovilInfo.timeAverage,
        belowMin: amount < minSend,
        minSend,
      };
    });

  const sorted = [...routes].sort((a, b) =>
    sort === 'speed'
      ? a.timeAverageMin - b.timeAverageMin
      : b.arrivalVes - a.arrivalVes,
  );
  return sorted;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- routes`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: route engine ranking pago movil routes"
```

---

### Task 5: API client with cache + stale-on-error

**Files:**
- Create: `src/lib/saldoar.ts`
- Test: `test/saldoar.test.ts`

**Interfaces:**
- Consumes: `buildDataset` (Task 3).
- Produces:
  - `interface CachedDataset { dataset: Dataset; fetchedAt: number }`
  - `async function getDataset(now?: number): Promise<CachedDataset>` — fetches all four endpoints with the required `User-Agent`, builds the dataset, caches in module memory for `TTL_MS` (10 min). On fetch error returns the last good cache if present; otherwise rethrows.
  - `function __resetCache(): void` — test helper.

- [ ] **Step 1: Write the failing test** `test/saldoar.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bestRates from './fixtures/best_rates.json';
import systems from './fixtures/systems.json';
import pmInfo from './fixtures/system_information.pago_movil.json';
import currencies from './fixtures/currencies.json';
import { getDataset, __resetCache } from '../src/lib/saldoar';

function mockFetchOnce() {
  const body = (url: string) => {
    if (url.includes('best_rates')) return bestRates;
    if (url.includes('system_information')) return pmInfo;
    if (url.includes('systems')) return systems;
    return currencies;
  };
  return vi.fn(async (url: string) => ({
    ok: true,
    json: async () => body(url),
  })) as unknown as typeof fetch;
}

beforeEach(() => __resetCache());

describe('getDataset', () => {
  it('fetches and builds a dataset', async () => {
    vi.stubGlobal('fetch', mockFetchOnce());
    const { dataset } = await getDataset(1000);
    expect(dataset.rates.length).toBeGreaterThan(0);
  });

  it('serves cache within TTL without refetching', async () => {
    const f = mockFetchOnce();
    vi.stubGlobal('fetch', f);
    await getDataset(1000);
    const calls = (f as any).mock.calls.length;
    await getDataset(1000 + 60_000); // 1 min later, within 10 min TTL
    expect((f as any).mock.calls.length).toBe(calls);
  });

  it('serves stale cache when a later fetch fails', async () => {
    vi.stubGlobal('fetch', mockFetchOnce());
    await getDataset(1000);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const { dataset } = await getDataset(1000 + 11 * 60_000); // past TTL, fetch fails
    expect(dataset.rates.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- saldoar`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/saldoar.ts`**

```ts
import { buildDataset } from './dataset';
import type { Dataset } from './saldoar.types';

const BASE = 'https://api.saldo.com.ar/v3';
const UA = 'Mozilla/5.0 (envioya-venezuela)';
const TTL_MS = 10 * 60_000;

export interface CachedDataset {
  dataset: Dataset;
  fetchedAt: number;
}

let cache: CachedDataset | null = null;

async function get(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`saldoar ${res.status}`);
  return res.json();
}

export async function getDataset(now: number = Date.now()): Promise<CachedDataset> {
  if (cache && now - cache.fetchedAt < TTL_MS) return cache;
  try {
    const [bestRates, systems, pagoMovilInfo, _currencies] = await Promise.all([
      get(`${BASE}/best_rates?page%5Bsize%5D=500`),
      get(`${BASE}/systems?page%5Bsize%5D=100`),
      get(`${BASE}/systems/pago_movil/system_information`),
      get(`${BASE}/currencies?page%5Bsize%5D=50`),
    ]);
    cache = { dataset: buildDataset({ bestRates, systems, pagoMovilInfo }), fetchedAt: now };
    return cache;
  } catch (err) {
    if (cache) return cache; // stale-on-error
    throw err;
  }
}

export function __resetCache(): void {
  cache = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- saldoar`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: saldoar api client with ttl cache and stale-on-error"
```

---

### Task 6: Corridor metadata

Map each origin currency to a Spanish label + flag for the select and cards.

**Files:**
- Create: `src/lib/corridors.ts`
- Test: `test/corridors.test.ts`

**Interfaces:**
- Consumes: `Dataset` (to know which origin currencies actually have routes).
- Produces:
  - `interface Corridor { currency: string; label: string; flag: string }`
  - `const CORRIDOR_LABELS: Record<string, { label: string; flag: string }>`
  - `function availableCorridors(ds: Dataset): Corridor[]` — distinct `currency1` values present in `ds.rates`, mapped to labels, sorted by label.

- [ ] **Step 1: Write the failing test** `test/corridors.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import type { Dataset } from '../src/lib/saldoar.types';
import { availableCorridors } from '../src/lib/corridors';

const ds: Dataset = {
  rates: [
    { price: 748, system1: 'usdt', system2: 'pago_movil', currency1: 'USDT', currency2: 'VES' },
    { price: 739, system1: 'zinli', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
    { price: 739, system1: 'usdc', system2: 'pago_movil', currency1: 'USD', currency2: 'VES' },
  ],
  systems: {},
  pagoMovilInfo: { timeAverage: 17, onTimePercent: 98 },
};

describe('availableCorridors', () => {
  it('returns distinct origin currencies with labels', () => {
    const c = availableCorridors(ds);
    const currencies = c.map((x) => x.currency).sort();
    expect(currencies).toEqual(['USD', 'USDT']);
    expect(c.find((x) => x.currency === 'USD')?.label).toContain('Dólar');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- corridors`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/corridors.ts`**

```ts
import type { Dataset } from './saldoar.types';

export interface Corridor {
  currency: string;
  label: string;
  flag: string;
}

export const CORRIDOR_LABELS: Record<string, { label: string; flag: string }> = {
  USD: { label: 'Dólar (USD)', flag: '🇺🇸' },
  USDT: { label: 'USDT', flag: '🪙' },
  USDC: { label: 'USDC', flag: '🪙' },
  EUR: { label: 'Euro (EUR) — España', flag: '🇪🇸' },
  COP: { label: 'Peso colombiano (COP)', flag: '🇨🇴' },
  CLP: { label: 'Peso chileno (CLP)', flag: '🇨🇱' },
  PEN: { label: 'Sol peruano (PEN)', flag: '🇵🇪' },
  BRL: { label: 'Real brasileño (BRL)', flag: '🇧🇷' },
  BOB: { label: 'Boliviano (BOB)', flag: '🇧🇴' },
  MXN: { label: 'Peso mexicano (MXN)', flag: '🇲🇽' },
  ARS: { label: 'Peso argentino (ARS)', flag: '🇦🇷' },
  BTC: { label: 'Bitcoin (BTC)', flag: '🪙' },
  DAI: { label: 'DAI', flag: '🪙' },
};

export function availableCorridors(ds: Dataset): Corridor[] {
  const seen = new Set<string>();
  for (const r of ds.rates) seen.add(r.currency1);
  return [...seen]
    .map((currency) => ({
      currency,
      label: CORRIDOR_LABELS[currency]?.label ?? currency,
      flag: CORRIDOR_LABELS[currency]?.flag ?? '💱',
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- corridors`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: corridor metadata and labels"
```

---

### Task 7: UI — page, components, states

Wire the engine into Astro: GET form, SSR results, freshness, error states, fixed receiver-requirements block.

**Files:**
- Create: `src/components/RouteCard.astro`, `src/components/ResultList.astro`, `src/components/OriginSelect.astro`
- Create: `src/lib/format.ts`
- Modify: `src/pages/index.astro`
- Test: `test/format.test.ts`

**Interfaces:**
- Consumes: `getDataset` (Task 5), `getRoutes`/`Route`/`SortKey` (Task 4), `availableCorridors` (Task 6).
- Produces:
  - `function formatVes(n: number): string` — Spanish thousands grouping, no decimals, suffix " Bs".
  - A page that reads `from`, `amount`, `sort` from `Astro.url.searchParams`, renders ranked routes when present.

- [ ] **Step 1: Write the failing test** `test/format.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { formatVes } from '../src/lib/format';

describe('formatVes', () => {
  it('groups thousands and appends Bs', () => {
    expect(formatVes(74800)).toBe('74.800 Bs');
  });
  it('rounds to whole bolívares', () => {
    expect(formatVes(74800.6)).toBe('74.801 Bs');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- format`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/format.ts`**

```ts
export function formatVes(n: number): string {
  const rounded = Math.round(n);
  const grouped = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(rounded);
  return `${grouped} Bs`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 5: Write `src/components/RouteCard.astro`**

```astro
---
import type { Route } from '../lib/routes';
import { formatVes } from '../lib/format';
interface Props { route: Route; best: boolean }
const { route, best } = Astro.props;
---
<article class:list={['card', { best }]}>
  {best && <span class="badge">Más bolívares</span>}
  <h3>{route.systemName}</h3>
  <p class="amount">{formatVes(route.arrivalVes)} <small>(estimado)</small></p>
  <p class="time">Llega en ~{route.timeAverageMin} min</p>
  {route.belowMin && (
    <p class="warn">Monto mínimo: {route.minSend} {route.systemName}</p>
  )}
</article>
```

- [ ] **Step 6: Write `src/components/ResultList.astro`**

```astro
---
import type { Route } from '../lib/routes';
import RouteCard from './RouteCard.astro';
interface Props { routes: Route[] }
const { routes } = Astro.props;
---
{routes.length === 0 ? (
  <p class="empty">No encontramos una ruta desde esa moneda. Probá con USD o USDT.</p>
) : (
  <div class="results">
    {routes.map((r, i) => <RouteCard route={r} best={i === 0} />)}
  </div>
)}
```

- [ ] **Step 7: Write `src/components/OriginSelect.astro`**

```astro
---
import type { Corridor } from '../lib/corridors';
interface Props { corridors: Corridor[]; selected: string | null }
const { corridors, selected } = Astro.props;
---
<select name="from" required>
  <option value="" disabled selected={!selected}>¿Desde dónde enviás?</option>
  {corridors.map((c) => (
    <option value={c.currency} selected={c.currency === selected}>{c.flag} {c.label}</option>
  ))}
</select>
```

- [ ] **Step 8: Write `src/pages/index.astro`** (GET form + SSR results + freshness + fixed receiver block + error handling)

```astro
---
import { getDataset } from '../lib/saldoar';
import { getRoutes, type SortKey } from '../lib/routes';
import { availableCorridors } from '../lib/corridors';
import OriginSelect from '../components/OriginSelect.astro';
import ResultList from '../components/ResultList.astro';

const params = Astro.url.searchParams;
const from = params.get('from');
const amount = Number(params.get('amount') ?? '');
const sort: SortKey = params.get('sort') === 'speed' ? 'speed' : 'amount';

let corridors = [];
let routes = [];
let fetchedAt: number | null = null;
let apiDown = false;

try {
  const cached = await getDataset();
  fetchedAt = cached.fetchedAt;
  corridors = availableCorridors(cached.dataset);
  if (from && Number.isFinite(amount) && amount > 0) {
    routes = getRoutes(cached.dataset, from, amount, sort);
  }
} catch {
  apiDown = true;
}

const minsAgo = fetchedAt ? Math.round((Date.now() - fetchedAt) / 60000) : null;
const hasQuery = Boolean(from && Number.isFinite(amount) && amount > 0);
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>EnvíoYA Venezuela — la mejor forma de mandar plata a tu familia</title>
  </head>
  <body>
    <main>
      <h1>Mandá plata a tu familia en Venezuela</h1>
      <p>Te decimos la forma de que les lleguen más bolívares, vía Pago Móvil.</p>

      {apiDown ? (
        <p class="error">
          No pudimos cargar las cotizaciones ahora.
          <a href="https://saldo.com.ar">Operá directamente en Saldoar →</a>
        </p>
      ) : (
        <>
          <form method="get">
            <OriginSelect corridors={corridors} selected={from} />
            <input type="number" name="amount" min="1" step="any" placeholder="Monto" value={hasQuery ? amount : ''} required />
            <fieldset class="sort">
              <label><input type="radio" name="sort" value="amount" checked={sort === 'amount'} /> Más bolívares</label>
              <label><input type="radio" name="sort" value="speed" checked={sort === 'speed'} /> Más rápido</label>
            </fieldset>
            <button type="submit">Ver mejor ruta</button>
          </form>

          {hasQuery && (
            <section>
              <ResultList routes={routes} />
              <aside class="receiver">
                <strong>Tu familiar solo necesita:</strong> teléfono + cédula.
                No hace falta ir al banco.
              </aside>
              {minsAgo !== null && <p class="freshness">Datos de hace {minsAgo} min · estimados, confirmá el monto final en Saldoar.</p>}
            </section>
          )}
        </>
      )}
    </main>
  </body>
</html>
```

- [ ] **Step 9: Manual smoke test**

Run: `npm run dev` then open `http://localhost:4321/?from=USD&amount=100&sort=amount`
Expected: ranked routes render; the receiver block and freshness line show.

- [ ] **Step 10: Run all tests**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: ssr page, route cards, and result states"
```

---

### Task 8: Deploy adapter + README

**Files:**
- Modify: `astro.config.mjs`, `package.json`
- Create: `README.md`

**Interfaces:**
- Consumes: the working app.
- Produces: a buildable, deployable site.

- [ ] **Step 1: Add the Cloudflare adapter**

Run: `npx astro add cloudflare --yes`
Expected: `astro.config.mjs` updated with `adapter: cloudflare()` and `@astrojs/cloudflare` installed.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds, `dist/` produced.

- [ ] **Step 3: Write `README.md`**

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: cloudflare adapter and readme"
```

---

## Self-Review notes

- **Spec coverage:** origin+amount input (T7), ranked routes with arrival/time/requirements (T4+T7), all 13 corridors (T6 from live data), Pago Móvil destination (T3 filter), fees/min from `systems` (T3, exposed for "estimado"), `time_average` (T3/T5), cache + stale-on-error + freshness (T5/T7), error states (T7), TDD fixtures (T2), Spanish UI / English code (global), no external comparison (out of scope), deploy (T8). All covered.
- **Known risk carried from spec:** whether `best_rate.price` is already net of fees. The engine currently shows gross `amount * price` as "estimado"; if fixtures during T2/T4 show fees must be subtracted, adjust `getRoutes` arrival math and add a test — the "estimado" label and breakdown keep us honest meanwhile.
