/** Abstract pharmacy illustration for the hero (no stock photos yet). */
export function HeroArt() {
  return (
    <svg viewBox="0 0 480 520" className="h-full w-full" role="img" aria-label="Illustration of medicine storage shelves and a refrigerator">
      <defs>
        <linearGradient id="shelf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef5f1" />
        </linearGradient>
        <linearGradient id="fridge" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f4f9fc" />
          <stop offset="1" stopColor="#dce9f2" />
        </linearGradient>
      </defs>
      {/* shelving unit */}
      <rect x="40" y="70" width="230" height="400" rx="22" fill="url(#shelf)" stroke="#cfe0d7" strokeWidth="2" />
      {[150, 250, 350].map((y) => (
        <rect key={y} x="56" y={y} width="198" height="6" rx="3" fill="#cfe0d7" />
      ))}
      {/* boxes & bottles */}
      <g>
        <rect x="66" y="98" width="46" height="52" rx="6" fill="#1d6b55" />
        <rect x="118" y="112" width="36" height="38" rx="6" fill="#9cc8b3" />
        <rect x="160" y="92" width="40" height="58" rx="6" fill="#f0b54a" />
        <rect x="206" y="108" width="36" height="42" rx="6" fill="#14302a" opacity="0.85" />
        <rect x="66" y="198" width="30" height="52" rx="10" fill="#2c6a94" opacity="0.85" />
        <rect x="102" y="210" width="30" height="40" rx="10" fill="#9cc8b3" />
        <rect x="138" y="190" width="56" height="60" rx="6" fill="#ffffff" stroke="#cfe0d7" strokeWidth="2" />
        <path d="M160 212h12v8h8v12h-8v8h-12v-8h-8v-12h8z" fill="#1d6b55" />
        <rect x="200" y="204" width="42" height="46" rx="6" fill="#1d6b55" opacity="0.8" />
        <rect x="66" y="302" width="60" height="48" rx="6" fill="#f0b54a" opacity="0.8" />
        <rect x="132" y="296" width="34" height="54" rx="10" fill="#14302a" opacity="0.8" />
        <rect x="172" y="310" width="70" height="40" rx="6" fill="#9cc8b3" />
        <rect x="66" y="394" width="176" height="56" rx="10" fill="#e7f2ec" />
        <text x="154" y="428" textAnchor="middle" fontFamily="Public Sans, sans-serif" fontSize="15" fontWeight="600" fill="#1d6b55">
          Batch · Expiry · Supplier
        </text>
      </g>
      {/* fridge */}
      <rect x="292" y="150" width="150" height="320" rx="22" fill="url(#fridge)" stroke="#bfd5e4" strokeWidth="2" />
      <rect x="306" y="166" width="122" height="288" rx="14" fill="#ffffff" opacity="0.7" />
      {[240, 320, 400].map((y) => (
        <rect key={y} x="306" y={y} width="122" height="4" rx="2" fill="#bfd5e4" />
      ))}
      <rect x="320" y="200" width="16" height="38" rx="5" fill="#2c6a94" />
      <rect x="342" y="206" width="16" height="32" rx="5" fill="#2c6a94" opacity="0.6" />
      <rect x="364" y="198" width="16" height="40" rx="5" fill="#2c6a94" opacity="0.8" />
      <rect x="320" y="276" width="46" height="42" rx="6" fill="#dce9f2" stroke="#2c6a94" strokeWidth="2" />
      <rect x="374" y="282" width="40" height="36" rx="6" fill="#2c6a94" opacity="0.35" />
      <rect x="320" y="356" width="94" height="42" rx="6" fill="#2c6a94" opacity="0.18" />
      <circle cx="420" cy="182" r="6" fill="#1f9d55" />
    </svg>
  );
}
