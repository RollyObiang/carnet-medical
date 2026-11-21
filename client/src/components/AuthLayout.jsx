import { TYPES, TYPE_COLORS } from '../docTypes.js';

// Aperçu décoratif du coffre-fort : exemples fictifs, non cliquables
const PREVIEW = [
  { title: 'Bilan sanguin', type: 'analyse' },
  { title: 'Ordonnance de novembre', type: 'ordonnance' },
  { title: 'Carnet de vaccination', type: 'vaccination' },
];

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand brand-light">
          Carnet
          <br />
          médicale
        </div>

        <div className="auth-pitch">
          <p className="pitch-title">Vos documents de santé, toujours avec vous.</p>
          <p>
            Ordonnances, analyses, vaccins : retrouvez tout en quelques secondes, et donnez aux secours l’essentiel en cas
            d’urgence.
          </p>

          <div className="preview" aria-hidden="true">
            {PREVIEW.map((item) => (
              <div className="preview-row" key={item.title}>
                <span className="tab-mark" style={{ '--tab': TYPE_COLORS[item.type] }} />
                <div>
                  <strong>{item.title}</strong>
                  <small>{TYPES[item.type]}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-box">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
          <p className="auth-footer">{footer}</p>
        </div>
      </main>
    </div>
  );
}