import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, h as createAstro, k as renderComponent, l as renderHead, n as Fragment } from '../chunks/astro/server_B312wajC.mjs';
import 'piccolore';
import 'clsx';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

function attrsOf(raw) {
  return raw.data ?? [];
}
function buildDataset(raw) {
  const rates = attrsOf(raw.bestRates).map((r) => r.attributes).filter((a) => a.system2 === "pago_movil" && a.currency2 === "VES");
  const systems = {};
  for (const s of attrsOf(raw.systems)) {
    const a = s.attributes;
    systems[s.id] = {
      id: s.id,
      name: a.name,
      currency: a.currency,
      market: a.market ?? "",
      fixedFeeSend: a.fixed_fee_send ?? 0,
      percentFeeSend: a.percent_fee_send ?? 0,
      minSend: a.minimum_amount_send ?? 0,
      maxSend: a.maximum_amount_send ?? Number.POSITIVE_INFINITY
    };
  }
  const pmRaw = raw.pagoMovilInfo;
  const pmAttrs = pmRaw.data?.attributes ?? pmRaw.data?.[0]?.attributes ?? {};
  const pagoMovilInfo = {
    timeAverage: pmAttrs.time_average ?? 0,
    onTimePercent: pmAttrs.on_time_percent ?? 0
  };
  return { rates, systems, pagoMovilInfo };
}

const BASE$1 = "https://api.saldo.com.ar/v3";
const UA = "Mozilla/5.0 (envioya-venezuela)";
const TTL_MS = 10 * 6e4;
let cache = null;
async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`saldoar ${res.status}`);
  return res.json();
}
async function getDataset(now = Date.now()) {
  if (cache && now - cache.fetchedAt < TTL_MS) return cache;
  try {
    const [bestRates, systems, pagoMovilInfo] = await Promise.all([
      get(`${BASE$1}/best_rates?page%5Bsize%5D=500`),
      get(`${BASE$1}/systems?page%5Bsize%5D=100`),
      get(`${BASE$1}/systems/pago_movil/system_information`)
    ]);
    cache = { dataset: buildDataset({ bestRates, systems, pagoMovilInfo }), fetchedAt: now };
    return cache;
  } catch (err) {
    if (cache) return cache;
    throw err;
  }
}

function getRoutes(ds, fromCurrency, amount) {
  const routes = ds.rates.filter((r) => r.currency1 === fromCurrency).map((r) => {
    const sys = ds.systems[r.system1];
    const minSend = sys?.minSend ?? 0;
    return {
      systemId: r.system1,
      systemName: sys?.name ?? r.system1,
      currency: sys?.currency ?? fromCurrency,
      // `r.price` is Saldoar's net effective VES-per-origin-unit rate — fees
      // are already embedded. Do NOT subtract system fees again here.
      arrivalVes: amount * r.price,
      timeAverageMin: ds.pagoMovilInfo.timeAverage,
      belowMin: amount < minSend,
      minSend
    };
  });
  return [...routes].sort((a, b) => b.arrivalVes - a.arrivalVes);
}

const WALLET_SYSTEMS = /* @__PURE__ */ new Set(["zinli", "yape-plin"]);
const CATEGORY_ORDER = ["transfer", "wallet", "crypto"];
const CATEGORY_LABELS = {
  transfer: "Transferencia",
  wallet: "Billetera",
  crypto: "Cripto"
};
const CORRIDOR_LABELS = {
  USD: { label: "Dólar (USD)", flag: "🇺🇸" },
  USDT: { label: "USDT", flag: "🪙" },
  USDC: { label: "USDC", flag: "🪙" },
  EUR: { label: "Euro (EUR) — España", flag: "🇪🇸" },
  COP: { label: "Peso colombiano (COP)", flag: "🇨🇴" },
  CLP: { label: "Peso chileno (CLP)", flag: "🇨🇱" },
  PEN: { label: "Sol peruano (PEN)", flag: "🇵🇪" },
  BRL: { label: "Real brasileño (BRL)", flag: "🇧🇷" },
  BOB: { label: "Boliviano (BOB)", flag: "🇧🇴" },
  MXN: { label: "Peso mexicano (MXN)", flag: "🇲🇽" },
  ARS: { label: "Peso argentino (ARS)", flag: "🇦🇷" },
  BTC: { label: "Bitcoin (BTC)", flag: "🪙" },
  DAI: { label: "DAI", flag: "🪙" }
};
function availableCorridors(ds) {
  const byCurrency = /* @__PURE__ */ new Map();
  for (const r of ds.rates) {
    if (!byCurrency.has(r.currency1)) byCurrency.set(r.currency1, r.system1);
  }
  return [...byCurrency.entries()].map(([currency, systemId]) => {
    const market = ds.systems[systemId]?.market;
    const category = market === "crypto" ? "crypto" : WALLET_SYSTEMS.has(systemId) ? "wallet" : "transfer";
    return {
      currency,
      systemId,
      label: CORRIDOR_LABELS[currency]?.label ?? currency,
      flag: CORRIDOR_LABELS[currency]?.flag ?? "💱",
      category
    };
  }).sort((a, b) => a.label.localeCompare(b.label, "es"));
}

const $$Astro$5 = createAstro();
const $$OriginSelect = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$OriginSelect;
  const { corridors, selected } = Astro2.props;
  const groups = CATEGORY_ORDER.map((cat) => ({ cat, items: corridors.filter((c) => c.category === cat) })).filter((g) => g.items.length > 0);
  return renderTemplate`${maybeRenderHead()}<select name="from" required> <option value="" disabled${addAttribute(!selected, "selected")}>¿Desde dónde enviás?</option> ${groups.map((g) => renderTemplate`<optgroup${addAttribute(CATEGORY_LABELS[g.cat], "label")}> ${g.items.map((c) => renderTemplate`<option${addAttribute(c.currency, "value")}${addAttribute(c.currency === selected, "selected")}>${c.flag} ${c.label}</option>`)} </optgroup>`)} </select>`;
}, "/home/chorch/Documentos/proyectos/envioya-venezuela/src/components/OriginSelect.astro", void 0);

function formatVes(n) {
  const rounded = Math.round(n);
  const grouped = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 }).format(rounded);
  return `${grouped} Bs`;
}

const LOCALE = "es-VE";
const BASE = "https://saldoar.com";
const DEST = "pago_movil";
function buildSaldoarLink(systemId, amount) {
  const amt = Math.max(0, Math.round(amount));
  return `${BASE}/${LOCALE}/a/${systemId}/${DEST}/${amt}/0`;
}

const $$Astro$4 = createAstro();
const $$SystemLogo = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$SystemLogo;
  const { systemId, alt, size = "small" } = Astro2.props;
  const base = `https://api.saldo.com.ar/img/sistemas2/${systemId}-saldo.${size}`;
  return renderTemplate`${maybeRenderHead()}<picture class="system-logo"> <source${addAttribute(`${base}.webp`, "srcset")} type="image/webp"> <img${addAttribute(`${base}.png`, "src")}${addAttribute(alt, "alt")} width="32" height="32" loading="lazy"> </picture>`;
}, "/home/chorch/Documentos/proyectos/envioya-venezuela/src/components/SystemLogo.astro", void 0);

const $$Astro$3 = createAstro();
const $$RouteCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$RouteCard;
  const { route, best, amount } = Astro2.props;
  const saldoarUrl = buildSaldoarLink(route.systemId, amount);
  return renderTemplate`${maybeRenderHead()}<article${addAttribute(["card", { best }], "class:list")}> ${best && renderTemplate`<span class="badge">Más bolívares</span>`} <header class="card-head"> ${renderComponent($$result, "SystemLogo", $$SystemLogo, { "systemId": route.systemId, "alt": route.systemName })} <h3>${route.systemName}</h3> </header> <p class="amount">${formatVes(route.arrivalVes)} <small>(estimado)</small></p> <p class="time">Llega en ~${route.timeAverageMin} min</p> ${route.belowMin && renderTemplate`<p class="warn">Monto mínimo: ${route.minSend} ${route.currency}</p>`} <a class="cta"${addAttribute(saldoarUrl, "href")} target="_blank" rel="noopener">Iniciá el envío en Saldoar →</a> <p class="cta-note">El teléfono de tu familiar se ingresa dentro de Saldoar.</p> </article>`;
}, "/home/chorch/Documentos/proyectos/envioya-venezuela/src/components/RouteCard.astro", void 0);

const $$Astro$2 = createAstro();
const $$ResultList = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$ResultList;
  const { routes, amount } = Astro2.props;
  return renderTemplate`${routes.length === 0 ? renderTemplate`${maybeRenderHead()}<p class="empty">No encontramos una ruta desde esa moneda. Probá con USD o USDT.</p>` : renderTemplate`<div class="results">${routes.map((r, i) => renderTemplate`${renderComponent($$result, "RouteCard", $$RouteCard, { "route": r, "best": i === 0, "amount": amount })}`)}</div>`}`;
}, "/home/chorch/Documentos/proyectos/envioya-venezuela/src/components/ResultList.astro", void 0);

const $$Astro$1 = createAstro();
const $$MethodSwitcher = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$MethodSwitcher;
  const { corridors, current, amount } = Astro2.props;
  const others = corridors.filter((c) => c.currency !== current);
  return renderTemplate`${others.length > 0 && renderTemplate`${maybeRenderHead()}<section class="switcher"><h2>¿Mandás con otra cosa?</h2><p class="switcher-sub">Elegí el método que ya usás.</p><div class="switcher-grid">${others.map((c) => renderTemplate`<a class="switch-item"${addAttribute(`/?from=${c.currency}&amount=${amount}`, "href")}>${renderComponent($$result, "SystemLogo", $$SystemLogo, { "systemId": c.systemId, "alt": c.label })}<span>${c.label}</span></a>`)}</div></section>`}`;
}, "/home/chorch/Documentos/proyectos/envioya-venezuela/src/components/MethodSwitcher.astro", void 0);

const $$DonationsSection = createComponent(($$result, $$props, $$slots) => {
  const channels = [
    {
      name: "C\xE1ritas de Venezuela",
      description: "La organizaci\xF3n de la Iglesia Cat\xF3lica que asiste a las familias m\xE1s vulnerables del pa\xEDs.",
      url: "https://caritasvenezuela.org/donaciones/"
    },
    {
      name: "World Central Kitchen",
      description: "Comidas de emergencia para las familias afectadas por los terremotos.",
      url: "https://donate.wck.org/campaign/815521/donate"
    },
    {
      name: "I Love Venezuela Foundation",
      description: "Campa\xF1a en GoFundMe: alimentos, agua potable, asistencia m\xE9dica y refugio.",
      url: "https://www.gofundme.com/f/emergency-relief-for-venezuela-earthquake-victims"
    }
  ];
  return renderTemplate`${maybeRenderHead()}<section class="donations-section"> <div class="donations-tricolor" aria-hidden="true"> <div class="donations-tricolor-yellow"></div> <div class="donations-tricolor-blue"></div> <div class="donations-tricolor-red"></div> </div> <h2 class="donations-heading">Ayudá a Venezuela</h2> <p class="donations-subtitle">Canales de ayuda para los afectados por el terremoto.</p> <div class="donations-grid"> ${channels.map((channel) => renderTemplate`<div class="donations-card"> <h3 class="donations-card-name">${channel.name}</h3> <p class="donations-card-desc">${channel.description}</p> <a${addAttribute(channel.url, "href")} class="donations-btn" target="_blank" rel="noopener noreferrer">Donar →</a> </div>`)} </div> </section>`;
}, "/home/chorch/Documentos/proyectos/envioya-venezuela/src/components/DonationsSection.astro", void 0);

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const params = Astro2.url.searchParams;
  const from = params.get("from");
  const amount = Number(params.get("amount") ?? "");
  let corridors = [];
  let routes = [];
  let fetchedAt = null;
  let apiDown = false;
  try {
    const cached = await getDataset();
    fetchedAt = cached.fetchedAt;
    corridors = availableCorridors(cached.dataset);
    if (from && Number.isFinite(amount) && amount > 0) {
      routes = getRoutes(cached.dataset, from, amount);
    }
  } catch {
    apiDown = true;
  }
  const minsAgo = fetchedAt ? Math.round((Date.now() - fetchedAt) / 6e4) : null;
  const hasQuery = Boolean(from && Number.isFinite(amount) && amount > 0);
  return renderTemplate`<html lang="es"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>EnvíoYA Venezuela — la mejor forma de mandar plata a tu familia</title>${renderHead()}</head> <body> <main> <img src="/logo-saldo-color.svg" alt="Saldoar" width="120" height="32" class="brand-logo"> <h1>Mandá plata a tu familia en Venezuela</h1> <p>Te decimos la forma de que les lleguen más bolívares, vía Pago Móvil.</p> ${apiDown ? renderTemplate`<p class="error">
No pudimos cargar las cotizaciones ahora.
<a href="https://saldoar.com">Operá directamente en Saldoar →</a> </p>` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": async ($$result2) => renderTemplate` <form method="get"> ${renderComponent($$result2, "OriginSelect", $$OriginSelect, { "corridors": corridors, "selected": from })} <input type="number" name="amount" min="1" step="any" placeholder="Monto"${addAttribute(hasQuery ? amount : "", "value")} required> <button type="submit">Ver mejor ruta</button> </form> ${hasQuery && renderTemplate`<section> ${renderComponent($$result2, "ResultList", $$ResultList, { "routes": routes, "amount": amount })} <aside class="receiver"> <strong>Tu familiar solo necesita:</strong> teléfono + cédula.
                No hace falta ir al banco.
</aside> ${renderComponent($$result2, "MethodSwitcher", $$MethodSwitcher, { "corridors": corridors, "current": from ?? "", "amount": amount })} ${minsAgo !== null && renderTemplate`<p class="freshness">Datos de hace ${minsAgo} min · estimados, confirmá el monto final en Saldoar.</p>`} </section>`}` })}`}  ${renderComponent($$result, "DonationsSection", $$DonationsSection, {})} </main> </body></html>`;
}, "/home/chorch/Documentos/proyectos/envioya-venezuela/src/pages/index.astro", void 0);

const $$file = "/home/chorch/Documentos/proyectos/envioya-venezuela/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
