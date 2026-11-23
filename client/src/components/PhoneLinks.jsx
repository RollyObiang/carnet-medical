export default function PhoneLinks({ value }) {
  return value.split('/').map((raw, i) => {
    const number = raw.trim();
    return (
      <span key={number}>
        {i > 0 && ' / '}
        <a href={`tel:${number.replace(/[^\d+]/g, '')}`}>{number}</a>
      </span>
    );
  });
}