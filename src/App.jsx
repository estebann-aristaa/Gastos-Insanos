import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

/* ============================================================
   DISEÑO — Design System alineado con PDF 5 "Colors/Typography
   Cada color, gradiente y token coincide 1:1 con Figma/PDF
   ============================================================ */
const C = {
  bg: "#0f0f11",
  card: "#1C1D21",
  cardAlt: "#1C1D21",
  cardHover: "#26282C",
  border: "rgba(75, 75, 75, 0.4)",
  borderStrong: "rgba(75, 75, 75, 0.7)",
  divider: "rgba(75, 75, 75, 0.35)",
  text: "#FAFAFA",
  textMuted: "#9ca3af",
  textFaint: "#4B4B4B",
  brand: "#bd64f5",
  brandDk: "#9c3fe0",
  brandGradient: "linear-gradient(135deg, #bd64f5 0%, #9c3fe0 100%)",
  brandOn: "#0E1100",
  brandBg: "rgba(189, 100, 245, 0.14)",
  brandBorder: "rgba(189, 100, 245, 0.38)",
  warn: "#FA9A3A",
  warnBg: "rgba(250, 154, 58, 0.12)",
  warnBorder: "rgba(250, 154, 58, 0.35)",
  money: "#52D377",
  moneyBg: "rgba(82, 211, 119, 0.12)",
  moneyBorder: "rgba(82, 211, 119, 0.32)",
  bad: "#F53222",
  badBg: "rgba(245, 50, 34, 0.12)",
  badBorder: "rgba(245, 50, 34, 0.32)",
  tutorialViolet: "#8E7CFF",
  tutorialBlue: "#3DB6F2",
};

const FONT = "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
const FONT_MONO = FONT;
const NUMS = { fontFamily: FONT, fontVariantNumeric: "tabular-nums" };

const fmt = (n, currency = "$") => {
  if (n === null || n === undefined || isNaN(n)) return `${currency}0`;
  const sign = n < 0 ? "-" : "";
  return `${sign}${currency}${Math.round(Math.abs(n)).toLocaleString("es-CO")}`;
};
const fmtUsd = (n) => `$${(Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`;
const pct = (n) => `${Math.round((n || 0) * 1000) / 10}%`;
const uid = () => Math.random().toString(36).slice(2, 10);
const todayStr = () => new Date().toISOString().slice(0, 10);

async function obtenerTasaCambioAutomatica() {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) throw new Error("No se pudo consultar la tasa");
  const data = await response.json();
  const valor = data && data.rates && Number(data.rates.COP);
  if (!valor || valor < 500 || valor > 20000) throw new Error("Valor fuera de rango esperado");
  return Math.round(valor);
}

const CATS_PERSONAL = [
  { name: "Arriendo/Vivienda", tipo: "Necesidad" },
  { name: "Servicios (luz/agua/internet)", tipo: "Necesidad" },
  { name: "Mercado", tipo: "Necesidad" },
  { name: "Transporte", tipo: "Necesidad" },
  { name: "Salud", tipo: "Necesidad" },
  { name: "Deudas", tipo: "Necesidad" },
  { name: "Restaurantes", tipo: "Gusto" },
  { name: "Entretenimiento", tipo: "Gusto" },
  { name: "Compras personales", tipo: "Gusto" },
  { name: "Suscripciones", tipo: "Gusto" },
  { name: "Viajes", tipo: "Gusto" },
  { name: "Ahorro", tipo: "Ahorro" },
  { name: "Inversión", tipo: "Ahorro" },
  { name: "Otro", tipo: "Necesidad" },
];
const CATS_NEGOCIO = ["Ads/Pauta", "Herramientas/Software", "Contenido (edición, freelance)", "Hosting/Dominios", "Comisiones Hotmart/ManyChat", "Otro gasto operativo"];

/* Íconos por categoría — solo uso visual, no altera CATS_PERSONAL/CATS_NEGOCIO */
const CATEGORY_ICONS = {
  "Arriendo/Vivienda": "home",
  "Servicios (luz/agua/internet)": "bolt",
  "Mercado": "cart",
  "Transporte": "car",
  "Salud": "heart",
  "Deudas": "creditcard",
  "Restaurantes": "utensils",
  "Entretenimiento": "film",
  "Compras personales": "bag",
  "Suscripciones": "refresh",
  "Viajes": "plane",
  "Ahorro": "target",
  "Inversión": "trend",
  "Otro": "dots",
};
const NEGOCIO_ICONS = {
  "Ads/Pauta": "megaphone",
  "Herramientas/Software": "settings",
  "Contenido (edición, freelance)": "pencil",
  "Hosting/Dominios": "server",
  "Comisiones Hotmart/ManyChat": "percent",
  "Otro gasto operativo": "dots",
};

const DEFAULT_STATE = {
  config: { tasaRef: 4000, sueldo: 0, pctNecesidad: 0.5, pctGusto: 0.3, pctAhorro: 0.2, mesesFondo: 6, umbralHormiga: 30000, tasaAutoFecha: null },
  ingresosPetnova: [],
  gastosPetnova: [],
  ingresosPersonalOtros: [],
  gastosPersonal: [],
  presupuestos: {},
  metas: [],
  fondoAhorrado: 0,
  historial: [],
  tutorialVisto: false,
};

/* ============================================================
   ICONOS (SVG inline, sistema consistente — estilo delgado PDF 2
   Trazos uniformes, terminaciones/mitades redondas, grid 24
   ============================================================ */
const Icon = ({ name, size = 18, color = "currentColor", strokeWidth = 1.6 }) => {
  const icons = {
    dashboard: <><rect x="3.5" y="3.5" width="7.5" height="9" rx="2" /><rect x="13" y="3.5" width="7.5" height="5.5" rx="2" /><rect x="13" y="11.5" width="7.5" height="9" rx="2" /><rect x="3.5" y="15.5" width="7.5" height="5" rx="2" /></>,
    cat: <><path d="M5 9c0-2.2 2-4 4-4 .8 0 1.4.8 2 .8s1.2-.8 2-.8c2.2 0 4 2 4 4 0 3-2 4-2 7 0 2-2 4-6 4s-6-2-6-4c0-3-2-4-2-7z" /><circle cx="9.5" cy="10.8" r="0.6" fill={color} /><circle cx="14.5" cy="10.8" r="0.6" fill={color} /></>,
    user: <><circle cx="12" cy="8.2" r="3.6" /><path d="M4.5 20c0-4 3.5-7.2 7.5-7.2s7.5 3.2 7.5 7.2" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill={color} /></>,
    trophy: <><path d="M8 5h8v5.5a4 4 0 01-8 0V5z" /><path d="M8 6H5.5a2.8 2.8 0 002.8 3M16 6h2.5a2.8 2.8 0 01-2.8 3" /><path d="M12 14v2.5M9 21h6M10 17.5h4v1.2a1.8 1.8 0 01-4 0v-1.2z" /></>,
    trend: <><path d="M3 17l5.5-5.5 4 4 8-8" /><path d="M15 7h6v6" /></>,
    settings: <><circle cx="12" cy="12" r="2.8" /><path d="M12 2.8v2.8M12 18.4v2.8M4.8 4.8l2 2M17.2 17.2l2 2M2.8 12h2.8M18.4 12h2.8M4.8 19.2l2-2M17.2 6.8l2-2" /></>,
    plus: <path d="M12 5.5v13M5.5 12h13" />,
    trash: <><path d="M4.5 7h15" /><path d="M8.8 7V4.5h6.4V7" /><path d="M6 7l.8 12.5h10.4L18 7" /></>,
    check: <path d="M5 12.2l4.8 4.8L19 7.8" />,
    alert: <><path d="M12 3l-9.2 17h18.4L12 3z" /><path d="M12 10.5v4M12 17.5v.1" /></>,
    x: <path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8" />,
    ant: <><ellipse cx="12" cy="14" rx="3.6" ry="4.5" /><circle cx="12" cy="6.5" r="2.2" /><path d="M9 4.5L6 2.5M15 4.5l3-2M6 14H2.8M21.2 14H18" /></>,
    help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9a2.6 2.6 0 015 0c0 1.7-2.4 1.9-2.4 3.6" /><circle cx="12" cy="17.2" r="0.4" fill={color} /></>,
    chevronLeft: <path d="M15 5.5l-6.5 6.5L15 18.5" />,
    chevronRight: <path d="M9 5.5l6.5 6.5L9 18.5" />,
    refresh: <><path d="M3.5 12a8.5 8.5 0 0114.4-6L20.5 8.5" /><path d="M20.5 3.5v5h-5" /><path d="M20.5 12a8.5 8.5 0 01-14.4 6L3.5 15.5" /><path d="M3.5 20.5v-5h5" /></>,
    hand: <><path d="M8 12.5V6.5A1.5 1.5 0 0111 5v6M11 10.2V5a1.5 1.5 0 013 0v5.5M14 10.2V6.5A1.5 1.5 0 0117 5v5.5" /><path d="M17 11.5V9.5A1.5 1.5 0 0120 9.5v4a5.5 5.5 0 01-5.5 5.5h-1.8a5.5 5.5 0 01-4.6-2.5L4.8 12.8a1.3 1.3 0 012-1.6L8 12.5" /></>,
    sparkle: <><path d="M12 3.5l1.5 4.5 4.5 1.5-4.5 1.5L12 15.5l-1.5-4.5L6 9.5l4.5-1.5z" /><path d="M18.8 15.5l.7 2 2 .8-2 .7-.7 2-.7-2-2-.7 2-.8z" /></>,
    arrowUp: <><path d="M12 19V5.5" /><path d="M6.5 11L12 5.5 17.5 11" /></>,
    arrowDown: <><path d="M12 5V18.5" /><path d="M17.5 13L12 18.5 6.5 13" /></>,
    lock: <><rect x="5.2" y="10.8" width="13.6" height="8.2" rx="2" /><path d="M8 10.8V7.8a4 4 0 118 0v3" /></>,
    eye: <><path d="M2.5 12s3.3-6.2 9.5-6.2 9.5 6.2 9.5 6.2-3.3 6.2-9.5 6.2S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
    eyeOff: <><path d="M3.5 3.5l17 17" /><path d="M10.5 5.5c.5-.1 1-.2 1.5-.2 6.2 0 9.5 6.2 9.5 6.2a16.5 16.5 0 01-3.2 4" /><path d="M6.2 6.8C4 8.6 2.5 12 2.5 12s3.3 6.2 9.5 6.2c1.5 0 2.8-.3 4-.7" /><path d="M9.8 9.8a2.8 2.8 0 003.8 3.8" /></>,
    menu: <><path d="M4.5 7h15" /><path d="M4.5 12h15" /><path d="M4.5 17h15" /></>,
    portfolio: <><rect x="3.5" y="7.2" width="17" height="12.8" rx="2" /><path d="M8 7.2V5.5A2 2 0 0110 3.5h4a2 2 0 012 2v1.7" /></>,
    logout: <><path d="M9 20.5H5.5A2 2 0 013.5 18.5V5.5A2 2 0 015.5 3.5H9" /><path d="M15.5 16.5L20.5 12 15.5 7.5" /><path d="M20.5 12H9.5" /></>,
    home: <><path d="M4.2 11l7.8-6.2 7.8 6.2" /><path d="M6 10.2v8a1 1 0 001 1h2.8v-5h4.4v5H17a1 1 0 001-1v-8" /></>,
    bolt: <path d="M13 2.8L5.8 13.5h5.5l-1 7.7 8-9.7h-5.5l1-8.7z" />,
    cart: <><circle cx="8.8" cy="19.5" r="1.2" fill={color} /><circle cx="17" cy="19.5" r="1.2" fill={color} /><path d="M3 3.5h2l2.2 11.2a1.8 1.8 0 001.8 1.6h7.6a1.8 1.8 0 001.8-1.5L20 7.8H6.2" /></>,
    car: <><path d="M4.8 15.5V11l1.8-4.7h10.8l2.2 4.7v4.5" /><path d="M3.8 15.5h16.4" /><circle cx="7.8" cy="17.2" r="1.4" /><circle cx="16.2" cy="17.2" r="1.4" /></>,
    heart: <path d="M12 19.5S5.5 15.5 3.2 11.5C2 8.8 3 5.8 6.2 5.3c1.8-.3 3.6.7 5.8 3.1 2.2-2.4 4-3.4 5.8-3.1 3.2.5 4.2 3.5 3 6.2-2.3 4-8.8 8-8.8 8z" />,
    creditcard: <><rect x="3.2" y="5.8" width="17.6" height="12.4" rx="2" /><path d="M3.2 10.2h17.6" /></>,
    utensils: <><path d="M7 2.8v6.2a1.8 1.8 0 003.5 0V2.8M8.8 9V21" /><path d="M16.2 2.8c-1.3 0-2.2 1.8-2.2 4s.9 4 2.2 4 2.2-1.8 2.2-4-.9-4-2.2-4zM16.2 10.8V21" /></>,
    film: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M3.5 9.5h17M3.5 14.5h17M8.5 5v14M15.5 5v14" /></>,
    bag: <><path d="M6.8 8h10.4l.9 11a1.8 1.8 0 01-1.8 1.9H7.7A1.8 1.8 0 015.9 19l.9-11z" /><path d="M9 8V6.2a3 3 0 016 0V8" /></>,
    plane: <path d="M21 2.8L11.2 13M21 2.8l-6.2 17.7L11.5 15.7 3.8 13 21 2.8z" />,
    dots: <><circle cx="5.5" cy="12" r="1.4" fill={color} /><circle cx="12" cy="12" r="1.4" fill={color} /><circle cx="18.5" cy="12" r="1.4" fill={color} /></>,
    pencil: <><path d="M3.8 20.5l3.4-.8 10.2-10.2-2.5-2.5L4.7 17.3l-.9 3.2z" /><path d="M14.5 4.8l2-2a1.7 1.7 0 012.4 0l.8.8a1.7 1.7 0 010 2.4l-2 2" /></>,
    server: <><rect x="3.5" y="4.2" width="17" height="6" rx="1.5" /><rect x="3.5" y="13.5" width="17" height="6" rx="1.5" /><circle cx="7.2" cy="7.2" r="0.6" fill={color} /><circle cx="7.2" cy="16.5" r="0.6" fill={color} /></>,
    percent: <><circle cx="7.2" cy="7.2" r="2.1" /><circle cx="16.8" cy="16.8" r="2.1" /><path d="M18.5 5.5L5.5 18.5" /></>,
    megaphone: <><path d="M3.5 10v4a1 1 0 001 1h1.7l6.2 3.3V5.8L6.2 9H4.5a1 1 0 00-1 1z" /><path d="M16 7.8a3.8 3.8 0 010 7.6" /></>,
    homePentagon: <><path d="M12 3.5l-7.5 6V20a1 1 0 001 1h5v-6h3v6h5a1 1 0 001-1V9.5l-7.5-6z" /><path d="M12 14v4" /></>,
    marketSwap: <><path d="M18 4.5v2.5a2.5 2.5 0 01-2.5 2.5" /><path d="M18 4.5l-2.8 2.8" /><path d="M6 19.5v-2.5a2.5 2.5 0 012.5-2.5" /><path d="M6 19.5l2.8-2.8" /><rect x="5" y="10.5" width="14" height="6.5" rx="2" /><path d="M9 14h1" /></>,
    pieChart: <><path d="M12 4.5a7.5 7.5 0 107.5 7.5H12V4.5z" /><path d="M20 12a8 8 0 00-.2-1.8" /><path d="M12 4.5V12h8" /></>,
    transfer: <><path d="M9 4v14" /><path d="M5 8l4-4 4 4" /><path d="M15 6v14" /><path d="M11 16l4 4 4-4" /></>,
    swapHoriz: <><path d="M4 7h11.5" /><path d="M12 4l3.5 3L12 10" /><path d="M20 17H8.5" /><path d="M12 20l-3.5-3L12 14" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
};

/* ============================================================
   STORAGE — Supabase (base de datos en la nube)
   ------------------------------------------------------------
   Cada usuario logueado tiene una fila "privada" (solo él la ve,
   sus datos Personal/Presupuesto/Metas/Historial/Config) y hay
   UNA fila "compartida" que ven y editan los dos hermanos por
   igual (los datos de Petnova). Row Level Security en la base de
   datos es quien de verdad impide que nadie más entre — el login
   es la puerta, RLS es la cerradura.
   ============================================================ */
const PRIVATE_FIELDS = ["config", "ingresosPersonalOtros", "gastosPersonal", "presupuestos", "metas", "fondoAhorrado", "historial", "tutorialVisto"];
const SHARED_FIELDS = ["ingresosPetnova", "gastosPetnova"];
const SHARED_ROW_ID = "shared";

function usePersistentState(user) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const privateRowId = `private:${user.id}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("app_state")
        .select("id, payload")
        .in("id", [privateRowId, SHARED_ROW_ID]);
      if (cancelled) return;
      let priv = {};
      let shared = {};
      if (!error && data) {
        const privRow = data.find((r) => r.id === privateRowId);
        const sharedRow = data.find((r) => r.id === SHARED_ROW_ID);
        if (privRow) priv = privRow.payload || {};
        if (sharedRow) shared = sharedRow.payload || {};
      }
      setState({
        ...DEFAULT_STATE,
        ...priv,
        ...shared,
        config: { ...DEFAULT_STATE.config, ...(priv.config || {}) },
      });
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const save = useCallback(
    (next) => {
      setState(next);
      setSaving(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // debounce: espera 600ms de inactividad antes de escribir en la
      // base de datos, así no se dispara una escritura por cada tecla.
      saveTimer.current = setTimeout(async () => {
        const priv = {};
        PRIVATE_FIELDS.forEach((k) => (priv[k] = next[k]));
        const shared = {};
        SHARED_FIELDS.forEach((k) => (shared[k] = next[k]));
        try {
          await supabase.from("app_state").upsert([
            { id: privateRowId, owner_id: user.id, payload: priv, updated_at: new Date().toISOString() },
            { id: SHARED_ROW_ID, owner_id: null, payload: shared, updated_at: new Date().toISOString() },
          ]);
        } catch (e) {
          console.error("Error guardando", e);
        }
        setSaving(false);
      }, 600);
    },
    [privateRowId, user.id]
  );

  return { state, save, loaded, saving };
}

/* ============================================================
   PRIMITIVOS VISUALES
   ============================================================ */
function Card({ children, style, padding = "20px" }) {
  return (
    <div
      className="fin-card"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 22,
        padding,
        boxSizing: "border-box",
        boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 12px 32px -14px rgba(0,0,0,0.65)",
        transition: "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function GroupLabel({ children, style }) {
  return (
    <div style={{ fontSize: 11.5, color: C.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, ...style }}>
      {children}
    </div>
  );
}

function HeroWalletCard({
  walletLabel = "Tu Billetera",
  value,
  valueColor,
  percentLabel,
  percentValue,
  percentUp = true,
  onAddGasto,
  onAddIngreso,
  onCerrarMes,
}) {
  const [visible, setVisible] = useState(true);
  return (
    <div style={{ marginBottom: 24, position: "relative", paddingTop: 8 }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -10,
          left: "50%",
          transform: "translateX(-50%)",
          width: 380,
          height: 300,
          background: `radial-gradient(closest-side, ${C.brandBg}, transparent 72%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.brand,
                boxShadow: `0 0 6px ${C.brand}`,
              }}
            />
            <span style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 600, letterSpacing: 0.2 }}>{walletLabel}</span>
          </div>
          <button
            onClick={() => setVisible((v) => !v)}
            title={visible ? "Ocultar monto" : "Mostrar monto"}
            className="fin-tap"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: C.textMuted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={visible ? "eye" : "eyeOff"} size={15} strokeWidth={1.6} />
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18, position: "relative" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 104,
              height: 104,
              borderRadius: "50%",
              background: `radial-gradient(closest-side, rgba(151,220,34,0.18), transparent 70%)`,
            }}
          />
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "rgba(151,220,34,0.10)",
              border: "1px solid rgba(151,220,34,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                fontFamily: FONT,
                color: C.brand,
                lineHeight: 1,
                textShadow: "0 6px 20px rgba(151,220,34,0.35)",
              }}
            >
              $
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: -1.8,
              lineHeight: 1.02,
              color: C.text,
              fontFamily: FONT,
              fontVariantNumeric: "tabular-nums",
              wordBreak: "break-word",
              marginBottom: 14,
            }}
          >
            {visible ? value : "$ ••••••"}
          </div>
          {percentValue && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "7px 15px",
                borderRadius: 999,
                background: percentUp
                  ? "rgba(82, 211, 119, 0.14)"
                  : "rgba(245, 50, 34, 0.14)",
                border: `1px solid ${percentUp ? C.moneyBorder : C.badBorder}`,
              }}
            >
              <Icon
                name={percentUp ? "arrowUp" : "arrowDown"}
                size={11}
                strokeWidth={2.8}
                color={percentUp ? C.money : C.bad}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: percentUp ? C.money : C.bad,
                  fontFamily: FONT,
                  letterSpacing: 0.2,
                }}
              >
                {percentValue}
              </span>
              {percentLabel && (
                <span style={{ fontSize: 11.5, color: C.textMuted, marginLeft: 2 }}>
                  {percentLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 18,
          padding: "10px 10px 0",
          maxWidth: 460,
          margin: "0 auto",
        }}
      >
        {[
          {
            label: "Gasto",
            icon: "arrowDown",
            onClick: onAddGasto,
            color: C.bad,
          },
          {
            label: "Ingreso",
            icon: "arrowUp",
            onClick: onAddIngreso,
            color: C.brand,
            primary: true,
          },
          {
            label: "Cerrar Mes",
            icon: "swapHoriz",
            onClick: onCerrarMes,
            color: C.money,
          },
        ].map((it) => (
          <button
            key={it.label}
            onClick={it.onClick}
            className="fin-tap"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              flex: "0 1 auto",
              minWidth: 82,
              fontFamily: FONT,
              padding: 0,
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${it.primary ? "rgba(151,220,34,0.20)" : "rgba(255,255,255,0.07)"}`,
                color: it.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: it.primary
                  ? `0 0 0 1px rgba(151,220,34,0.08) inset`
                  : "none",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <Icon name={it.icon} size={22} strokeWidth={2.0} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.textMuted, letterSpacing: 0.2 }}>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Hero({ label, value, valueColor, badge, sub, icon = "dashboard" }) {
  const [visible, setVisible] = useState(true);
  return (
    <div style={{ marginBottom: 30, position: "relative", textAlign: "center" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -30,
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          height: 190,
          background: `radial-gradient(closest-side, ${C.brandBg}, transparent)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: C.cardAlt,
            border: `1px solid ${C.brandBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.brand,
            boxShadow: `0 0 0 6px ${C.brandBg}`,
          }}
        >
          <Icon name={icon} size={19} strokeWidth={1.8} />
        </div>
      </div>
      <div style={{ position: "relative", fontSize: 11.5, color: C.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: -1.4,
            lineHeight: 1,
            color: valueColor || C.text,
            fontFamily: FONT,
            fontVariantNumeric: "tabular-nums",
            wordBreak: "break-word",
            transition: "opacity 0.15s ease",
          }}
        >
          {visible ? value : "••••••"}
        </div>
        <button
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Ocultar valor" : "Mostrar valor"}
          className="fin-tap"
          style={{ background: "transparent", border: "none", color: C.textFaint, cursor: "pointer", display: "flex", alignItems: "center", padding: 6, flexShrink: 0, borderRadius: 8, transition: "color 0.15s ease" }}
        >
          <Icon name={visible ? "eye" : "eyeOff"} size={18} strokeWidth={1.8} />
        </button>
        {badge}
      </div>
      {sub && <div style={{ position: "relative", fontSize: 12.5, color: C.textMuted, marginTop: 10 }}>{sub}</div>}
    </div>
  );
}

function QuickActions({ items }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        marginBottom: 28,
        overflowX: "auto",
        justifyContent: "center",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {items.map((it) => (
        <button
          key={it.label}
          onClick={it.onClick}
          className="fin-tap"
          style={{
            flexShrink: 0,
            width: 68,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: "2px 2px 0",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
            transition: "transform 0.12s ease",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: it.primary ? C.brand : C.cardAlt,
              border: it.primary ? "1px solid transparent" : `1px solid ${C.border}`,
              color: it.primary ? C.brandOn : C.text,
              boxShadow: it.primary ? `0 6px 16px -6px ${C.brandBorder}` : "none",
              transition: "background 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <Icon name={it.icon} size={19} strokeWidth={2} />
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, textAlign: "center", lineHeight: 1.2 }}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function Field({ value, onChange, type = "text", placeholder, style, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      type={type}
      placeholder={placeholder}
      className="fin-field"
      style={{
        background: C.cardAlt,
        border: `1.5px solid ${focus ? C.brand : C.border}`,
        borderRadius: 14,
        padding: "13px 16px",
        color: C.text,
        fontSize: 14,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: FONT,
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: focus ? `0 0 0 4px ${C.brandBg}` : "none",
        ...style,
      }}
      {...props}
    />
  );
}

function Dropdown({ value, onChange, options, style }) {
  const [focus, setFocus] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        background: C.cardAlt,
        border: `1.5px solid ${focus ? C.brand : C.border}`,
        borderRadius: 14,
        padding: "13px 16px",
        color: value ? C.text : C.textMuted,
        fontSize: 14,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: FONT,
        cursor: "pointer",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: focus ? `0 0 0 4px ${C.brandBg}` : "none",
        ...style,
      }}
    >
      <option value="" style={{ background: C.card, color: C.textFaint }}>
        Elegir categoría
      </option>
      {options.map((o) => (
        <option key={o} value={o} style={{ background: C.card, color: C.text }}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Btn({ children, onClick, variant = "primary", style, disabled, icon, type }) {
  const [hover, setHover] = useState(false);
  const variants = {
    primary: {
      background: C.brandGradient,
      color: C.brandOn,
      border: "1px solid transparent",
      opacity: hover ? 0.94 : 1,
    },
    secondary: {
      background: hover ? C.brandBg : "transparent",
      color: C.brand,
      border: `1.5px solid ${C.brand}`,
    },
    ghost: {
      background: hover ? C.brandBg : "transparent",
      color: C.brand,
      border: `1.5px solid ${C.brand}`,
    },
    text: {
      background: "transparent",
      color: C.brand,
      border: "1px solid transparent",
      padding: "4px 2px",
    },
    danger: {
      background: hover ? C.badBg : "transparent",
      color: C.bad,
      border: `1.5px solid ${C.badBorder}`,
    },
  };
  const isText = variant === "text";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="fin-tap"
      style={{
        padding: isText ? "4px 2px" : variant === "primary" ? "14px 24px" : "12px 20px",
        borderRadius: 999,
        fontSize: isText ? 13 : 13.5,
        fontWeight: 800,
        letterSpacing: 0.2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.2s ease, border-color 0.2s ease, transform 0.15s ease, opacity 0.2s ease, box-shadow 0.2s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: FONT,
        boxShadow: variant === "primary" && !disabled
          ? (hover ? `0 8px 24px -8px ${C.brandBorder}, 0 0 0 3px ${C.brandBg}` : `0 6px 18px -6px ${C.brandBorder}`)
          : "none",
        ...variants[variant],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={14} strokeWidth={2.4} />}
      {children}
      {isText && <Icon name="chevronRight" size={14} strokeWidth={2.4} />}
    </button>
  );
}

function Meter({ pctValue, color = C.money, height = 6 }) {
  const clamped = Math.min(Math.max(pctValue, 0), 1);
  return (
    <div
      style={{
        background: C.cardAlt,
        borderRadius: 6,
        height,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          width: `${clamped * 100}%`,
          background: color,
          height: "100%",
          borderRadius: 6,
          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}

function Chip({ estado }) {
  const map = {
    bien: { bg: C.moneyBg, txt: C.money, border: C.moneyBorder, icon: "check", label: "Bien" },
    cerca: { bg: C.warnBg, txt: C.warn, border: C.warnBorder, icon: "alert", label: "Cerca" },
    excedido: { bg: C.badBg, txt: C.bad, border: C.badBorder, icon: "x", label: "Excedido" },
  };
  const s = map[estado];
  if (!s) return null;
  return (
    <span
      style={{
        background: s.bg,
        color: s.txt,
        border: `1px solid ${s.border}`,
        padding: "4px 10px 4px 8px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={s.icon} size={10.5} strokeWidth={3} />
      {s.label}
    </span>
  );
}

function PrivacyBadge({ shared }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        color: C.textFaint,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={shared ? "user" : "lock"} size={11} strokeWidth={2.4} />
      {shared ? "Compartido con tu hermano" : "Privado, solo tú"}
    </span>
  );
}

function SectionHead({ children, badge }) {
  return (
    <div style={{ marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{children}</div>
      {badge}
    </div>
  );
}

function EmptyState({ text, icon = "trend" }) {
  return (
    <div style={{ padding: "36px 10px", textAlign: "center", color: C.textFaint }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: C.cardAlt,
          border: `1px solid ${C.border}`,
          margin: "0 auto 14px",
          color: C.textMuted,
        }}
      >
        <Icon name={icon} size={20} strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 12.5, maxWidth: 220, margin: "0 auto" }}>{text}</div>
    </div>
  );
}

function IconBtn({ onClick, name = "trash", color = C.bad }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Eliminar"
      className="fin-tap"
      style={{
        background: hover ? `${color}18` : "transparent",
        border: "1px solid transparent",
        color,
        cursor: "pointer",
        borderRadius: "50%",
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s ease",
        flexShrink: 0,
      }}
    >
      <Icon name={name} size={13} strokeWidth={2} />
    </button>
  );
}

function Row({ label, value, bold, color, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: last ? "none" : `1px solid ${C.divider}`,
      }}
    >
      <span style={{ color: bold ? C.text : C.textMuted, fontWeight: bold ? 700 : 400, fontSize: 14 }}>{label}</span>
      <span
        style={{
          color: color || C.text,
          fontFamily: FONT,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          fontSize: bold ? 15 : 14,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const txPrimaryStyle = { background: "transparent", padding: "2px 4px", fontSize: 14, fontWeight: 600, borderRadius: 6 };
const txMetaStyle = { background: "transparent", padding: "2px 4px", fontSize: 11, borderRadius: 6, color: C.textMuted };
const txAmountStyle = { background: "transparent", padding: "2px 4px", fontSize: 14.5, fontWeight: 700, borderRadius: 6, textAlign: "right", fontVariantNumeric: "tabular-nums" };

function TxRow({ icon, iconColor = C.textMuted, primary, meta, amount, amountColor, amountSub, onDelete, last }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 13,
        padding: "14px 0",
        borderBottom: last ? "none" : `1px solid ${C.divider}`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: `${iconColor}18`,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Icon name={icon} size={17} strokeWidth={2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 2 }}>{primary}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{meta}</div>
      </div>

      <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 108 }}>
          <div style={{ color: amountColor || C.text, fontFamily: FONT, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14 }}>
            {amount}
          </div>
          {amountSub && <div style={{ fontSize: 10.5, color: C.textFaint, marginTop: 2, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>{amountSub}</div>}
        </div>
        {onDelete && <IconBtn onClick={onDelete} />}
      </div>
    </div>
  );
}

/* ============================================================
   LOGIN — pantalla de acceso con Supabase Auth
   ============================================================ */
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError("Correo o contraseña incorrectos.");
    setLoading(false);
  };

  return (
    <div
      style={{
        background: C.bg,
        minHeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <form onSubmit={handleLogin} style={{ width: "100%", maxWidth: 320 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: C.brand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 900,
              color: C.brandOn,
              margin: "0 auto 16px",
              boxShadow: `0 8px 24px -8px ${C.brandBorder}`,
            }}
          >
            $
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>Sistema Financiero</div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 5 }}>Acceso privado — solo tú y tu hermano</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Field type="email" placeholder="Correo" value={email} onChange={setEmail} autoComplete="username" required />
        </div>
        <div style={{ marginBottom: 18 }}>
          <Field type="password" placeholder="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" required />
        </div>

        {error && <div style={{ color: C.bad, fontSize: 12.5, marginBottom: 14, textAlign: "center" }}>{error}</div>}

        <Btn type="submit" variant="primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Entrando..." : "Entrar"}
        </Btn>
      </form>
    </div>
  );
}

/* ============================================================
   TUTORIAL / INTRO — guía tipo onboarding de app
   ============================================================ */
const TUTORIAL_STEPS = [
  {
    icon: "sparkle",
    accent: C.tutorialViolet,
    title: "Bienvenido a tu Sistema Financiero",
    text: "Aquí juntas en un solo lugar la plata de Petnova (tu negocio) y tu plata personal. En menos de un minuto te explico cómo funciona todo.",
  },
  {
    icon: "hand",
    accent: C.tutorialBlue,
    title: "Deslizá para moverte",
    text: "Desliza el dedo hacia la izquierda o la derecha sobre el contenido para cambiar de sección — como en cualquier app. También puedes tocar las pestañas de arriba.",
  },
  {
    icon: "dashboard",
    accent: C.money,
    title: "Dashboard",
    text: "Tu panorama completo de un vistazo: cuánto entra en Petnova, cuánto te pagas a ti mismo, cuánto reinviertes, y cómo va tu ahorro personal del mes.",
  },
  {
    icon: "cat",
    accent: C.brand,
    title: "Petnova",
    text: "Registra los ingresos (en USD, Hotmart/ManyChat) y gastos operativos del negocio. La app convierte automáticamente a pesos usando tu tasa de cambio.",
  },
  {
    icon: "user",
    accent: C.tutorialBlue,
    title: "Personal",
    text: "Tu sueldo, otros ingresos y todos tus gastos personales por categoría. Aquí ves cuánto te queda de ahorro neto cada mes.",
  },
  {
    icon: "target",
    accent: C.brand,
    title: "Presupuesto",
    text: "Aplica la regla 50/30/20 (o la que tú definas) a tus ingresos, y sigue el avance de tu fondo de emergencia.",
  },
  {
    icon: "trophy",
    accent: C.tutorialViolet,
    title: "Metas",
    text: "Crea metas de ahorro — un viaje, un equipo nuevo — y llevas el registro de cuánto llevas ahorrado para cada una.",
  },
  {
    icon: "trend",
    accent: C.tutorialViolet,
    title: "Historial",
    text: "Cierra cada mes para guardar tu ahorro y patrimonio. Con eso la app te muestra una proyección de los próximos 6 meses.",
  },
  {
    icon: "settings",
    accent: C.textMuted,
    title: "Config",
    text: "Tu sueldo fijo, el umbral de gasto hormiga y la distribución de porcentajes. La tasa de cambio USD→COP se actualiza sola una vez al día — o cuando tú quieras con el botón de refrescar.",
  },
];

function Tutorial({ onFinish }) {
  const [step, setStep] = useState(0);
  const last = step === TUTORIAL_STEPS.length - 1;
  const s = TUTORIAL_STEPS[step];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: C.card,
          border: `1px solid ${C.borderStrong}`,
          borderRadius: 12,
          padding: "28px 24px 22px",
          position: "relative",
          fontFamily: FONT,
          color: C.text,
        }}
      >
        <button
          onClick={() => {
            onFinish();
          }}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "transparent",
            border: "none",
            color: C.textFaint,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          Saltar
        </button>

        <div>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: `${s.accent}18`,
              border: `1px solid ${s.accent}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: s.accent,
              marginBottom: 20,
            }}
          >
            <Icon name={s.icon} size={22} strokeWidth={2} />
          </div>

          <div style={{ fontSize: 19, fontFamily: FONT, fontWeight: 800, marginBottom: 10, letterSpacing: -0.2 }}>
            {s.title}
          </div>
          <div style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.55, marginBottom: 24 }}>{s.text}</div>

          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 22 }}>
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 16 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === step ? s.accent : "rgba(255,255,255,0.14)",
                  transition: "all 0.25s ease",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {step > 0 && (
              <Btn variant="ghost" onClick={() => setStep((v) => v - 1)} style={{ flex: "0 0 auto" }} icon="chevronLeft">
                Atrás
              </Btn>
            )}
            <Btn
              variant="primary"
              onClick={() => (last ? onFinish() : setStep((v) => v + 1))}
              style={{ flex: 1, justifyContent: "center" }}
            >
              {last ? "Entendido, vamos" : "Siguiente"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SPLASH INTRO — apertura animada minimalista (alineado PDF 1)
   ============================================================ */

function SplashIntro({ onDone }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => onDone(), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={onDone}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        cursor: "pointer",
        opacity: phase === 2 ? 0 : 1,
        transition: "opacity 0.4s ease",
      }}
    >
      <style>{`
        @keyframes splashDrift1 { 0% { transform: translate(-10%, -10%) scale(1); } 50% { transform: translate(6%, 4%) scale(1.15); } 100% { transform: translate(-10%, -10%) scale(1); } }
        @keyframes splashRing { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(2.6); opacity: 0; } }
        @keyframes splashPop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes splashFadeUp { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes splashBar { 0% { width: 0%; } 100% { width: 100%; } }
      `}</style>

      <div aria-hidden style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(151,220,34,0.1), transparent 70%)", filter: "blur(50px)", animation: "splashDrift1 10s ease-in-out infinite" }} />

      <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.brand}55`, animation: "splashRing 1.8s ease-out infinite" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.brand}55`, animation: "splashRing 1.8s ease-out 0.6s infinite" }} />
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: C.brandGradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 900,
            fontFamily: FONT,
            color: C.brandOn,
            animation: phase >= 1 ? "splashPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
            opacity: phase >= 1 ? 1 : 0,
            boxShadow: `0 16px 36px -14px rgba(151, 220, 34, 0.65)`,
          }}
        >
          $
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          fontSize: 21,
          fontFamily: FONT,
          fontWeight: 800,
          color: C.text,
          letterSpacing: -0.2,
          animation: phase >= 1 ? "splashFadeUp 0.5s ease 0.15s both" : "none",
          opacity: phase >= 1 ? 1 : 0,
        }}
      >
        Sistema Financiero
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 11.5,
          color: C.textFaint,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          fontWeight: 700,
          animation: phase >= 1 ? "splashFadeUp 0.5s ease 0.25s both" : "none",
          opacity: phase >= 1 ? 1 : 0,
        }}
      >
        Petnova · Personal
      </div>

      <div style={{ position: "absolute", bottom: 56, width: 160, height: 3, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", background: C.brandGradient, borderRadius: 4, animation: "splashBar 1.5s cubic-bezier(0.4,0,0.2,1) both" }} />
      </div>
    </div>
  );
}

/* ============================================================
   AUTH GATE — decide si muestra Login o la app
   ============================================================ */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ background: C.bg, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: FONT, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <div style={{ width: 26, height: 26, border: `2.5px solid ${C.border}`, borderTopColor: C.brand, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!session) return <Login />;

  return <AppInner user={session.user} />;
}

/* ============================================================
   APP (contenido real, ya logueado)
   ============================================================ */
function AppInner({ user }) {
  const { state, save, loaded, saving } = usePersistentState(user);
  const [tab, setTab] = useState("dashboard");
  const [showTutorial, setShowTutorial] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [tasaLoading, setTasaLoading] = useState(false);
  const [tasaError, setTasaError] = useState("");
  const dragState = useRef({ startX: 0, startY: 0, dragging: false, lockedAxis: null });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const tabBtnRefs = useRef({});
  const mountTimeRef = useRef(Date.now());

  const update = (patch) => save({ ...state, ...patch });

  useEffect(() => {
    const hardCap = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(hardCap);
  }, []);

  const refrescarTasa = async () => {
    setTasaLoading(true);
    setTasaError("");
    try {
      const nueva = await obtenerTasaCambioAutomatica();
      update({ config: { ...state.config, tasaRef: nueva, tasaAutoFecha: todayStr() } });
    } catch (e) {
      setTasaError("No se pudo actualizar. Intenta de nuevo o edítala a mano.");
    } finally {
      setTasaLoading(false);
    }
  };

  useEffect(() => {
    if (!loaded) return;
    if (state.config.tasaAutoFecha === todayStr()) return;
    refrescarTasa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (showTutorial) return;
    if (showSplash) return;
    if (!state.tutorialVisto) setShowTutorial(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, showSplash]);

  const calc = useMemo(() => {
    const totalIngresosPetnovaUSD = state.ingresosPetnova.reduce((s, i) => s + (Number(i.montoUsd) || 0), 0);
    const totalIngresosPetnovaLocal = state.ingresosPetnova.reduce((s, i) => s + (Number(i.montoUsd) || 0) * (Number(i.tasa) || 0), 0);
    const totalGastosPetnova = state.gastosPetnova.reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const utilidadAntesSueldo = totalIngresosPetnovaLocal - totalGastosPetnova;
    const sueldo = Number(state.config.sueldo) || 0;
    const reinversion = utilidadAntesSueldo - sueldo;

    const otrosIngresos = state.ingresosPersonalOtros.reduce((s, i) => s + (Number(i.monto) || 0), 0);
    const totalIngresosPersonal = sueldo + otrosIngresos;
    const totalGastosPersonal = state.gastosPersonal.reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const ahorroNeto = totalIngresosPersonal - totalGastosPersonal;

    const umbral = Number(state.config.umbralHormiga) || 0;
    const gastoHormiga = state.gastosPersonal.filter((g) => (Number(g.monto) || 0) < umbral).reduce((s, g) => s + (Number(g.monto) || 0), 0);

    const gastosPorTipo = { Necesidad: 0, Gusto: 0, Ahorro: 0 };
    state.gastosPersonal.forEach((g) => {
      const cat = CATS_PERSONAL.find((c) => c.name === g.categoria);
      if (cat) gastosPorTipo[cat.tipo] += Number(g.monto) || 0;
    });

    const metaNecesidad = totalIngresosPersonal * (Number(state.config.pctNecesidad) || 0);
    const metaGusto = totalIngresosPersonal * (Number(state.config.pctGusto) || 0);
    const metaAhorro = totalIngresosPersonal * (Number(state.config.pctAhorro) || 0);

    const gastosFijosNecesidad = gastosPorTipo.Necesidad;
    const metaFondoEmergencia = gastosFijosNecesidad * (Number(state.config.mesesFondo) || 0);
    const pctFondo = metaFondoEmergencia > 0 ? (state.fondoAhorrado || 0) / metaFondoEmergencia : 0;

    const ultimosMeses = state.historial.slice(-3);
    const promAhorro = ultimosMeses.length > 0 ? ultimosMeses.reduce((s, m) => s + (Number(m.ahorro) || 0), 0) / ultimosMeses.length : ahorroNeto;
    const patrimonioActual = state.historial.length > 0 ? Number(state.historial[state.historial.length - 1].patrimonio) || 0 : 0;
    const proyeccion = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i + 1);
      return { mes: d.toLocaleDateString("es-CO", { month: "short", year: "numeric" }), patrimonio: patrimonioActual + promAhorro * (i + 1) };
    });

    let salud = "info";
    let saludMsg = "Aún no hay datos suficientes este mes.";
    if (totalIngresosPersonal > 0) {
      if (ahorroNeto < 0) {
        salud = "excedido";
        saludMsg = "Estás gastando más de lo que entra. Revisa tu Presupuesto.";
      } else if (ahorroNeto / totalIngresosPersonal < (Number(state.config.pctAhorro) || 0)) {
        salud = "cerca";
        saludMsg = `Ahorrando menos de tu meta del ${pct(state.config.pctAhorro)}.`;
      } else {
        salud = "bien";
        saludMsg = "Vas bien — cumpliendo tu meta de ahorro.";
      }
    }

    return {
      totalIngresosPetnovaUSD, totalIngresosPetnovaLocal, totalGastosPetnova, utilidadAntesSueldo, sueldo, reinversion,
      otrosIngresos, totalIngresosPersonal, totalGastosPersonal, ahorroNeto, gastoHormiga, gastosPorTipo,
      metaNecesidad, metaGusto, metaAhorro, metaFondoEmergencia, pctFondo, promAhorro, proyeccion, salud, saludMsg,
    };
  }, [state]);

  if (!loaded) {
    return (
      <div style={{ background: C.bg, minHeight: 400, display: "flex", flexDirection: "column", gap: 14, alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: FONT, position: "relative", borderRadius: 12 }}>
        <div style={{ width: 26, height: 26, border: `2.5px solid ${C.border}`, borderTopColor: C.brand, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 13 }}>Cargando tu sistema financiero...</div>
        {showSplash && <SplashIntro onDone={() => setShowSplash(false)} />}
      </div>
    );
  }

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "petnova", label: "Petnova", icon: "cat" },
    { id: "personal", label: "Personal", icon: "user" },
    { id: "presupuesto", label: "Presupuesto", icon: "target" },
    { id: "metas", label: "Metas", icon: "trophy" },
    { id: "historial", label: "Historial", icon: "trend" },
    { id: "config", label: "Config", icon: "settings" },
  ];
  const activeIndex = Math.max(0, TABS.findIndex((t) => t.id === tab));

  const goToIndex = (idx) => {
    const clamped = Math.max(0, Math.min(TABS.length - 1, idx));
    setTab(TABS[clamped].id);
    const btn = tabBtnRefs.current[TABS[clamped].id];
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  const goToTab = (id) => goToIndex(TABS.findIndex((t) => t.id === id));

  const onPanelPointerDown = (e) => {
    const p = e.touches ? e.touches[0] : e;
    dragState.current = { startX: p.clientX, startY: p.clientY, dragging: true, lockedAxis: null };
    setIsDragging(true);
  };
  const onPanelPointerMove = (e) => {
    if (!dragState.current.dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - dragState.current.startX;
    const dy = p.clientY - dragState.current.startY;
    if (!dragState.current.lockedAxis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      dragState.current.lockedAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (dragState.current.lockedAxis === "x") {
      if (e.cancelable) e.preventDefault();
      setDragOffset(dx);
    }
  };
  const onPanelPointerUp = () => {
    if (!dragState.current.dragging) return;
    const dx = dragOffset;
    dragState.current.dragging = false;
    setIsDragging(false);
    setDragOffset(0);
    const threshold = 70;
    if (dx <= -threshold) goToIndex(activeIndex + 1);
    else if (dx >= threshold) goToIndex(activeIndex - 1);
  };

  const BOTTOM_NAV_IDS = ["dashboard", "petnova", "personal", "presupuesto"];
  const bottomNavTabs = TABS.filter((t) => BOTTOM_NAV_IDS.includes(t.id));
  const MENU_TAB_IDS = ["metas", "historial", "config"];
  const menuTabs = TABS.filter((t) => MENU_TAB_IDS.includes(t.id));
  const menuActive = MENU_TAB_IDS.includes(tab);

  return (
    <div
      style={{
        background: C.bg,
        minHeight: 600,
        fontFamily: FONT,
        color: C.text,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        position: "relative",
      }}
    >
      <style>{`
        .fin-container { max-width: 1160px; margin: 0 auto; width: 100%; box-sizing: border-box; }
        .fin-bottom-nav { display: none; }
        .fin-2col { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
        .fin-card:hover { border-color: ${C.borderStrong}; }
        .fin-tap { -webkit-tap-highlight-color: transparent; }
        .fin-tap:active { transform: scale(0.96); }
        .fin-navbtn:active { transform: scale(0.92); }
        .fin-sheetitem:active { background: ${C.cardHover}; }
        .fin-field[required]:not(:placeholder-shown):invalid { color: ${C.bad}; }
        .fin-field[required]:not(:placeholder-shown):valid:not(:focus) { color: ${C.money}; }
        @media (max-width: 899px) {
          .fin-bottom-nav { display: flex; }
          .fin-swipe-area { padding-bottom: 110px; }
          .fin-toptabs { display: none; }
          .fin-dots { display: none; }
        }
        @media (min-width: 900px) {
          .fin-2col { grid-template-columns: 336px 1fr; gap: 28px; }
        }
      `}</style>

      <div className="fin-container" style={{ padding: "0px 20px 0 20px", position: "relative" }}>

      <div
        className="fin-container fin-swipe-area"
        style={{ padding: "24px 0 110px 0", position: "relative", overflow: "hidden", touchAction: "pan-y" }}
        onTouchStart={onPanelPointerDown}
        onTouchMove={onPanelPointerMove}
        onTouchEnd={onPanelPointerUp}
      >
        <div
          style={{
            display: "flex",
            width: `${TABS.length * 100}%`,
            transform: `translateX(calc(${-activeIndex * (100 / TABS.length)}% + ${dragOffset}px))`,
            transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 20px 20px 20px", boxSizing: "border-box" }}>
            <Dashboard state={state} calc={calc} onNavigate={goToTab} onOpenMenu={() => setMenuOpen(true)} userName={user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'} onShowTutorial={() => setShowTutorial(true)} onSignOut={() => supabase.auth.signOut()} saving={saving} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 20px 20px 20px", boxSizing: "border-box" }}>
            <Petnova state={state} update={update} calc={calc} onOpenMenu={() => setMenuOpen(true)} userName={user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'} saving={saving} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 20px 20px 20px", boxSizing: "border-box" }}>
            <Personal state={state} update={update} calc={calc} onOpenMenu={() => setMenuOpen(true)} userName={user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario'} saving={saving} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 20px 20px 20px", boxSizing: "border-box" }}>
            <Presupuesto state={state} update={update} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 20px 20px 20px", boxSizing: "border-box" }}>
            <Metas state={state} update={update} calc={calc} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 20px 20px 20px", boxSizing: "border-box" }}>
            <Historial state={state} update={update} calc={calc} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 20px 20px 20px", boxSizing: "border-box" }}>
            <ConfigTab state={state} update={update} tasaLoading={tasaLoading} tasaError={tasaError} onRefreshTasa={refrescarTasa} />
          </div>
        </div>
      </div>

      <div className="fin-container fin-dots" style={{ display: "flex", justifyContent: "center", gap: 6, paddingBottom: 20 }}>
        {TABS.map((t, i) => (
          <div
            key={t.id}
            onClick={() => goToIndex(i)}
            style={{
              width: i === activeIndex ? 16 : 5,
              height: 5,
              borderRadius: 3,
              cursor: "pointer",
              background: i === activeIndex ? C.brand : "rgba(255,255,255,0.16)",
              transition: "all 0.25s ease",
            }}
          />
        ))}
      </div>

      <div
        className="fin-bottom-nav"
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          background: "rgba(25, 25, 28, 0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 40,
          height: 64,
          width: "85%",
          maxWidth: 400,
          zIndex: 999,
          padding: "0 8px",
          boxSizing: "border-box",
        }}
      >
        {bottomNavTabs.map((t) => {
          const active = tab === t.id && !menuOpen;
          const specificIcon =
            t.id === "dashboard" ? "homePentagon" :
            t.id === "petnova" ? "marketSwap" :
            t.id === "presupuesto" ? "pieChart" :
            t.id === "personal" ? "user" :
            t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setMenuOpen(false);
                goToTab(t.id);
              }}
              className="fin-navbtn"
              style={{
                background: "transparent",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: 0,
                cursor: "pointer",
                fontFamily: FONT,
                transition: "all 0.2s ease",
                borderRadius: 999,
                flex: 1,
                maxWidth: "25%",
                height: 52,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: active ? "#bd64f5" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s ease",
                }}
              >
                <Icon
                  name={specificIcon}
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  color={active ? "#ffffff" : "#9ca3af"}
                />
              </div>
            </button>
          );
        })}
      </div>

      </div>

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              background: C.card,
              border: `1px solid ${C.borderStrong}`,
              borderBottom: "none",
              borderRadius: "22px 22px 0 0",
              padding: "10px 10px calc(20px + env(safe-area-inset-bottom, 0px))",
              boxShadow: "0 -12px 32px -8px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 3, background: C.border, margin: "4px auto 14px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px 12px" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>Más opciones</span>
              <button onClick={() => setMenuOpen(false)} className="fin-tap" style={{ background: "transparent", border: "none", color: C.textFaint, padding: 4, display: "flex", cursor: "pointer" }}>
                <Icon name="x" size={18} strokeWidth={2} />
              </button>
            </div>
            {menuTabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    goToTab(t.id);
                    setMenuOpen(false);
                  }}
                  className="fin-tap fin-sheetitem"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "13px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 14,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: active ? "rgba(189,100,245,0.18)" : C.cardAlt,
                      color: active ? "#bd64f5" : C.textMuted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={t.icon} size={17} strokeWidth={1.9} />
                  </div>
                  <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: active ? "#bd64f5" : C.text }}>{t.label}</span>
                  <Icon name="chevronRight" size={16} strokeWidth={2} color={C.textFaint} />
                </button>
              );
            })}
            <div style={{ margin: "10px 0", height: 1, background: C.divider }} />
            <button
              onClick={() => {
                setShowTutorial(true);
                setMenuOpen(false);
              }}
              className="fin-tap fin-sheetitem"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "13px 10px",
                background: "transparent",
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: C.cardAlt,
                  color: C.textMuted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="help" size={17} strokeWidth={1.9} />
              </div>
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: C.text }}>Ver tutorial</span>
              <Icon name="chevronRight" size={16} strokeWidth={2} color={C.textFaint} />
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="fin-tap fin-sheetitem"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 13,
                padding: "13px 10px",
                background: "transparent",
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: C.badBg,
                  color: C.bad,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="logout" size={17} strokeWidth={1.9} />
              </div>
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: C.bad }}>Cerrar Sesión</span>
              <Icon name="chevronRight" size={16} strokeWidth={2} color={C.textFaint} />
            </button>
          </div>
        </div>
      )}

      {showTutorial && (
        <Tutorial
          onFinish={() => {
            setShowTutorial(false);
            if (!state.tutorialVisto) update({ tutorialVisto: true });
          }}
        />
      )}
      {showSplash && <SplashIntro onDone={() => setShowSplash(false)} />}
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ state, calc, onNavigate, onOpenMenu, userName, onShowTutorial, onSignOut, saving }) {
  const ahorroColor = calc.ahorroNeto >= 0 ? C.money : C.bad;
  const ahorroPct = calc.totalIngresosPersonal > 0 ? (calc.ahorroNeto / calc.totalIngresosPersonal) * 100 : 0;
  const pctSign = ahorroPct >= 0 ? "+" : "";

  const statCards = [
    {
      label: "Petnova · Ingresos",
      value: fmt(calc.totalIngresosPetnovaLocal),
      icon: "cat",
      accent: C.brand,
      sub: `Sueldo: ${fmt(calc.sueldo)}`,
      onClick: () => onNavigate("petnova"),
    },
    {
      label: "Personal · Ingresos",
      value: fmt(calc.totalIngresosPersonal),
      icon: "user",
      accent: C.tutorialBlue,
      sub: `Gastos: ${fmt(calc.totalGastosPersonal)}`,
      onClick: () => onNavigate("personal"),
    },
    {
      label: "Reinversión",
      value: fmt(calc.reinversion),
      icon: "trend",
      accent: calc.reinversion >= 0 ? C.money : C.bad,
      sub: calc.reinversion >= 0 ? "En el negocio" : "Déficit",
      onClick: () => onNavigate("petnova"),
    },
    {
      label: "Gasto hormiga",
      value: fmt(calc.gastoHormiga),
      icon: "ant",
      accent: C.warn,
      sub: `Umbral: ${fmt(Number(state.config.umbralHormiga) || 0)}`,
      onClick: () => onNavigate("personal"),
    },
  ];

  const [visible, setVisible] = useState(true);
  const percentUp = calc.ahorroNeto >= 0;
  const percentValue = ahorroPct !== 0 ? `${pctSign}${Math.round(ahorroPct * 10) / 10}%` : null;

  return (
    <div style={{ paddingBottom: "120px" }}>
      {/* 1. HERO SECTION — Saldo total centrado */}
      <div style={{ textAlign: "center", marginBottom: 32, paddingTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <button
            onClick={onOpenMenu}
            className="fin-tap"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="menu" size={20} strokeWidth={1.8} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: -0.3 }}>
            <span>Wallet de {userName}</span>
            <Icon name="chevronDown" size={16} strokeWidth={2} color="#9ca3af" />
          </div>
          <button
            className="fin-tap"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="bell" size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
          Saldo Total
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
            color: "#ffffff",
            fontFamily: FONT,
            fontVariantNumeric: "tabular-nums",
            wordBreak: "break-word",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span>{visible ? fmt(calc.ahorroNeto) : "$ ••••••"}</span>
          <button
            onClick={() => setVisible((v) => !v)}
            title={visible ? "Ocultar monto" : "Mostrar monto"}
            className="fin-tap"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <Icon name={visible ? "eye" : "eyeOff"} size={14} strokeWidth={1.8} />
          </button>
        </div>

        {percentValue && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 999,
              background: percentUp
                ? "rgba(189, 100, 245, 0.15)"
                : "rgba(245, 50, 34, 0.15)",
              border: `1px solid ${percentUp ? "rgba(189,100,245,0.3)" : "rgba(245,50,34,0.3)"}`,
            }}
          >
            <Icon
              name={percentUp ? "arrowUp" : "arrowDown"}
              size={11}
              strokeWidth={2.8}
              color={percentUp ? "#bd64f5" : "#F53222"}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: percentUp ? "#bd64f5" : "#F53222",
                fontFamily: FONT,
                letterSpacing: 0.2,
              }}
            >
              {percentValue}
            </span>
            <span style={{ fontSize: 11.5, color: "#9ca3af", marginLeft: 2 }}>vs ingresos</span>
          </div>
        )}
      </div>

      {/* 2. BOTONES DE ACCIÓN RÁPIDA */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 32,
          marginBottom: 36,
          padding: "0 10px",
        }}
      >
        {[
          { label: "Gasto", icon: "arrowDown", onClick: () => onNavigate("personal"), color: "#ffffff" },
          { label: "Ingreso", icon: "arrowUp", onClick: () => onNavigate("personal"), color: "#ffffff" },
          { label: "Cerrar Mes", icon: "swapHoriz", onClick: () => onNavigate("historial"), color: "#ffffff" },
        ].map((it) => (
          <button
            key={it.label}
            onClick={it.onClick}
            className="fin-tap"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              minWidth: 64,
              fontFamily: FONT,
              padding: 0,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "#222222",
                border: "1px solid rgba(255,255,255,0.06)",
                color: it.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.15s ease",
              }}
            >
              <Icon name={it.icon} size={20} strokeWidth={2.0} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af", letterSpacing: 0.2 }}>{it.label}</span>
          </button>
        ))}
      </div>

      {/* 3. SECCIÓN YOUR ASSETS */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: -0.3 }}>
            Your Assets
          </div>
          <button
            onClick={() => onNavigate("presupuesto")}
            className="fin-tap"
            style={{
              background: "transparent",
              border: "none",
              color: "#bd64f5",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT,
              padding: 0,
            }}
          >
            See All
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {statCards.map((s) => (
            <button
              key={s.label}
              onClick={s.onClick}
              className="fin-tap"
              style={{
                background: "#1c1c1e",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: "18px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: FONT,
                transition: "transform 0.15s ease",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 120,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `${s.accent}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: s.accent,
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={s.icon} size={15} strokeWidth={2} />
                  </div>
                  <div style={{ fontSize: 13.5, color: "#ffffff", fontWeight: 700, lineHeight: 1.2 }}>
                    {s.label.split(" · ")[0]}
                  </div>
                </div>
                <Icon name="chevronRight" size={14} strokeWidth={2} color="#4B4B4B" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#ffffff",
                    fontFamily: FONT,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: -0.3,
                    lineHeight: 1.1,
                    marginBottom: 4,
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                  {s.sub}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. SECCIONES ADICIONALES (mismo estilo glass/dark) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Distribución 50 / 30 / 20</div>
            <Btn variant="text" onClick={() => onNavigate("presupuesto")}>Ver todo</Btn>
          </div>
          <div style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "18px 16px" }}>
            {["Necesidad", "Gusto", "Ahorro"].map((tipo, idx) => {
              const val = calc.gastosPorTipo[tipo];
              const meta = tipo === "Necesidad" ? calc.metaNecesidad : tipo === "Gusto" ? calc.metaGusto : calc.metaAhorro;
              const p = meta > 0 ? val / meta : 0;
              const color = p > 1 ? C.bad : p > 0.85 ? "#bd64f5" : C.money;
              const icon = tipo === "Necesidad" ? "home" : tipo === "Gusto" ? "sparkle" : "target";
              const pctOf = tipo === "Necesidad" ? state.config.pctNecesidad : tipo === "Gusto" ? state.config.pctGusto : state.config.pctAhorro;
              return (
                <div key={tipo} style={{ marginBottom: idx < 2 ? 18 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: `${color}22`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color,
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={icon} size={15} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <span style={{ fontSize: 13.5, color: "#ffffff", fontWeight: 700 }}>{tipo}</span>
                        <span style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 700, letterSpacing: 0.3 }}>
                          {pct(pctOf)} ideal
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                        {fmt(val)} <span style={{ color: "#4B4B4B" }}>·</span> <span style={{ color: "#9ca3af" }}>meta {fmt(meta)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ paddingLeft: 42 }}>
                    <Meter pctValue={p} color={color} height={7} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Petnova · Negocio</div>
              <Btn variant="text" onClick={() => onNavigate("petnova")}>Ver todo</Btn>
            </div>
            <div style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "8px 16px" }}>
              <Row label="Ingresos del mes" value={fmt(calc.totalIngresosPetnovaLocal)} color={C.money} />
              <Row label="Tu sueldo (Pay Yourself First)" value={fmt(calc.sueldo)} />
              <Row label="Reinversión en el negocio" value={fmt(calc.reinversion)} color={calc.reinversion >= 0 ? C.money : C.bad} last />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Personal · Tu dinero</div>
              <Btn variant="text" onClick={() => onNavigate("personal")}>Ver todo</Btn>
            </div>
            <div style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "8px 16px" }}>
              <Row label="Ingresos personales" value={fmt(calc.totalIngresosPersonal)} color={C.money} />
              <Row label="Gastos personales" value={fmt(calc.totalGastosPersonal)} color={C.bad} />
              <Row label="Gasto hormiga detectado" value={fmt(calc.gastoHormiga)} last />
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#ffffff" }}>Metas y futuro</div>
              <Btn variant="text" onClick={() => onNavigate("metas")}>Ver todo</Btn>
            </div>
            <div style={{ background: "#1c1c1e", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "12px 0", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: C.moneyBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: C.money,
                    }}
                  >
                    <Icon name="lock" size={16} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, color: "#ffffff", fontWeight: 700 }}>Fondo de emergencia</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      Meta: {state.config.mesesFondo} meses · {fmt(calc.metaFondo)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.money, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                    {pct(calc.pctFondo)}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
                    {fmt(state.fondoAhorrado || 0)} ahorrados
                  </div>
                </div>
              </div>
              <div style={{ paddingLeft: 46, paddingTop: 12, paddingBottom: 4 }}>
                <Meter pctValue={Math.min(calc.pctFondo, 1)} color={C.money} height={8} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 0 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: C.brandBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#bd64f5",
                    }}
                  >
                    <Icon name="trophy" size={16} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, color: "#ffffff", fontWeight: 700 }}>Proyección a 6 meses</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                      Patrimonio estimado
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#bd64f5", fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                    {fmt(calc.proyeccion[5]?.patrimonio || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PETNOVA
   ============================================================ */
function Petnova({ state, update, calc, onOpenMenu, userName, saving }) {
  const addIngreso = () => update({ ingresosPetnova: [...state.ingresosPetnova, { id: uid(), fecha: todayStr(), concepto: "", montoUsd: "", tasa: state.config.tasaRef }] });
  const updIngreso = (id, patch) => update({ ingresosPetnova: state.ingresosPetnova.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const delIngreso = (id) => update({ ingresosPetnova: state.ingresosPetnova.filter((i) => i.id !== id) });

  const addGasto = () => update({ gastosPetnova: [...state.gastosPetnova, { id: uid(), fecha: todayStr(), categoria: "", concepto: "", monto: "" }] });
  const updGasto = (id, patch) => update({ gastosPetnova: state.gastosPetnova.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const delGasto = (id) => update({ gastosPetnova: state.gastosPetnova.filter((g) => g.id !== id) });

  const [visible, setVisible] = useState(true);
  const totalIngresos = Number(calc.totalIngresosPetnovaLocal) || 0;
  const totalGastos = Number(calc.totalGastosPetnova) || 0;
  const saldoDisponible = totalIngresos - totalGastos;
  const sueldoMonto = Number(calc.sueldo) || 0;
  const reinversionMonto = Number(calc.reinversion) || 0;
  const operacionMonto = totalGastos;

  const denominador = (sueldoMonto + reinversionMonto + operacionMonto) || totalIngresos || 1;
  const pctSueldo = sueldoMonto / denominador;
  const pctReinv = reinversionMonto / denominador;
  const pctOper = operacionMonto / denominador;

  const deltaMonto = saldoDisponible;
  const deltaPct = totalIngresos > 0 ? (saldoDisponible / totalIngresos) * 100 : 0;
  const deltaUp = deltaMonto >= 0;

  const nIngresos = state.ingresosPetnova.length;
  const nGastos = state.gastosPetnova.length;

  const actividad = [
    ...state.ingresosPetnova.map((i) => ({
      ...i,
      _tipo: "ingreso",
      _monto: (Number(i.montoUsd) || 0) * (Number(i.tasa) || 0),
      _sort: i.fecha || "",
    })),
    ...state.gastosPetnova.map((g) => ({
      ...g,
      _tipo: "gasto",
      _monto: Number(g.monto) || 0,
      _sort: g.fecha || "",
    })),
  ]
    .sort((a, b) => (b._sort || "").localeCompare(a._sort || ""))
    .slice(0, 6);

  return (
    <div style={{ paddingBottom: "120px" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 28, paddingTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button
            onClick={onOpenMenu}
            className="fin-tap"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="menu" size={20} strokeWidth={1.8} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(189,100,245,0.18)",
                border: "1px solid rgba(189,100,245,0.25)",
                color: "#bd64f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="cat" size={18} strokeWidth={1.8} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: -0.3 }}>
                <span>Petnova</span>
                <Icon name="chevronDown" size={15} strokeWidth={2} color="#9ca3af" />
              </div>
              <div style={{ fontSize: 12.5, color: "#9ca3af", marginTop: 2 }}>Finanzas del Negocio</div>
            </div>
          </div>
          <button
            className="fin-tap"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="bell" size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* TARJETA SALDO DISPONIBLE */}
      <div
        style={{
          background: "#1C1D21",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 22,
          padding: "22px 20px",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14.5, color: "#9ca3af", fontWeight: 600, letterSpacing: 0.2 }}>Saldo disponible</span>
            <button
              onClick={() => setVisible((v) => !v)}
              className="fin-tap"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <Icon name={visible ? "eye" : "eyeOff"} size={16} strokeWidth={1.8} />
            </button>
          </div>
          <button
            className="fin-tap"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 999,
            }}
          >
            <span>Este mes</span>
            <Icon name="chevronDown" size={12} strokeWidth={2} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: -1.8,
              lineHeight: 1,
              color: "#ffffff",
              fontFamily: FONT,
              fontVariantNumeric: "tabular-nums",
              wordBreak: "break-word",
            }}
          >
            {visible ? `$ ${fmt(saldoDisponible).replace("$", "").trim()}` : "$ ••••••"}
          </div>
        </div>

        {deltaMonto !== 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 999,
              background: "rgba(189, 100, 245, 0.15)",
              border: "1px solid rgba(189,100,245,0.3)",
              marginBottom: 22,
            }}
          >
            <Icon
              name={deltaUp ? "arrowUp" : "arrowDown"}
              size={10.5}
              strokeWidth={2.8}
              color="#bd64f5"
            />
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#bd64f5",
                fontFamily: FONT,
                letterSpacing: 0.2,
              }}
            >
              {deltaUp ? "+" : "-"} {fmt(Math.abs(deltaMonto))}
            </span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#bd64f5",
                fontFamily: FONT,
                letterSpacing: 0.2,
              }}
            >
              ▲ {Math.round(deltaPct * 100) / 100}%
            </span>
          </div>
        )}

        {/* Ingresos vs Gastos + gráfico */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#52D377" }} />
              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>Ingresos</span>
            </div>
            <div
              style={{
                fontSize: 23,
                fontWeight: 800,
                color: "#ffffff",
                fontFamily: FONT,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              {fmt(totalIngresos)}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{nIngresos} operaciones</div>
          </div>
          <div
            style={{
              width: 1,
              background: "rgba(255,255,255,0.06)",
              margin: "6px 0",
              alignSelf: "stretch",
            }}
          />
          <div style={{ flex: 1, minWidth: 0, paddingLeft: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F53222" }} />
              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>Gastos</span>
            </div>
            <div
              style={{
                fontSize: 23,
                fontWeight: 800,
                color: "#ffffff",
                fontFamily: FONT,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              {fmt(totalGastos)}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{nGastos} operaciones</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 14, minWidth: 68 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(189,100,245,0.15)",
                border: "1px solid rgba(189,100,245,0.22)",
                color: "#bd64f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="pieChart" size={24} strokeWidth={2.0} />
            </div>
          </div>
        </div>
      </div>

      {/* DISTRIBUCIÓN PAY YOURSELF FIRST */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", letterSpacing: -0.2 }}>Distribución Pay Yourself First</span>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#9ca3af",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="help" size={11} strokeWidth={1.8} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
          {[
            {
              label: "Tu sueldo",
              pct: pctSueldo,
              monto: sueldoMonto,
              icon: "user",
              tag: "Transferido",
              tagColor: "#52D377",
              tagBg: "rgba(82,211,119,0.12)",
            },
            {
              label: "Reinversión",
              pct: pctReinv,
              monto: reinversionMonto,
              icon: "trend",
              tag: "En la empresa",
              tagColor: "#bd64f5",
              tagBg: "rgba(189,100,245,0.12)",
            },
            {
              label: "Operación",
              pct: pctOper,
              monto: operacionMonto,
              icon: "portfolio",
              tag: "Gastos operativos",
              tagColor: "#3DB6F2",
              tagBg: "rgba(61,182,242,0.12)",
            },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                background: "#1C1D21",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 20,
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 144,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    background: "rgba(189,100,245,0.15)",
                    border: "1px solid rgba(189,100,245,0.22)",
                    color: "#bd64f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={c.icon} size={17} strokeWidth={1.9} />
                </div>
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 13.5, color: "#ffffff", fontWeight: 700 }}>{c.label}</div>
                  <div style={{ fontSize: 15.5, color: "#bd64f5", fontWeight: 800, marginTop: 3, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                    {Math.round(c.pct * 100)}%
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#ffffff",
                  fontFamily: FONT,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: -0.2,
                  lineHeight: 1.1,
                }}
              >
                {fmt(c.monto)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: c.tagBg,
                    border: `1px solid ${c.tagColor}55`,
                    color: c.tagColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="check" size={9} strokeWidth={3} />
                </div>
                <span style={{ fontSize: 11.5, color: "#9ca3af", fontWeight: 600 }}>{c.tag}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Barra segmentada */}
        <div
          style={{
            display: "flex",
            gap: 4,
            height: 10,
            borderRadius: 999,
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              flex: Math.max(0.01, pctSueldo),
              background: "linear-gradient(90deg, #bd64f5, #9c3fe0)",
              borderRadius: 999,
              minWidth: 20,
            }}
          />
          <div
            style={{
              flex: Math.max(0.01, pctReinv),
              background: "linear-gradient(90deg, #9c3fe0, #8230c2)",
              borderRadius: 999,
              minWidth: 20,
            }}
          />
          <div
            style={{
              flex: Math.max(0.01, pctOper),
              background: "linear-gradient(90deg, #bd64f5, #d796ff)",
              borderRadius: 999,
              minWidth: 20,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", gap: 8 }}>
          {[
            { p: pctSueldo, c: "#bd64f5" },
            { p: pctReinv, c: "#9c3fe0" },
            { p: pctOper, c: "#d796ff" },
          ].map((it, idx) => (
            <div
              key={idx}
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: it.c,
                fontFamily: FONT,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {Math.round(it.p * 100)}%
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", letterSpacing: -0.2 }}>Actividad reciente</div>
          <button
            onClick={() => {}}
            className="fin-tap"
            style={{
              background: "transparent",
              border: "none",
              color: "#bd64f5",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT,
              padding: 0,
              textDecoration: "underline",
              textDecorationColor: "rgba(189,100,245,0.5)",
              textUnderlineOffset: 3,
            }}
          >
            Ver todas
          </button>
        </div>

        <div
          style={{
            background: "#1C1D21",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: "10px 14px",
          }}
        >
          {actividad.length === 0 && (
            <div style={{ padding: "20px 4px", textAlign: "center" }}>
              <EmptyState text="No hay actividad registrada todavía." icon="cat" />
            </div>
          )}
          {state.ingresosPetnova.length > 0 && (
            <div style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
              <GroupLabel style={{ marginTop: 12, marginBottom: 8 }}>Ingresos</GroupLabel>
              {state.ingresosPetnova.map((i, idx) => (
                <TxRow
                  key={i.id}
                  icon="arrowDown"
                  iconColor="#52D377"
                  last={idx === state.ingresosPetnova.length - 1 && state.gastosPetnova.length === 0}
                  onDelete={() => delIngreso(i.id)}
                  primary={
                    <Field
                      placeholder="Concepto (ej: Consulta Veterinaria)"
                      value={i.concepto}
                      onChange={(v) => updIngreso(i.id, { concepto: v })}
                      style={txPrimaryStyle}
                    />
                  }
                  meta={
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#52D377", fontWeight: 700 }}>Ingreso</span>
                      <span style={{ fontSize: 10.5, color: "#4B4B4B" }}>·</span>
                      <Field type="date" value={i.fecha} onChange={(v) => updIngreso(i.id, { fecha: v })} style={{ ...txMetaStyle, width: "auto", padding: "2px 0" }} />
                    </div>
                  }
                  amount={
                    <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#52D377",
                          fontFamily: FONT,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        + {fmt((Number(i.montoUsd) || 0) * (Number(i.tasa) || 0))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, marginTop: 2, flexWrap: "wrap" }}>
                        <Field type="number" placeholder="USD" value={i.montoUsd} onChange={(v) => updIngreso(i.id, { montoUsd: v })} style={{ ...txMetaStyle, width: 58, textAlign: "right" }} />
                        <span style={{ color: "#4B4B4B", fontSize: 10 }}>·</span>
                        <Field type="number" placeholder="Tasa" value={i.tasa} onChange={(v) => updIngreso(i.id, { tasa: v })} style={{ ...txMetaStyle, width: 62, textAlign: "right" }} />
                      </div>
                    </div>
                  }
                  amountColor="#52D377"
                />
              ))}
            </div>
          )}
          {state.gastosPetnova.length > 0 && (
            <div>
              <GroupLabel style={{ marginTop: 12, marginBottom: 8 }}>Gastos operativos</GroupLabel>
              {state.gastosPetnova.map((g, idx) => (
                <TxRow
                  key={g.id}
                  icon="arrowUp"
                  iconColor="#F53222"
                  last={idx === state.gastosPetnova.length - 1}
                  onDelete={() => delGasto(g.id)}
                  primary={<Field placeholder="Concepto (ej: Alquiler Local)" value={g.concepto} onChange={(v) => updGasto(g.id, { concepto: v })} style={txPrimaryStyle} />}
                  meta={
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "#F53222", fontWeight: 700 }}>Gasto</span>
                      <span style={{ fontSize: 10.5, color: "#4B4B4B" }}>·</span>
                      <Field type="date" value={g.fecha} onChange={(v) => updGasto(g.id, { fecha: v })} style={{ ...txMetaStyle, width: "auto", padding: "2px 0" }} />
                      <span style={{ fontSize: 10.5, color: "#4B4B4B" }}>·</span>
                      <Dropdown value={g.categoria} onChange={(v) => updGasto(g.id, { categoria: v })} options={CATS_NEGOCIO} style={{ ...txMetaStyle, flex: 1, minWidth: 100 }} />
                    </div>
                  }
                  amount={
                    <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#F53222",
                          fontFamily: FONT,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        - {fmt(Number(g.monto) || 0)}
                      </div>
                      <div style={{ marginTop: 2, display: "flex", justifyContent: "flex-end" }}>
                        <Field type="number" placeholder="Monto" value={g.monto} onChange={(v) => updGasto(g.id, { monto: v })} style={{ ...txAmountStyle, width: 110 }} />
                      </div>
                    </div>
                  }
                  amountColor="#F53222"
                />
              ))}
            </div>
          )}

          {/* Totales ingresos/gastos al pie */}
          {(state.ingresosPetnova.length > 0 || state.gastosPetnova.length > 0) && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                marginTop: 16,
                paddingTop: 14,
                borderTop: `1px solid rgba(255,255,255,0.05)`,
                fontSize: 12,
                fontFamily: FONT,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#9ca3af", fontWeight: 500, marginBottom: 4 }}>
                  Ingresos · {fmtUsd(calc.totalIngresosPetnovaUSD)}
                </div>
                <div style={{ color: "#52D377", fontWeight: 800, fontSize: 14 }}>
                  {fmt(calc.totalIngresosPetnovaLocal)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#9ca3af", fontWeight: 500, marginBottom: 4 }}>Gastos operativos</div>
                <div style={{ color: "#F53222", fontWeight: 800, fontSize: 14 }}>
                  {fmt(calc.totalGastosPetnova)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RESUMEN DEL NEGOCIO */}
      <div style={{ marginBottom: 22 }}>
        <button
          onClick={() => {}}
          className="fin-tap"
          style={{
            width: "100%",
            background: "#1C1D21",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: "16px 18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: FONT,
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #bd64f5 0%, #9c3fe0 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="pieChart" size={20} strokeWidth={2.0} />
          </div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>Resumen del negocio</div>
            <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Análisis completo y métricas</div>
          </div>
          <div style={{ color: "#bd64f5", display: "flex", alignItems: "center" }}>
            <Icon name="chevronRight" size={20} strokeWidth={2.0} />
          </div>
        </button>
      </div>

      {/* BOTONES ACCIÓN RÁPIDA INFERIORES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <button
          onClick={addIngreso}
          className="fin-tap"
          style={{
            background: "#1C1D21",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: FONT,
            color: "#ffffff",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 15.5, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" size={17} strokeWidth={2.2} />
            Ingreso
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #bd64f5 0%, #9c3fe0 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="arrowDown" size={17} strokeWidth={2.0} />
          </div>
        </button>
        <button
          onClick={addGasto}
          className="fin-tap"
          style={{
            background: "#1C1D21",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: FONT,
            color: "#ffffff",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 15.5, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" size={17} strokeWidth={2.2} />
            Gasto
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #bd64f5 0%, #9c3fe0 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="arrowUp" size={17} strokeWidth={2.0} />
          </div>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PERSONAL
   ============================================================ */
function Personal({ state, update, calc, onOpenMenu, userName, saving }) {
  const addOtroIngreso = () => update({ ingresosPersonalOtros: [...state.ingresosPersonalOtros, { id: uid(), concepto: "", monto: "" }] });
  const updOtroIngreso = (id, patch) => update({ ingresosPersonalOtros: state.ingresosPersonalOtros.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const delOtroIngreso = (id) => update({ ingresosPersonalOtros: state.ingresosPersonalOtros.filter((i) => i.id !== id) });

  const addGasto = () => update({ gastosPersonal: [...state.gastosPersonal, { id: uid(), fecha: todayStr(), categoria: "", concepto: "", monto: "" }] });
  const updGasto = (id, patch) => update({ gastosPersonal: state.gastosPersonal.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const delGasto = (id) => update({ gastosPersonal: state.gastosPersonal.filter((g) => g.id !== id) });
  const umbral = Number(state.config.umbralHormiga) || 0;

  const [visible, setVisible] = useState(true);
  const totalIngresos = Number(calc.totalIngresosPersonal) || 0;
  const totalGastos = Number(calc.totalGastosPersonal) || 0;
  const saldoDisponible = totalIngresos - totalGastos;
  const nIngresos = state.ingresosPersonalOtros.length + 1; // +1 por el sueldo calculado de Petnova
  const nGastos = state.gastosPersonal.length;

  const deltaMonto = saldoDisponible;
  const deltaPct = totalIngresos > 0 ? (saldoDisponible / totalIngresos) * 100 : 0;
  const deltaUp = deltaMonto >= 0;

  const gastoHormiga = Number(calc.gastoHormiga) || 0;
  const gastosHormiga = state.gastosPersonal.filter((g) => (Number(g.monto) || 0) < umbral && (Number(g.monto) || 0) > 0);
  const nHormiga = gastosHormiga.length;

  const totalGastosPorTipo = (calc.gastosPorTipo.Necesidad || 0) + (calc.gastosPorTipo.Gusto || 0) + (calc.gastosPorTipo.Ahorro || 0) || 1;
  const pctNec = calc.gastosPorTipo.Necesidad / totalGastosPorTipo;
  const pctGus = calc.gastosPorTipo.Gusto / totalGastosPorTipo;
  const pctAho = calc.gastosPorTipo.Ahorro / totalGastosPorTipo;

  const nNecesidad = state.gastosPersonal.filter((g) => (CATS_PERSONAL.find((c) => c.name === g.categoria)?.tipo) === "Necesidad").length;
  const nGusto = state.gastosPersonal.filter((g) => (CATS_PERSONAL.find((c) => c.name === g.categoria)?.tipo) === "Gusto").length;
  const nAhorro = state.gastosPersonal.filter((g) => (CATS_PERSONAL.find((c) => c.name === g.categoria)?.tipo) === "Ahorro").length;

  return (
    <div style={{ paddingBottom: "120px" }}>
      {/* HEADER */}
      <div style={{ marginBottom: 28, paddingTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button
            onClick={onOpenMenu}
            className="fin-tap"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="menu" size={20} strokeWidth={1.8} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(189,100,245,0.18)",
                border: "1px solid rgba(189,100,245,0.25)",
                color: "#bd64f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="user" size={18} strokeWidth={1.8} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: -0.3 }}>
                <span>Personal</span>
                <Icon name="chevronDown" size={15} strokeWidth={2} color="#9ca3af" />
              </div>
              <div style={{ fontSize: 12.5, color: "#9ca3af", marginTop: 2 }}>Finanzas Personales</div>
            </div>
          </div>
          <button
            className="fin-tap"
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="bell" size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* TARJETA SALDO DISPONIBLE */}
      <div
        style={{
          background: "#1C1D21",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 22,
          padding: "22px 20px",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14.5, color: "#9ca3af", fontWeight: 600, letterSpacing: 0.2 }}>Saldo disponible</span>
            <button
              onClick={() => setVisible((v) => !v)}
              className="fin-tap"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "transparent",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <Icon name={visible ? "eye" : "eyeOff"} size={16} strokeWidth={1.8} />
            </button>
          </div>
          <button
            className="fin-tap"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 999,
            }}
          >
            <span>Este mes</span>
            <Icon name="chevronDown" size={12} strokeWidth={2} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              letterSpacing: -1.8,
              lineHeight: 1,
              color: "#ffffff",
              fontFamily: FONT,
              fontVariantNumeric: "tabular-nums",
              wordBreak: "break-word",
            }}
          >
            {visible ? `$ ${fmt(saldoDisponible).replace("$", "").trim()}` : "$ ••••••"}
          </div>
        </div>

        {deltaMonto !== 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              borderRadius: 999,
              background: "rgba(189, 100, 245, 0.15)",
              border: "1px solid rgba(189,100,245,0.3)",
              marginBottom: 22,
            }}
          >
            <Icon
              name={deltaUp ? "arrowUp" : "arrowDown"}
              size={10.5}
              strokeWidth={2.8}
              color="#bd64f5"
            />
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#bd64f5",
                fontFamily: FONT,
                letterSpacing: 0.2,
              }}
            >
              {deltaUp ? "+" : "-"} {fmt(Math.abs(deltaMonto))}
            </span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: "#bd64f5",
                fontFamily: FONT,
                letterSpacing: 0.2,
              }}
            >
              ▲ {Math.round(deltaPct * 100) / 100}%
            </span>
          </div>
        )}

        {/* Ingresos vs Gastos + gráfico */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#52D377" }} />
              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>Ingresos</span>
            </div>
            <div
              style={{
                fontSize: 23,
                fontWeight: 800,
                color: "#ffffff",
                fontFamily: FONT,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              {fmt(totalIngresos)}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{nIngresos} operaciones</div>
          </div>
          <div
            style={{
              width: 1,
              background: "rgba(255,255,255,0.06)",
              margin: "6px 0",
              alignSelf: "stretch",
            }}
          />
          <div style={{ flex: 1, minWidth: 0, paddingLeft: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#F53222" }} />
              <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 600 }}>Gastos</span>
            </div>
            <div
              style={{
                fontSize: 23,
                fontWeight: 800,
                color: "#ffffff",
                fontFamily: FONT,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              {fmt(totalGastos)}
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{nGastos} operaciones</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingLeft: 14, minWidth: 68 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(189,100,245,0.15)",
                border: "1px solid rgba(189,100,245,0.22)",
                color: "#bd64f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="pieChart" size={24} strokeWidth={2.0} />
            </div>
          </div>
        </div>
      </div>

      {/* CLASIFICACIÓN DE GASTOS (50/30/20) */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", letterSpacing: -0.2 }}>Clasificación de gastos</span>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="help" size={11} strokeWidth={1.8} />
            </div>
          </div>
          <button
            className="fin-tap"
            style={{
              background: "transparent",
              border: "none",
              color: "#bd64f5",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT,
              padding: 0,
              textDecoration: "underline",
              textDecorationColor: "rgba(189,100,245,0.5)",
              textUnderlineOffset: 3,
            }}
          >
            Ver detalle
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            {
              label: "Necesidad",
              pct: pctNec,
              monto: calc.gastosPorTipo.Necesidad || 0,
              n: nNecesidad,
              icon: "target",
              color: "#52D377",
              bgIcon: "rgba(82,211,119,0.14)",
              borderIcon: "rgba(82,211,119,0.28)",
              gradientBar: "linear-gradient(90deg, #52D377 0%, #34a85b 100%)",
            },
            {
              label: "Gusto",
              pct: pctGus,
              monto: calc.gastosPorTipo.Gusto || 0,
              n: nGusto,
              icon: "sparkle",
              color: "#bd64f5",
              bgIcon: "rgba(189,100,245,0.14)",
              borderIcon: "rgba(189,100,245,0.28)",
              gradientBar: "linear-gradient(90deg, #bd64f5 0%, #9c3fe0 100%)",
            },
            {
              label: "Ahorro",
              pct: pctAho,
              monto: calc.gastosPorTipo.Ahorro || 0,
              n: nAhorro,
              icon: "trophy",
              color: "#F5A822",
              bgIcon: "rgba(245,168,34,0.14)",
              borderIcon: "rgba(245,168,34,0.28)",
              gradientBar: "linear-gradient(90deg, #F5A822 0%, #D88A00 100%)",
            },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                background: "#1C1D21",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 20,
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 154,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    background: c.bgIcon,
                    border: `1px solid ${c.borderIcon}`,
                    color: c.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={c.icon} size={17} strokeWidth={1.9} />
                </div>
                <div style={{ lineHeight: 1.15, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: "#ffffff", fontWeight: 700 }}>{c.label}</div>
                  <div style={{ fontSize: 15.5, color: c.color, fontWeight: 800, marginTop: 3, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                    {Math.round(c.pct * 100)}%
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#ffffff",
                  fontFamily: FONT,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: -0.2,
                  lineHeight: 1.1,
                }}
              >
                {fmt(c.monto)}
              </div>
              <div style={{ fontSize: 11.5, color: "#9ca3af", fontWeight: 600, marginBottom: 2 }}>
                {c.n} operaciones
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, c.pct * 100))}%`,
                    height: "100%",
                    background: c.gradientBar,
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GASTO HORMIGA DETECTADO */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", letterSpacing: -0.2 }}>Gasto Hormiga detectado</span>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="help" size={11} strokeWidth={1.8} />
            </div>
          </div>
          <button
            className="fin-tap"
            style={{
              background: "transparent",
              border: "none",
              color: "#bd64f5",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT,
              padding: 0,
              textDecoration: "underline",
              textDecorationColor: "rgba(189,100,245,0.5)",
              textUnderlineOffset: 3,
              whiteSpace: "nowrap",
            }}
          >
            Umbral: {fmt(umbral)}/día
          </button>
        </div>

        <div
          style={{
            background: "#1C1D21",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(245,50,34,0.12)",
              border: "1px solid rgba(245,50,34,0.22)",
              color: "#F53222",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="ant" size={22} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
              Has gastado <span style={{ color: "#F53222" }}>{fmt(gastoHormiga)}</span> en gastos hormiga
            </div>
            <div style={{ fontSize: 12.5, color: "#9ca3af" }}>
              Este mes en {nHormiga} operaciones
            </div>
          </div>
          <button
            className="fin-tap"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#ffffff",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              borderRadius: 999,
              flexShrink: 0,
            }}
          >
            Ver análisis
          </button>
        </div>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", letterSpacing: -0.2 }}>Actividad reciente</div>
          <button
            className="fin-tap"
            style={{
              background: "transparent",
              border: "none",
              color: "#bd64f5",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT,
              padding: 0,
              textDecoration: "underline",
              textDecorationColor: "rgba(189,100,245,0.5)",
              textUnderlineOffset: 3,
            }}
          >
            Ver todas
          </button>
        </div>

        <div
          style={{
            background: "#1C1D21",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: "10px 14px",
          }}
        >
          {(state.ingresosPersonalOtros.length === 0 && state.gastosPersonal.length === 0) && (
            <div style={{ padding: "20px 4px", textAlign: "center" }}>
              <EmptyState text="No hay actividad personal registrada todavía." icon="user" />
            </div>
          )}

          {state.ingresosPersonalOtros.length > 0 && (
            <div style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
              <GroupLabel style={{ marginTop: 12, marginBottom: 8 }}>Otros ingresos</GroupLabel>
              {state.ingresosPersonalOtros.map((i, idx) => (
                <TxRow
                  key={i.id}
                  icon="arrowDown"
                  iconColor="#52D377"
                  last={idx === state.ingresosPersonalOtros.length - 1 && state.gastosPersonal.length === 0}
                  onDelete={() => delOtroIngreso(i.id)}
                  primary={<Field placeholder="Concepto (ej: Sueldo Freelance)" value={i.concepto} onChange={(v) => updOtroIngreso(i.id, { concepto: v })} style={txPrimaryStyle} />}
                  meta={<span style={{ fontSize: 11, color: "#52D377", fontWeight: 700 }}>Ingreso · Otro</span>}
                  amount={
                    <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#52D377",
                          fontFamily: FONT,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        + {fmt(Number(i.monto) || 0)}
                      </div>
                      <div style={{ marginTop: 2, display: "flex", justifyContent: "flex-end" }}>
                        <Field type="number" placeholder="Monto" value={i.monto} onChange={(v) => updOtroIngreso(i.id, { monto: v })} style={{ ...txAmountStyle, width: 110 }} />
                      </div>
                    </div>
                  }
                  amountColor="#52D377"
                />
              ))}
            </div>
          )}

          {state.gastosPersonal.length > 0 && (
            <div>
              <GroupLabel style={{ marginTop: 12, marginBottom: 8 }}>Gastos personales</GroupLabel>
              {state.gastosPersonal.map((g, idx) => {
                const esHormiga = (Number(g.monto) || 0) > 0 && (Number(g.monto) || 0) < umbral;
                const cat = CATS_PERSONAL.find((c) => c.name === g.categoria);
                const tipo = cat?.tipo || "Gusto";
                const colorGasto = esHormiga ? "#bd64f5" : "#F53222";
                const iconGasto = esHormiga ? "ant" : CATEGORY_ICONS[g.categoria] || "arrowUp";
                const tipoColor =
                  tipo === "Necesidad" ? "#52D377" : tipo === "Ahorro" ? "#F5A822" : "#bd64f5";
                return (
                  <TxRow
                    key={g.id}
                    icon={iconGasto}
                    iconColor={colorGasto}
                    last={idx === state.gastosPersonal.length - 1}
                    onDelete={() => delGasto(g.id)}
                    primary={<Field placeholder="Concepto (ej: Café en la esquina)" value={g.concepto} onChange={(v) => updGasto(g.id, { concepto: v })} style={txPrimaryStyle} />}
                    meta={
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: tipoColor, fontWeight: 700 }}>
                          {esHormiga ? "Gasto Hormiga" : tipo}
                        </span>
                        <span style={{ fontSize: 10.5, color: "#4B4B4B" }}>·</span>
                        <Field type="date" value={g.fecha} onChange={(v) => updGasto(g.id, { fecha: v })} style={{ ...txMetaStyle, width: "auto", padding: "2px 0" }} />
                        <span style={{ fontSize: 10.5, color: "#4B4B4B" }}>·</span>
                        <Dropdown value={g.categoria} onChange={(v) => updGasto(g.id, { categoria: v })} options={CATS_PERSONAL.map((c) => c.name)} style={{ ...txMetaStyle, flex: 1, minWidth: 100 }} />
                        {esHormiga && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              color: "#F53222",
                              background: "rgba(245,50,34,0.12)",
                              border: "1px solid rgba(245,50,34,0.3)",
                              padding: "2px 8px",
                              borderRadius: 8,
                              letterSpacing: 0.3,
                            }}
                          >
                            Hormiga
                          </span>
                        )}
                      </div>
                    }
                    amount={
                      <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: colorGasto,
                            fontFamily: FONT,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          - {fmt(Number(g.monto) || 0)}
                        </div>
                        <div style={{ marginTop: 2, display: "flex", justifyContent: "flex-end" }}>
                          <Field type="number" placeholder="Monto" value={g.monto} onChange={(v) => updGasto(g.id, { monto: v })} style={{ ...txAmountStyle, width: 110 }} />
                        </div>
                      </div>
                    }
                    amountColor={colorGasto}
                  />
                );
              })}
            </div>
          )}

          {/* Totales */}
          {(state.ingresosPersonalOtros.length > 0 || state.gastosPersonal.length > 0) && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                marginTop: 16,
                paddingTop: 14,
                borderTop: `1px solid rgba(255,255,255,0.05)`,
                fontSize: 12,
                fontFamily: FONT,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ color: "#9ca3af", fontWeight: 500, marginBottom: 4 }}>
                  Ingresos (incluye sueldo Petnova)
                </div>
                <div style={{ color: "#52D377", fontWeight: 800, fontSize: 14 }}>
                  {fmt(calc.totalIngresosPersonal)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#9ca3af", fontWeight: 500, marginBottom: 4 }}>
                  Gastos · Hormiga {fmt(calc.gastoHormiga)}
                </div>
                <div style={{ color: "#F53222", fontWeight: 800, fontSize: 14 }}>
                  {fmt(calc.totalGastosPersonal)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ANÁLISIS DE GASTOS HORMIGA */}
      <div style={{ marginBottom: 22 }}>
        <button
          onClick={() => {}}
          className="fin-tap"
          style={{
            width: "100%",
            background: "rgba(189,100,245,0.08)",
            border: "1px solid rgba(189,100,245,0.22)",
            borderRadius: 22,
            padding: "16px 18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: FONT,
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #bd64f5 0%, #9c3fe0 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="ant" size={20} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: "#bd64f5", marginBottom: 4 }}>Análisis de Gastos Hormiga</div>
            <div style={{ fontSize: 12.5, color: "#9ca3af" }}>Descubre en qué se va tu dinero</div>
          </div>
          <div style={{ color: "#bd64f5", display: "flex", alignItems: "center" }}>
            <Icon name="chevronRight" size={20} strokeWidth={2.0} />
          </div>
        </button>
      </div>

      {/* BOTONES ACCIÓN RÁPIDA INFERIORES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <button
          onClick={addOtroIngreso}
          className="fin-tap"
          style={{
            background: "#1C1D21",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: FONT,
            color: "#ffffff",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 15.5, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" size={17} strokeWidth={2.2} />
            Ingreso
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #bd64f5 0%, #9c3fe0 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="arrowDown" size={17} strokeWidth={2.0} />
          </div>
        </button>
        <button
          onClick={addGasto}
          className="fin-tap"
          style={{
            background: "#1C1D21",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 22,
            padding: "14px 16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: FONT,
            color: "#ffffff",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 15.5, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" size={17} strokeWidth={2.2} />
            Gasto
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #bd64f5 0%, #9c3fe0 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="arrowUp" size={17} strokeWidth={2.0} />
          </div>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PRESUPUESTO
   ============================================================ */
function Presupuesto({ state, update }) {
  const setLimite = (cat, val) => update({ presupuestos: { ...state.presupuestos, [cat]: val } });
  const gastadoPorCategoria = (cat) => state.gastosPersonal.filter((g) => g.categoria === cat).reduce((s, g) => s + (Number(g.monto) || 0), 0);

  const totalLimite = CATS_PERSONAL.reduce((s, c) => s + (Number(state.presupuestos[c.name]) || 0), 0);
  const totalGastado = CATS_PERSONAL.reduce((s, c) => s + gastadoPorCategoria(c.name), 0);
  const pctTotal = totalLimite > 0 ? totalGastado / totalLimite : 0;
  const heroColor = totalLimite === 0 ? C.text : pctTotal > 1 ? C.bad : pctTotal > 0.85 ? C.brand : C.money;

  return (
    <div>
      <SectionHead badge={<PrivacyBadge shared={false} />}>Presupuesto por categoría</SectionHead>

      <Hero
        label="Gastado este mes"
        value={fmt(totalGastado)}
        valueColor={heroColor}
        sub={totalLimite > 0 ? `${fmt(totalLimite)} presupuestado · ${pct(pctTotal)} usado` : "Define un límite por categoría para hacer seguimiento."}
        icon="target"
      />

      <GroupLabel>Categorías</GroupLabel>
      <Card padding="8px 22px">
        {CATS_PERSONAL.map((cat, idx) => {
          const limite = Number(state.presupuestos[cat.name]) || 0;
          const gastado = gastadoPorCategoria(cat.name);
          const p = limite > 0 ? gastado / limite : 0;
          const estado = limite === 0 ? null : p < 0.8 ? "bien" : p <= 1 ? "cerca" : "excedido";
          const color = estado === "excedido" ? C.bad : estado === "cerca" ? C.brand : C.money;
          const tipoColor = cat.tipo === "Necesidad" ? C.textMuted : cat.tipo === "Gusto" ? C.brand : C.money;
          const tipoIcon = CATEGORY_ICONS[cat.name] || "dots";
          return (
            <div key={cat.name} style={{ display: "flex", gap: 13, padding: "16px 0", borderBottom: idx < CATS_PERSONAL.length - 1 ? `1px solid ${C.divider}` : "none" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: `${tipoColor}18`,
                  color: tipoColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Icon name={tipoIcon} size={16} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 130 }}>{cat.name}</span>
                  <div style={{ width: 112 }}>
                    <Field type="number" placeholder="Límite" value={state.presupuestos[cat.name] || ""} onChange={(v) => setLimite(cat.name, v)} />
                  </div>
                  {estado && <Chip estado={estado} />}
                </div>
                {limite > 0 && (
                  <>
                    <Meter pctValue={p} color={color} />
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                      {fmt(gastado)} de {fmt(limite)} · {pct(p)}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ============================================================
   METAS
   ============================================================ */
function Metas({ state, update, calc }) {
  const addMeta = () => update({ metas: [...state.metas, { id: uid(), nombre: "", objetivo: "", ahorrado: "" }] });
  const updMeta = (id, patch) => update({ metas: state.metas.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const delMeta = (id) => update({ metas: state.metas.filter((m) => m.id !== id) });

  return (
    <div>
      <SectionHead badge={<PrivacyBadge shared={false} />}>Metas de ahorro</SectionHead>

      <Hero
        label="Fondo de emergencia"
        value={pct(calc.pctFondo)}
        valueColor={calc.pctFondo >= 1 ? C.money : C.text}
        sub={`${fmt(state.fondoAhorrado || 0)} de ${fmt(calc.metaFondoEmergencia)} objetivo`}
        icon="trophy"
      />

      <GroupLabel>Fondo de emergencia</GroupLabel>
      <Card style={{ marginBottom: 22 }}>
        <Row label="Gastos fijos mensuales" value={fmt(calc.gastosPorTipo.Necesidad)} />
        <Row label="Meses de cobertura" value={`${state.config.mesesFondo} meses`} />
        <Row label="Meta del fondo" value={fmt(calc.metaFondoEmergencia)} bold last />
        <div style={{ margin: "16px 0 10px" }}>
          <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
            Ahorrado hasta ahora
          </div>
          <Field type="number" value={state.fondoAhorrado || ""} onChange={(v) => update({ fondoAhorrado: v })} placeholder="0" />
        </div>
        <Meter pctValue={calc.pctFondo} color={C.brand} height={8} />
        <div style={{ textAlign: "right", fontSize: 12.5, marginTop: 8, fontWeight: 700, color: C.brand, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
          {pct(calc.pctFondo)} de la meta
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <GroupLabel style={{ marginBottom: 0 }}>Mis metas</GroupLabel>
        <Btn onClick={addMeta} icon="plus">Nueva meta</Btn>
      </div>
      <Card padding={state.metas.length ? "10px" : "18px 20px"}>
        {state.metas.length === 0 && <EmptyState text="Aún no tienes metas. ¿Un viaje? ¿Un equipo nuevo?" icon="trophy" />}
        {state.metas.map((m, idx) => {
          const obj = Number(m.objetivo) || 0;
          const ah = Number(m.ahorrado) || 0;
          const p = obj > 0 ? ah / obj : 0;
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                gap: 13,
                padding: 14,
                borderRadius: 14,
                background: C.cardAlt,
                marginBottom: idx < state.metas.length - 1 ? 10 : 0,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: C.brandBg,
                  color: C.brand,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Icon name="trophy" size={16} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                  <Field placeholder="Nombre de la meta" value={m.nombre} onChange={(v) => updMeta(m.id, { nombre: v })} style={{ flex: 1 }} />
                  <IconBtn onClick={() => delMeta(m.id)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 10 }}>
                  <Field type="number" placeholder="Objetivo" value={m.objetivo} onChange={(v) => updMeta(m.id, { objetivo: v })} />
                  <Field type="number" placeholder="Ahorrado" value={m.ahorrado} onChange={(v) => updMeta(m.id, { ahorrado: v })} />
                </div>
                <Meter pctValue={p} color={C.brand} />
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(ah)} de {fmt(obj)} · {pct(p)}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ============================================================
   HISTORIAL + PROYECCIÓN
   ============================================================ */
function Historial({ state, update, calc }) {
  const addMes = () => {
    update({
      historial: [
        ...state.historial,
        {
          id: uid(),
          mes: "",
          ingresos: calc.totalIngresosPersonal,
          gastos: calc.totalGastosPersonal,
          ahorro: calc.ahorroNeto,
          patrimonio: (state.historial.length > 0 ? Number(state.historial[state.historial.length - 1].patrimonio) || 0 : 0) + calc.ahorroNeto,
        },
      ],
    });
  };
  const updMes = (id, patch) => update({ historial: state.historial.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  const delMes = (id) => update({ historial: state.historial.filter((h) => h.id !== id) });
  const maxPatrimonio = Math.max(1, ...state.historial.map((h) => Number(h.patrimonio) || 0), ...calc.proyeccion.map((p) => p.patrimonio));
  const patrimonioActual = state.historial.length > 0 ? Number(state.historial[state.historial.length - 1].patrimonio) || 0 : 0;

  return (
    <div>
      <SectionHead badge={<PrivacyBadge shared={false} />}>Historial y proyección</SectionHead>

      <Hero
        label="Patrimonio actual"
        value={fmt(patrimonioActual)}
        sub={`Promedio de ahorro reciente: ${fmt(calc.promAhorro)}/mes`}
        icon="trend"
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <GroupLabel style={{ marginBottom: 0 }}>Historial mensual</GroupLabel>
        <Btn onClick={addMes} icon="plus">Cerrar mes</Btn>
      </div>
      <Card padding={state.historial.length ? "10px" : "18px 20px"} style={{ marginBottom: 22 }}>
        {state.historial.length === 0 && <EmptyState text="Cierra tu primer mes para empezar a ver tu evolución." icon="trend" />}
        {state.historial.map((h, idx) => (
          <div
            key={h.id}
            style={{
              display: "flex",
              gap: 13,
              padding: 14,
              borderRadius: 14,
              background: C.cardAlt,
              marginBottom: idx < state.historial.length - 1 ? 10 : 0,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: C.brandBg,
                color: C.brand,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Icon name="trend" size={16} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                <Field placeholder="Ene 2026" value={h.mes} onChange={(v) => updMes(h.id, { mes: v })} style={{ flex: 1 }} />
                <IconBtn onClick={() => delMes(h.id)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                <Field type="number" placeholder="Ahorro" value={h.ahorro} onChange={(v) => updMes(h.id, { ahorro: v })} />
                <Field type="number" placeholder="Patrimonio" value={h.patrimonio} onChange={(v) => updMes(h.id, { patrimonio: v })} />
              </div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 7, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                Patrimonio: {fmt(h.patrimonio)}
              </div>
            </div>
          </div>
        ))}
      </Card>

      <GroupLabel>Proyección a 6 meses</GroupLabel>
      <Card>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 18 }}>
          Basado en tu promedio de ahorro reciente: <span style={{ fontFamily: FONT, fontVariantNumeric: "tabular-nums", color: C.text }}>{fmt(calc.promAhorro)}/mes</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140 }}>
          {calc.proyeccion.map((p, idx) => (
            <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>{fmt(p.patrimonio)}</div>
              <div
                style={{
                  width: "100%",
                  height: Math.max(4, (p.patrimonio / maxPatrimonio) * 90),
                  background: C.brand,
                  borderRadius: "4px 4px 2px 2px",
                  opacity: 0.35 + (idx / (calc.proyeccion.length - 1 || 1)) * 0.55,
                }}
              />
              <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>{p.mes}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   CONFIG
   ============================================================ */
function ConfigTab({ state, update, tasaLoading, tasaError, onRefreshTasa }) {
  const setCfg = (key, val) => update({ config: { ...state.config, [key]: val } });
  const sumaPct = (Number(state.config.pctNecesidad) || 0) + (Number(state.config.pctGusto) || 0) + (Number(state.config.pctAhorro) || 0);

  return (
    <div>
      <SectionHead badge={<PrivacyBadge shared={false} />}>Configuración</SectionHead>
      <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4, marginBottom: 22 }}>
        El motor del sistema. Ajusta esto una vez y rara vez lo vuelves a tocar.
      </div>

      <GroupLabel>Parámetros generales</GroupLabel>
      <Card style={{ marginBottom: 22 }}>
        <ConfigField
          label="Tasa de cambio de referencia"
          hint={
            tasaError
              ? tasaError
              : state.config.tasaAutoFecha === todayStr()
              ? `Actualizada hoy automáticamente (${todayStr()}).`
              : "Se actualiza sola una vez al día. También puedes refrescarla a mano."
          }
        >
          <div style={{ display: "flex", gap: 8 }}>
            <Field type="number" value={state.config.tasaRef} onChange={(v) => setCfg("tasaRef", v)} />
            <button
              onClick={onRefreshTasa}
              disabled={tasaLoading}
              title="Actualizar tasa automáticamente"
              style={{
                flexShrink: 0,
                width: 42,
                borderRadius: 10,
                background: C.cardAlt,
                border: `1px solid ${C.border}`,
                color: tasaLoading ? C.textFaint : C.money,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: tasaLoading ? "not-allowed" : "pointer",
              }}
            >
              <div style={{ display: "flex", animation: tasaLoading ? "spin 0.8s linear infinite" : "none" }}>
                <Icon name="refresh" size={16} strokeWidth={2} color={tasaLoading ? C.textFaint : C.money} />
              </div>
              {tasaLoading && <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>}
            </button>
          </div>
        </ConfigField>
        <ConfigField label="Tu sueldo fijo mensual" hint="Petnova te paga esto primero, siempre, antes de cualquier otra cosa.">
          <Field type="number" value={state.config.sueldo} onChange={(v) => setCfg("sueldo", v)} />
        </ConfigField>
        <ConfigField label="Umbral de gasto hormiga" hint="Cualquier gasto por debajo de este monto se marca como hormiga.">
          <Field type="number" value={state.config.umbralHormiga} onChange={(v) => setCfg("umbralHormiga", v)} />
        </ConfigField>
        <ConfigField label="Meses de cobertura del fondo">
          <Field type="number" value={state.config.mesesFondo} onChange={(v) => setCfg("mesesFondo", v)} />
        </ConfigField>
      </Card>

      <GroupLabel>Regla de distribución (50/30/20)</GroupLabel>
      <Card>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 18 }}>Debe sumar 100%. Ajusta si tu realidad es distinta.</div>
        <ConfigField label="Necesidades">
          <Field type="number" value={state.config.pctNecesidad * 100} onChange={(v) => setCfg("pctNecesidad", (Number(v) || 0) / 100)} />
        </ConfigField>
        <ConfigField label="Gustos">
          <Field type="number" value={state.config.pctGusto * 100} onChange={(v) => setCfg("pctGusto", (Number(v) || 0) / 100)} />
        </ConfigField>
        <ConfigField label="Ahorro / Inversión">
          <Field type="number" value={state.config.pctAhorro * 100} onChange={(v) => setCfg("pctAhorro", (Number(v) || 0) / 100)} />
        </ConfigField>
        <div style={{ textAlign: "right", fontWeight: 700, color: sumaPct === 1 ? C.money : C.bad, marginTop: 10, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
          Suma: {pct(sumaPct)}
        </div>
      </Card>
    </div>
  );
}

function ConfigField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
