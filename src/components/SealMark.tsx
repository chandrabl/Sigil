interface SealMarkProps {
  size?: number;
  className?: string;
  broken?: boolean;
}

/**
 * The one recurring visual motif in this app: a wax seal. Intact = sealed
 * (private, not yet revealed). Broken = opened (revealed, now public).
 * Used instead of a generic lock icon so the metaphor stays specific to
 * an auction house rather than "security UI" in general.
 */
export function SealMark({ size = 40, className = "", broken = false }: SealMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={`wax-seal ${className}`}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="18" fill="url(#sealGradient)" />
      <defs>
        <radialGradient id="sealGradient" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#9A3A3A" />
          <stop offset="60%" stopColor="#7A2426" />
          <stop offset="100%" stopColor="#5A1818" />
        </radialGradient>
      </defs>
      {broken ? (
        <path
          d="M13 14 L19 21 L14 27 M27 14 L21 20 L26 27"
          stroke="#E8DFC7"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
      ) : (
        <path
          d="M20 10 L23.5 17.2 L31 18.3 L25.5 23.6 L26.8 31 L20 27.4 L13.2 31 L14.5 23.6 L9 18.3 L16.5 17.2 Z"
          fill="#E8DFC7"
          opacity="0.9"
        />
      )}
    </svg>
  );
}
