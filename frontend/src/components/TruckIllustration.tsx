export function TruckIllustration({ color, muted = false }: { color: string; muted?: boolean }) {
  return (
    <svg className={muted ? 'truck-svg is-muted' : 'truck-svg'} viewBox="0 0 112 58" role="img" aria-label="Иллюстрация грузового автомобиля">
      <path d="M9 13h57v31H9z" fill={color} rx="5" />
      <path d="M66 23h21l14 13v8H66z" fill={color} />
      <path d="M72 27h12l9 9H72z" fill="#dbe8ef" />
      <rect x="16" y="19" width="40" height="17" rx="3" fill="white" opacity=".18" />
      <path d="M6 44h99" stroke="#33463b" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="46" r="8" fill="#26312b" /><circle cx="28" cy="46" r="3" fill="#b8c0bb" />
      <circle cx="84" cy="46" r="8" fill="#26312b" /><circle cx="84" cy="46" r="3" fill="#b8c0bb" />
      <rect x="99" y="38" width="7" height="4" rx="2" fill="#f7c948" />
    </svg>
  )
}
