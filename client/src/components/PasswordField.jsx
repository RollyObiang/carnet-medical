import { useId, useState } from 'react';

export default function PasswordField({ label, hint, ...props }) {
  const id = useId();
  const [shown, setShown] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <span className="hint">{hint}</span>}
      <div className="password-wrap">
        <input id={id} type={shown ? 'text' : 'password'} {...props} />
        <button type="button" className="reveal" onClick={() => setShown((s) => !s)} aria-pressed={shown}>
          {shown ? 'Masquer' : 'Afficher'}
        </button>
      </div>
    </div>
  );
}