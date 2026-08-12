import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

/* ============================================================
   DISEÑO — "Fintech Minimal" v3
   Un dato protagonista por pantalla · listas en filas · un solo
   acento de marca. Inspirado en Binance / Coinbase / Atom Bank.
   ============================================================ */
const C = {
  bg: "#0A0C0A",
  card: "#161915",
  cardAlt: "#101310",
  cardHover: "#1D211C",
  border: "rgba(255, 255, 255, 0.07)",
  borderStrong: "rgba(255, 255, 255, 0.16)",
  divider: "rgba(255, 255, 255, 0.07)",
  text: "#F1F3EE",
  textMuted: "#8B9488",
  textFaint: "#5C645A",
  brand: "#A3E635",
  brandDk: "#84CC16",
  brandOn: "#101300",
  brandBg: "rgba(163, 230, 53, 0.12)",
  brandBorder: "rgba(163, 230, 53, 0.32)",
  warn: "#F5A623",
  warnBg: "rgba(245, 166, 35, 0.12)",
  warnBorder: "rgba(245, 166, 35, 0.32)",
  money: "#2ED573",
  moneyBg: "rgba(46, 213, 115, 0.12)",
  moneyBorder: "rgba(46, 213, 115, 0.30)",
  bad: "#F6465D",
  badBg: "rgba(246, 70, 93, 0.12)",
  badBorder: "rgba(246, 70, 93, 0.30)",
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
   ICONOS (SVG inline, sistema consistente — sin emojis sueltos)
   ============================================================ */
const Icon = ({ name, size = 18, color = "currentColor", strokeWidth = 1.8 }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
    cat: <><path d="M4 8c0-2 2-4 4-4 1 0 1.5 1 2 1s1-1 2-1c2 0 4 2 4 4 0 3-2 4-2 7 0 2-2 4-6 4s-6-2-6-4c0-3-2-4-2-7" /><circle cx="9" cy="10" r="0.5" fill={color} /><circle cx="15" cy="10" r="0.5" fill={color} /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill={color} /></>,
    trophy: <><path d="M8 4h8v6a4 4 0 01-8 0V4z" /><path d="M8 5H5a3 3 0 003 3M16 5h3a3 3 0 01-3 3" /><path d="M12 14v3M9 21h6M10 17h4v2a2 2 0 002 2H8a2 2 0 002-2v-2z" /></>,
    trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
    check: <path d="M5 12l5 5L19 7" />,
    alert: <><path d="M12 3L2 20h20L12 3z" /><path d="M12 10v4M12 17.5v.1" /></>,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    ant: <><ellipse cx="12" cy="14" rx="4" ry="5" /><circle cx="12" cy="6" r="2.5" /><path d="M9 4L6 2M15 4l3-2M6 14H2M22 14h-4" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.2 9a2.8 2.8 0 015.4.9c0 1.9-2.6 2.1-2.6 3.9" /><circle cx="12" cy="17.3" r="0.4" fill={color} /></>,
    chevronLeft: <path d="M15 5l-7 7 7 7" />,
    chevronRight: <path d="M9 5l7 7-7 7" />,
    refresh: <><path d="M3 12a9 9 0 0115.3-6.4L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 01-15.3 6.4L3 16" /><path d="M3 21v-5h5" /></>,
    hand: <><path d="M8 13V6a1.5 1.5 0 013 0v5M11 10.5V4.5a1.5 1.5 0 013 0V11M14 10.5V6a1.5 1.5 0 013 0v6" /><path d="M17 12V9.5a1.5 1.5 0 013 0V14a6 6 0 01-6 6h-2a6 6 0 01-5-2.7L4.3 13a1.4 1.4 0 012.2-1.7L8 13" /></>,
    sparkle: <><path d="M12 3l1.6 4.9L18 9.5l-4.4 1.6L12 16l-1.6-4.9L6 9.5l4.4-1.6z" /><path d="M19 16l.7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9z" /></>,
    arrowUp: <><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>,
    arrowDown: <><path d="M12 5v14" /><path d="M18 13l-6 6-6-6" /></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 118 0v4" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.2A10.6 10.6 0 0112 5c6.5 0 10 7 10 7a17.4 17.4 0 01-3.4 4.4M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7c1.5 0 2.8-.3 4-.8" /><path d="M9.9 9.9a3 3 0 004.2 4.2" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    portfolio: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /></>,
    logout: <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
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
function Card({ children, style, padding = "20px 22px" }) {
  return (
    <div
      className="fin-card"
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding,
        boxSizing: "border-box",
        boxShadow: "0 1px 2px rgba(0,0,0,0.24), 0 8px 24px -12px rgba(0,0,0,0.5)",
        transition: "border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease",
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

function Hero({ label, value, valueColor, badge, sub }) {
  const [visible, setVisible] = useState(true);
  return (
    <div style={{ marginBottom: 32, position: "relative" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -40,
          left: -20,
          width: 200,
          height: 160,
          background: `radial-gradient(closest-side, ${C.brandBg}, transparent)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", fontSize: 11.5, color: C.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
        {label}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
        gap: 8,
        marginBottom: 26,
        overflowX: "auto",
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
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 18px 10px 14px",
            borderRadius: 999,
            cursor: "pointer",
            background: it.primary ? C.brand : C.cardAlt,
            border: it.primary ? "1px solid transparent" : `1px solid ${C.border}`,
            color: it.primary ? C.brandOn : C.text,
            fontFamily: FONT,
            whiteSpace: "nowrap",
            transition: "transform 0.12s ease, background 0.15s ease",
          }}
        >
          <Icon name={it.icon} size={15} strokeWidth={2.2} />
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{it.label}</span>
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
      style={{
        background: C.cardAlt,
        border: `1.5px solid ${focus ? C.brand : C.border}`,
        borderRadius: 12,
        padding: "11px 14px",
        color: C.text,
        fontSize: 13.5,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: FONT,
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        boxShadow: focus ? `0 0 0 3px ${C.brandBg}` : "none",
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
        borderRadius: 12,
        padding: "11px 14px",
        color: value ? C.text : C.textFaint,
        fontSize: 13.5,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: FONT,
        cursor: "pointer",
        boxShadow: focus ? `0 0 0 3px ${C.brandBg}` : "none",
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
      background: hover ? C.brandDk : C.brand,
      color: C.brandOn,
      border: "1px solid transparent",
    },
    ghost: {
      background: hover ? C.cardHover : "transparent",
      color: C.text,
      border: `1px solid ${C.border}`,
    },
    danger: {
      background: hover ? C.badBg : "transparent",
      color: C.bad,
      border: `1px solid ${C.badBorder}`,
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="fin-tap"
      style={{
        padding: variant === "primary" ? "10px 20px" : "10px 16px",
        borderRadius: variant === "primary" ? 999 : 12,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s ease, border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT,
        letterSpacing: 0.1,
        boxShadow: variant === "primary" && !disabled ? `0 4px 14px -4px ${C.brandBorder}` : "none",
        ...variants[variant],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={2.4} />}
      {children}
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
        padding: "4px 10px 4px 7px",
        borderRadius: 6,
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
        borderRadius: 9,
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
        padding: "11px 0",
        borderBottom: last ? "none" : `1px solid ${C.divider}`,
      }}
    >
      <span style={{ color: bold ? C.text : C.textMuted, fontWeight: bold ? 700 : 400, fontSize: bold ? 14 : 13.5 }}>{label}</span>
      <span
        style={{
          color: color || C.text,
          fontFamily: FONT,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          fontSize: bold ? 14.5 : 13.5,
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
              borderRadius: 16,
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
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Sistema Financiero</div>
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
   SPLASH INTRO — apertura animada tipo app de trading
   ============================================================ */
const TICKER_ITEMS = [
  { label: "PETNOVA", sub: "Ingresos", up: true },
  { label: "USD / COP", sub: "Tasa de cambio", up: true },
  { label: "AHORRO", sub: "Meta mensual", up: true },
  { label: "FONDO", sub: "Emergencia", up: true },
  { label: "REINVERSIÓN", sub: "Negocio", up: false },
  { label: "PATRIMONIO", sub: "Proyección", up: true },
];

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
        background: "#020202",
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
        @keyframes splashTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes splashBar { 0% { width: 0%; } 100% { width: 100%; } }
      `}</style>

      <div aria-hidden style={{ position: "absolute", top: "12%", left: "8%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,185,11,0.07), transparent 70%)", filter: "blur(50px)", animation: "splashDrift1 10s ease-in-out infinite" }} />

      <div style={{ position: "relative", width: 96, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.brand}55`, animation: "splashRing 1.8s ease-out infinite" }} />
        <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.brand}55`, animation: "splashRing 1.8s ease-out 0.6s infinite" }} />
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: 12,
            background: C.brand,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 900,
            fontFamily: FONT,
            color: C.brandOn,
            animation: phase >= 1 ? "splashPop 0.55s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
            opacity: phase >= 1 ? 1 : 0,
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

      <div
        style={{
          position: "absolute",
          bottom: 74,
          left: 0,
          right: 0,
          overflow: "hidden",
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
          maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div style={{ display: "flex", width: "max-content", animation: "splashTicker 14s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 22px", flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 0.4, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>{it.label}</span>
              <span style={{ fontSize: 11, color: C.textFaint }}>{it.sub}</span>
              <Icon name={it.up ? "arrowUp" : "arrowDown"} size={12} strokeWidth={2.4} color={it.up ? C.money : C.bad} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 40, width: 160, height: 3, borderRadius: 4, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <div style={{ height: "100%", background: C.brand, borderRadius: 4, animation: "splashBar 1.5s cubic-bezier(0.4,0,0.2,1) both" }} />
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

  const BOTTOM_NAV_IDS = ["dashboard", "petnova", "personal", "presupuesto", "metas"];
  const bottomNavTabs = TABS.filter((t) => BOTTOM_NAV_IDS.includes(t.id));

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
        .fin-2col { display: grid; grid-template-columns: 1fr; gap: 22px; align-items: start; }
        .fin-card:hover { border-color: ${C.borderStrong}; }
        .fin-tap { -webkit-tap-highlight-color: transparent; }
        .fin-tap:active { transform: scale(0.96); }
        .fin-navbtn:active { transform: scale(0.92); }
        @media (max-width: 899px) {
          .fin-bottom-nav { display: flex; }
          .fin-swipe-area { padding-bottom: 94px; }
        }
        @media (min-width: 900px) {
          .fin-2col { grid-template-columns: 336px 1fr; gap: 28px; }
        }
      `}</style>

      <div className="fin-container" style={{ padding: "26px 24px 0 24px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: C.brand,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 900,
                fontFamily: FONT,
                color: C.brandOn,
              }}
            >
              $
            </div>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: -0.2, fontFamily: FONT }}>Sistema Financiero</div>
              <div style={{ fontSize: 11, color: C.textFaint, marginTop: 1, fontWeight: 500 }}>Petnova + Personal</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontSize: 10.5,
                color: saving ? C.brand : C.textFaint,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: saving ? C.brand : C.money,
                  animation: saving ? "pulse 1s ease infinite" : "none",
                }}
              />
              <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
              {saving ? "Guardando" : "Guardado"}
            </div>
            <button
              onClick={() => setShowTutorial(true)}
              title="Ver tutorial"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textFaint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Icon name="help" size={14} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              title="Cerrar sesión"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.textFaint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Icon name="logout" size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              gap: 2,
              overflowX: "auto",
              paddingBottom: 2,
              paddingRight: 28,
              scrollbarWidth: "none",
              borderBottom: `1px solid ${C.divider}`,
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => (tabBtnRefs.current[t.id] = el)}
                  onClick={() => goToIndex(TABS.findIndex((x) => x.id === t.id))}
                  style={{
                    background: "transparent",
                    color: active ? C.text : C.textFaint,
                    border: "none",
                    borderBottom: active ? `2px solid ${C.brand}` : "2px solid transparent",
                    marginBottom: -1,
                    padding: "8px 14px 10px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "color 0.15s ease, border-color 0.15s ease",
                    fontFamily: FONT,
                  }}
                >
                  <Icon name={t.icon} size={13} strokeWidth={active ? 2.4 : 1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 2,
              width: 30,
              background: `linear-gradient(90deg, transparent, ${C.bg}CC)`,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <div
        className="fin-container fin-swipe-area"
        style={{ padding: "26px 0 10px 0", position: "relative", overflow: "hidden", touchAction: "pan-y" }}
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
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 24px 18px 24px", boxSizing: "border-box" }}>
            <Dashboard state={state} calc={calc} onNavigate={goToTab} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 24px 18px 24px", boxSizing: "border-box" }}>
            <Petnova state={state} update={update} calc={calc} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 24px 18px 24px", boxSizing: "border-box" }}>
            <Personal state={state} update={update} calc={calc} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 24px 18px 24px", boxSizing: "border-box" }}>
            <Presupuesto state={state} update={update} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 24px 18px 24px", boxSizing: "border-box" }}>
            <Metas state={state} update={update} calc={calc} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 24px 18px 24px", boxSizing: "border-box" }}>
            <Historial state={state} update={update} calc={calc} />
          </div>
          <div style={{ flex: `0 0 ${100 / TABS.length}%`, minWidth: 0, padding: "4px 24px 18px 24px", boxSizing: "border-box" }}>
            <ConfigTab state={state} update={update} tasaLoading={tasaLoading} tasaError={tasaError} onRefreshTasa={refrescarTasa} />
          </div>
        </div>
      </div>

      <div className="fin-container" style={{ display: "flex", justifyContent: "center", gap: 6, paddingBottom: 20 }}>
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
          left: 12,
          right: 12,
          bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          zIndex: 60,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 22,
          padding: "8px 6px",
          justifyContent: "space-around",
          alignItems: "center",
          boxShadow: "0 12px 32px -8px rgba(0,0,0,0.55)",
        }}
      >
        {bottomNavTabs.map((t, i) => {
          const active = tab === t.id;
          const isCenter = i === Math.floor((bottomNavTabs.length - 1) / 2);
          if (isCenter) {
            return (
              <button
                key={t.id}
                onClick={() => goToTab(t.id)}
                className="fin-navbtn"
                title={t.label}
                style={{
                  background: active ? C.brand : C.cardHover,
                  border: active ? "1px solid transparent" : `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  color: active ? C.brandOn : C.text,
                  cursor: "pointer",
                  transform: "translateY(-14px)",
                  boxShadow: active ? `0 8px 20px -6px ${C.brandBorder}` : "0 6px 16px -6px rgba(0,0,0,0.5)",
                  transition: "background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
                  flexShrink: 0,
                }}
              >
                <Icon name={t.icon} size={21} strokeWidth={active ? 2.3 : 1.8} />
              </button>
            );
          }
          return (
            <button
              key={t.id}
              onClick={() => goToTab(t.id)}
              className="fin-navbtn"
              style={{
                background: "transparent",
                border: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 10px",
                color: active ? C.brand : C.textFaint,
                cursor: "pointer",
                fontFamily: FONT,
                transition: "color 0.15s ease",
                borderRadius: 12,
              }}
            >
              <Icon name={t.icon} size={19} strokeWidth={active ? 2.3 : 1.8} />
              <span style={{ fontSize: 9.5, fontWeight: 700 }}>{t.label}</span>
            </button>
          );
        })}
      </div>

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
function Dashboard({ state, calc, onNavigate }) {
  const ahorroColor = calc.ahorroNeto >= 0 ? C.money : C.bad;

  return (
    <div>
      <SectionHead>Dashboard</SectionHead>

      <Hero
        label="Ahorro neto del mes"
        value={fmt(calc.ahorroNeto)}
        valueColor={ahorroColor}
        badge={calc.salud !== "info" && <Chip estado={calc.salud} />}
        sub={calc.saludMsg}
      />

      <QuickActions
        items={[
          { icon: "cat", label: "Petnova", primary: true, onClick: () => onNavigate("petnova") },
          { icon: "user", label: "Personal", onClick: () => onNavigate("personal") },
          { icon: "target", label: "Presupuesto", onClick: () => onNavigate("presupuesto") },
          { icon: "trophy", label: "Metas", onClick: () => onNavigate("metas") },
          { icon: "trend", label: "Historial", onClick: () => onNavigate("historial") },
        ]}
      />

      <div className="fin-2col">
        <div>
          <GroupLabel>Distribución de gastos</GroupLabel>
          <Card>
            {["Necesidad", "Gusto", "Ahorro"].map((tipo, idx) => {
              const val = calc.gastosPorTipo[tipo];
              const meta = tipo === "Necesidad" ? calc.metaNecesidad : tipo === "Gusto" ? calc.metaGusto : calc.metaAhorro;
              const p = meta > 0 ? val / meta : 0;
              const color = p > 1 ? C.bad : p > 0.85 ? C.brand : C.money;
              return (
                <div key={tipo} style={{ marginBottom: idx < 2 ? 18 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: C.textMuted, fontWeight: 600 }}>{tipo}</span>
                    <span style={{ color: C.textMuted, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                      {fmt(val)} <span style={{ color: C.textFaint }}>/</span> {fmt(meta)}
                    </span>
                  </div>
                  <Meter pctValue={p} color={color} />
                </div>
              );
            })}
          </Card>
        </div>

        <div>
          <GroupLabel>Petnova</GroupLabel>
          <Card style={{ marginBottom: 22 }}>
            <Row label="Ingresos del mes" value={fmt(calc.totalIngresosPetnovaLocal)} color={C.money} />
            <Row label="Tu sueldo" value={fmt(calc.sueldo)} />
            <Row label="Reinversión" value={fmt(calc.reinversion)} color={calc.reinversion >= 0 ? C.money : C.bad} last />
          </Card>

          <GroupLabel>Personal</GroupLabel>
          <Card style={{ marginBottom: 22 }}>
            <Row label="Ingresos personales" value={fmt(calc.totalIngresosPersonal)} color={C.money} />
            <Row label="Gastos personales" value={fmt(calc.totalGastosPersonal)} color={C.bad} />
            <Row label="Gasto hormiga" value={fmt(calc.gastoHormiga)} last />
          </Card>

          <GroupLabel>Metas y futuro</GroupLabel>
          <Card>
            <Row label="Fondo de emergencia" value={pct(calc.pctFondo)} />
            <Row label="Proyección a 6 meses" value={fmt(calc.proyeccion[5]?.patrimonio || 0)} last />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PETNOVA
   ============================================================ */
function Petnova({ state, update, calc }) {
  const addIngreso = () => update({ ingresosPetnova: [...state.ingresosPetnova, { id: uid(), fecha: todayStr(), concepto: "", montoUsd: "", tasa: state.config.tasaRef }] });
  const updIngreso = (id, patch) => update({ ingresosPetnova: state.ingresosPetnova.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const delIngreso = (id) => update({ ingresosPetnova: state.ingresosPetnova.filter((i) => i.id !== id) });

  const addGasto = () => update({ gastosPetnova: [...state.gastosPetnova, { id: uid(), fecha: todayStr(), categoria: "", concepto: "", monto: "" }] });
  const updGasto = (id, patch) => update({ gastosPetnova: state.gastosPetnova.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const delGasto = (id) => update({ gastosPetnova: state.gastosPetnova.filter((g) => g.id !== id) });

  return (
    <div>
      <SectionHead badge={<PrivacyBadge shared />}>Petnova — Negocio</SectionHead>

      <Hero
        label="Ingresos del mes"
        value={fmt(calc.totalIngresosPetnovaLocal)}
        valueColor={C.money}
        sub={`Equivale a ${fmtUsd(calc.totalIngresosPetnovaUSD)}`}
      />

      <div className="fin-2col">
        <div>
          <GroupLabel>Resumen — Pay Yourself First</GroupLabel>
          <Card>
            <Row label="Ingresos totales" value={fmt(calc.totalIngresosPetnovaLocal)} />
            <Row label="Gastos operativos" value={fmt(-calc.totalGastosPetnova)} />
            <Row label="Utilidad antes de sueldo" value={fmt(calc.utilidadAntesSueldo)} bold />
            <Row label="Tu sueldo fijo" value={fmt(-calc.sueldo)} />
            <Row label="Queda en el negocio" value={fmt(calc.reinversion)} bold color={calc.reinversion >= 0 ? C.money : C.bad} last />
          </Card>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <GroupLabel style={{ marginBottom: 0 }}>Ingresos</GroupLabel>
            <Btn onClick={addIngreso} icon="plus">Ingreso</Btn>
          </div>
          <Card style={{ marginBottom: 22 }}>
            {state.ingresosPetnova.length === 0 && <EmptyState text="Aún no registras ingresos. Agrega el primero." icon="cat" />}
            {state.ingresosPetnova.map((i, idx) => (
              <TxRow
                key={i.id}
                icon="arrowUp"
                iconColor={C.money}
                last={idx === state.ingresosPetnova.length - 1}
                onDelete={() => delIngreso(i.id)}
                primary={
                  <Field
                    placeholder="Concepto (ej: Hotmart ebook)"
                    value={i.concepto}
                    onChange={(v) => updIngreso(i.id, { concepto: v })}
                    style={txPrimaryStyle}
                  />
                }
                meta={
                  <>
                    <Field type="date" value={i.fecha} onChange={(v) => updIngreso(i.id, { fecha: v })} style={{ ...txMetaStyle, width: 108 }} />
                    <span style={{ color: C.textFaint }}>·</span>
                    <Field type="number" placeholder="USD" value={i.montoUsd} onChange={(v) => updIngreso(i.id, { montoUsd: v })} style={{ ...txMetaStyle, width: 68 }} />
                    <span style={{ color: C.textFaint }}>·</span>
                    <Field type="number" placeholder="Tasa" value={i.tasa} onChange={(v) => updIngreso(i.id, { tasa: v })} style={{ ...txMetaStyle, width: 76 }} />
                  </>
                }
                amount={fmt((Number(i.montoUsd) || 0) * (Number(i.tasa) || 0))}
                amountColor={C.money}
              />
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.divider}`, fontWeight: 700, fontSize: 14 }}>
              <span style={{ color: C.textFaint, fontWeight: 400, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>{fmtUsd(calc.totalIngresosPetnovaUSD)} →</span>
              <span style={{ color: C.money, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>{fmt(calc.totalIngresosPetnovaLocal)}</span>
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <GroupLabel style={{ marginBottom: 0 }}>Gastos operativos</GroupLabel>
            <Btn onClick={addGasto} variant="ghost" icon="plus">Gasto</Btn>
          </div>
          <Card style={{ marginBottom: 22 }}>
            {state.gastosPetnova.length === 0 && <EmptyState text="Sin gastos operativos registrados aún." icon="x" />}
            {state.gastosPetnova.map((g, idx) => (
              <TxRow
                key={g.id}
                icon="arrowDown"
                iconColor={C.bad}
                last={idx === state.gastosPetnova.length - 1}
                onDelete={() => delGasto(g.id)}
                primary={<Field placeholder="Concepto" value={g.concepto} onChange={(v) => updGasto(g.id, { concepto: v })} style={txPrimaryStyle} />}
                meta={
                  <>
                    <Field type="date" value={g.fecha} onChange={(v) => updGasto(g.id, { fecha: v })} style={{ ...txMetaStyle, width: 108 }} />
                    <span style={{ color: C.textFaint }}>·</span>
                    <Dropdown value={g.categoria} onChange={(v) => updGasto(g.id, { categoria: v })} options={CATS_NEGOCIO} style={{ ...txMetaStyle, width: 150 }} />
                  </>
                }
                amount={<Field type="number" placeholder="Monto" value={g.monto} onChange={(v) => updGasto(g.id, { monto: v })} style={txAmountStyle} />}
                amountColor={C.bad}
              />
            ))}
            <div style={{ textAlign: "right", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.divider}`, fontWeight: 700, fontSize: 14, fontFamily: FONT, fontVariantNumeric: "tabular-nums", color: C.bad }}>
              {fmt(calc.totalGastosPetnova)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PERSONAL
   ============================================================ */
function Personal({ state, update, calc }) {
  const addOtroIngreso = () => update({ ingresosPersonalOtros: [...state.ingresosPersonalOtros, { id: uid(), concepto: "", monto: "" }] });
  const updOtroIngreso = (id, patch) => update({ ingresosPersonalOtros: state.ingresosPersonalOtros.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const delOtroIngreso = (id) => update({ ingresosPersonalOtros: state.ingresosPersonalOtros.filter((i) => i.id !== id) });

  const addGasto = () => update({ gastosPersonal: [...state.gastosPersonal, { id: uid(), fecha: todayStr(), categoria: "", concepto: "", monto: "" }] });
  const updGasto = (id, patch) => update({ gastosPersonal: state.gastosPersonal.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const delGasto = (id) => update({ gastosPersonal: state.gastosPersonal.filter((g) => g.id !== id) });
  const umbral = Number(state.config.umbralHormiga) || 0;

  return (
    <div>
      <SectionHead badge={<PrivacyBadge shared={false} />}>Personal</SectionHead>

      <Hero
        label="Ahorro neto del mes"
        value={fmt(calc.ahorroNeto)}
        valueColor={calc.ahorroNeto >= 0 ? C.money : C.bad}
        sub={`Meta de ahorro: ${pct(state.config.pctAhorro)} de tus ingresos`}
      />

      <div className="fin-2col">
        <div>
          <GroupLabel>Seguimiento 50/30/20</GroupLabel>
          <Card>
            {["Necesidad", "Gusto", "Ahorro"].map((tipo, idx) => {
              const val = calc.gastosPorTipo[tipo];
              const meta = tipo === "Necesidad" ? calc.metaNecesidad : tipo === "Gusto" ? calc.metaGusto : calc.metaAhorro;
              const p = meta > 0 ? val / meta : 0;
              const estado = meta === 0 ? null : p <= 1 ? "bien" : p <= 1.15 ? "cerca" : "excedido";
              return (
                <div
                  key={tipo}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    padding: "11px 0",
                    borderBottom: idx < 2 ? `1px solid ${C.divider}` : "none",
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{tipo}</span>
                  <span style={{ fontSize: 12, color: C.textMuted, fontFamily: FONT, fontVariantNumeric: "tabular-nums" }}>
                    {fmt(val)} / {fmt(meta)}
                  </span>
                  {estado && <Chip estado={estado} />}
                </div>
              );
            })}
          </Card>
        </div>

        <div>
          <GroupLabel>Ingresos</GroupLabel>
          <Card style={{ marginBottom: 22 }}>
            <Row label="Sueldo desde Petnova" value={fmt(calc.sueldo)} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 0 8px" }}>
              <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>Otros ingresos</span>
              <Btn onClick={addOtroIngreso} variant="ghost" icon="plus" style={{ padding: "6px 12px", fontSize: 11.5 }}>Agregar</Btn>
            </div>
            {state.ingresosPersonalOtros.map((i, idx) => (
              <TxRow
                key={i.id}
                icon="arrowUp"
                iconColor={C.money}
                last={idx === state.ingresosPersonalOtros.length - 1}
                onDelete={() => delOtroIngreso(i.id)}
                primary={<Field placeholder="Concepto" value={i.concepto} onChange={(v) => updOtroIngreso(i.id, { concepto: v })} style={txPrimaryStyle} />}
                meta={<span style={{ fontSize: 11, color: C.textFaint }}>Otro ingreso</span>}
                amount={<Field type="number" placeholder="Monto" value={i.monto} onChange={(v) => updOtroIngreso(i.id, { monto: v })} style={txAmountStyle} />}
                amountColor={C.money}
              />
            ))}
            <Row label="Total ingresos" value={fmt(calc.totalIngresosPersonal)} bold color={C.money} last />
          </Card>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <GroupLabel style={{ marginBottom: 0 }}>Gastos personales</GroupLabel>
            <Btn onClick={addGasto} variant="ghost" icon="plus">Gasto</Btn>
          </div>
          <Card style={{ marginBottom: 22 }}>
            {state.gastosPersonal.length === 0 && <EmptyState text="Sin gastos registrados este mes." icon="x" />}
            {state.gastosPersonal.map((g, idx) => {
              const esHormiga = (Number(g.monto) || 0) > 0 && (Number(g.monto) || 0) < umbral;
              return (
                <TxRow
                  key={g.id}
                  icon={esHormiga ? "ant" : "arrowDown"}
                  iconColor={esHormiga ? C.brand : C.bad}
                  last={idx === state.gastosPersonal.length - 1}
                  onDelete={() => delGasto(g.id)}
                  primary={<Field placeholder="Concepto" value={g.concepto} onChange={(v) => updGasto(g.id, { concepto: v })} style={txPrimaryStyle} />}
                  meta={
                    <>
                      <Field type="date" value={g.fecha} onChange={(v) => updGasto(g.id, { fecha: v })} style={{ ...txMetaStyle, width: 108 }} />
                      <span style={{ color: C.textFaint }}>·</span>
                      <Dropdown value={g.categoria} onChange={(v) => updGasto(g.id, { categoria: v })} options={CATS_PERSONAL.map((c) => c.name)} style={{ ...txMetaStyle, width: 150 }} />
                    </>
                  }
                  amount={<Field type="number" placeholder="Monto" value={g.monto} onChange={(v) => updGasto(g.id, { monto: v })} style={txAmountStyle} />}
                  amountColor={esHormiga ? C.brand : C.bad}
                />
              );
            })}
            <Row label="Total gastos" value={fmt(calc.totalGastosPersonal)} bold color={C.bad} />
            <Row label="Gasto hormiga del mes" value={fmt(calc.gastoHormiga)} last />
          </Card>
        </div>
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
      />

      <GroupLabel>Categorías</GroupLabel>
      <Card padding="8px 22px">
        {CATS_PERSONAL.map((cat, idx) => {
          const limite = Number(state.presupuestos[cat.name]) || 0;
          const gastado = gastadoPorCategoria(cat.name);
          const p = limite > 0 ? gastado / limite : 0;
          const estado = limite === 0 ? null : p < 0.8 ? "bien" : p <= 1 ? "cerca" : "excedido";
          const color = estado === "excedido" ? C.bad : estado === "cerca" ? C.brand : C.money;
          const tipoIcon = cat.tipo === "Necesidad" ? "portfolio" : cat.tipo === "Gusto" ? "sparkle" : "target";
          const tipoColor = cat.tipo === "Necesidad" ? C.textMuted : cat.tipo === "Gusto" ? C.brand : C.money;
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
