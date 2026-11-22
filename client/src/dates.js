const fmt = (tz, opts) => new Intl.DateTimeFormat('fr-FR', { timeZone: tz, ...opts });

// Toutes ces fonctions affichent l'heure dans le fuseau de la structure
export const timeLabel = (iso, tz) => fmt(tz, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const longDate = (iso, tz) => fmt(tz, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
export const monthShort = (iso, tz) => fmt(tz, { month: 'short' }).format(new Date(iso));
export const dayNumber = (iso, tz) => fmt(tz, { day: 'numeric' }).format(new Date(iso));

// Clé "AAAA-MM-JJ" du jour local d'un créneau
export const dayKey = (iso, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(iso));

// Libellés d'une clé de jour, sans conversion de fuseau
export function dayParts(key) {
  const d = new Date(`${key}T12:00:00Z`);
  const f = (opts) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts }).format(d);
  return { weekday: f({ weekday: 'short' }), day: f({ day: 'numeric' }), month: f({ month: 'short' }) };
}