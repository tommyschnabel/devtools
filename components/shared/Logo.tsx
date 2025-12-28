interface LogoProps {
  size?: number;
  className?: string;
}

function Logo({ size = 32, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer hexagon - representing tools/structure */}
      <path
        d="M50 5 L85 27.5 L85 72.5 L50 95 L15 72.5 L15 27.5 Z"
        stroke="url(#gradient1)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />

      {/* Inner code brackets < > - representing code/development */}
      <path
        d="M35 35 L25 50 L35 65"
        stroke="url(#gradient2)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M65 35 L75 50 L65 65"
        stroke="url(#gradient2)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center AI sparkle */}
      <circle cx="50" cy="50" r="5" fill="url(#gradient3)" />
      <path
        d="M50 40 L50 60 M40 50 L60 50"
        stroke="url(#gradient3)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Gradients - Much brighter and more saturated for dark backgrounds */}
      <defs>
        <linearGradient id="gradient1" x1="15" y1="5" x2="85" y2="95">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id="gradient2" x1="25" y1="35" x2="75" y2="65">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#d8b4fe" />
        </linearGradient>
        <linearGradient id="gradient3" x1="42" y1="42" x2="58" y2="58">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default Logo;
