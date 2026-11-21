import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Durée d'affichage de chaque conseil, en millisecondes
const ROTATION_MS = 7000;

const SLIDES = [
  {
    id: 'paludisme',
    title: 'Dormez sous une moustiquaire',
    text: 'Utilisez-la chaque nuit. En cas de fièvre, consultez vite et faites un test de paludisme avant tout traitement.',
    tint: '#e3f0eb',
    accent: '#0e6b52',
  },
  {
    id: 'eau',
    title: 'Buvez de l’eau régulièrement',
    text: 'Surtout quand il fait chaud ou que vous transpirez beaucoup. Gardez une bouteille à portée de main.',
    tint: '#e4eff9',
    accent: '#1f6fb2',
  },
  {
    id: 'mains',
    title: 'Lavez-vous les mains',
    text: 'À l’eau et au savon, avant de manger et après les toilettes. C’est l’un des gestes les plus efficaces contre les infections.',
    tint: '#efe8f7',
    accent: '#7a4fb0',
  },
  {
    id: 'vaccins',
    title: 'Vérifiez vos vaccins',
    text: 'Contrôlez les vôtres et ceux de vos enfants. Ajoutez votre carnet de vaccination à votre coffre-fort pour ne plus le perdre.',
    tint: '#fbefd9',
    accent: '#b7791f',
    cta: { to: '/documents', label: 'Ajouter mon carnet' },
  },
  {
    id: 'tension',
    title: 'Faites contrôler votre tension',
    text: 'L’hypertension ne donne souvent aucun symptôme. Une mesure régulière permet de la repérer tôt.',
    tint: '#fcebe9',
    accent: '#b42318',
  },
  {
    id: 'marche',
    title: 'Marchez 30 minutes',
    text: 'Une marche rapide la plupart des jours de la semaine protège le cœur et aide à mieux dormir.',
    tint: '#e3f3e8',
    accent: '#2e8b57',
  },
  {
    id: 'urgence',
    title: 'Signalez vos allergies',
    text: 'Allergies, traitements, groupe sanguin : renseignez votre fiche d’urgence pour que les secours aient l’essentiel en quelques secondes.',
    tint: '#fcebe9',
    accent: '#b42318',
    cta: { to: '/urgence', label: 'Compléter ma fiche' },
  },
];

// Pour utiliser une vraie photo à la place d'une illustration :
// mets l'image dans client/public/campagne/ et ajoute photo: '/campagne/nom.jpg' à la slide.

const svgProps = {
  viewBox: '0 0 200 160',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const ART = {
  paludisme: () => (
    <svg {...svgProps}>
      <path d="M100 18 L44 128 H156 Z" fill="currentColor" fillOpacity=".12" />
      <path d="M100 18 V128 M100 18 L72 128 M100 18 L128 128" />
      <path d="M30 128 H170" strokeWidth="6" />
      <path d="M36 144 H164" strokeWidth="10" />
      <circle cx="100" cy="14" r="4" fill="currentColor" />
    </svg>
  ),
  eau: () => (
    <svg {...svgProps}>
      <path
        d="M100 22 C100 22 56 76 56 104 a44 44 0 0 0 88 0 C144 76 100 22 100 22 Z"
        fill="currentColor"
        fillOpacity=".14"
      />
      <path d="M80 108 a22 22 0 0 0 18 20" strokeWidth="5" />
    </svg>
  ),
  mains: () => (
    <svg {...svgProps}>
      <rect x="52" y="100" width="96" height="34" rx="14" fill="currentColor" fillOpacity=".16" />
      <path d="M66 116 H100" strokeWidth="4" />
      <circle cx="76" cy="70" r="16" />
      <circle cx="112" cy="52" r="11" />
      <circle cx="140" cy="76" r="8" />
      <circle cx="96" cy="30" r="6" />
    </svg>
  ),
  vaccins: () => (
    <svg {...svgProps}>
      <path
        d="M100 18 L152 38 V80 C152 112 128 134 100 144 C72 134 48 112 48 80 V38 Z"
        fill="currentColor"
        fillOpacity=".15"
      />
      <path d="M76 82 L94 100 L126 64" strokeWidth="6" />
    </svg>
  ),
  tension: () => (
    <svg {...svgProps}>
      <path
        d="M100 136 C38 98 42 48 76 46 C90 45 98 54 100 62 C102 54 110 45 124 46 C158 48 162 98 100 136 Z"
        fill="currentColor"
        fillOpacity=".14"
      />
      <path d="M32 88 H78 L90 62 L108 112 L120 88 H168" strokeWidth="4" />
    </svg>
  ),
  marche: () => (
    <svg {...svgProps}>
      <circle cx="152" cy="36" r="16" fill="currentColor" fillOpacity=".18" />
      <path d="M26 136 C70 108 92 140 128 104 S170 74 176 62" strokeWidth="10" strokeDasharray="0.1 20" />
    </svg>
  ),
  urgence: () => (
    <svg {...svgProps}>
      <rect x="34" y="36" width="132" height="92" rx="14" fill="#fff" />
      <path d="M34 64 V50 a14 14 0 0 1 14 -14 H152 a14 14 0 0 1 14 14 V64 Z" fill="currentColor" />
      <circle cx="64" cy="94" r="14" fill="currentColor" fillOpacity=".2" />
      <path d="M90 88 H146 M90 102 H132 M90 114 H120" strokeWidth="5" opacity=".5" />
    </svg>
  ),
};

export default function HealthBanner() {
  const [index, setIndex] = useState(0);
  // Si l'utilisateur a désactivé les animations dans son système, le bandeau reste fixe
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (paused || hovering) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), ROTATION_MS);
    return () => clearTimeout(id);
  }, [index, paused, hovering]);

  const slide = SLIDES[index];
  const Art = ART[slide.id];

  return (
    <section
      className="campaign"
      aria-roledescription="carrousel"
      aria-label="Conseils santé"
      style={{ '--tint': slide.tint, '--accent': slide.accent }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <div aria-live={paused || hovering ? 'polite' : 'off'}>
        <div className="campaign-slide" key={slide.id}>
          <div className="campaign-copy">
            <h2>{slide.title}</h2>
            <p>{slide.text}</p>
            {slide.cta && (
              <div>
                <Link className="button-link" to={slide.cta.to}>
                  {slide.cta.label}
                </Link>
              </div>
            )}
          </div>
          <div className="campaign-art" aria-hidden="true">
            {slide.photo ? <img src={slide.photo} alt="" /> : <Art />}
          </div>
        </div>
      </div>

      <div className="campaign-bar">
        <div className="dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="dot"
              aria-label={`Conseil ${i + 1} sur ${SLIDES.length}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button type="button" className="ghost" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Reprendre' : 'Pause'}
        </button>
      </div>
      <p className="campaign-note">Conseils généraux de prévention. Ils ne remplacent pas l’avis d’un médecin.</p>
    </section>
  );
}