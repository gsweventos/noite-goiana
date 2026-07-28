interface LogoProps {
  className?: string;
}

/**
 * Wordmark da Noite Goiana em SVG: "Noite" em script rosa/magenta sobre
 * "GOIANA" em bold metálico, com feixes de luz cruzados ao fundo (clima
 * de show/holofote). className controla a altura (ex: "h-8", "h-16") — a
 * largura acompanha proporcionalmente via viewBox.
 */
export function Logo({ className = 'h-10' }: LogoProps) {
  return (
    <svg viewBox="0 0 640 220" className={className} role="img" aria-label="Noite Goiana">
      <defs>
        <linearGradient id="ng-beam-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ng-beam-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ng-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e7e9f5" />
          <stop offset="100%" stopColor="#b9c0da" />
        </linearGradient>
        <linearGradient id="ng-pink" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="55%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#c026d3" />
        </linearGradient>
        <filter id="ng-glow-pink" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ng-glow-blue" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
          </feMerge>
        </filter>
      </defs>

      {/* Feixes de luz cruzados */}
      <polygon points="255,0 315,0 640,220 545,220" fill="url(#ng-beam-a)" />
      <polygon points="325,0 385,0 95,220 0,220" fill="url(#ng-beam-b)" />

      {/* Estrelinhas */}
      <circle cx="70" cy="30" r="2" fill="#ffffff" opacity="0.7" />
      <circle cx="115" cy="15" r="1.4" fill="#ffffff" opacity="0.5" />
      <circle cx="555" cy="40" r="1.8" fill="#ffffff" opacity="0.6" />
      <circle cx="595" cy="70" r="1.3" fill="#ffffff" opacity="0.45" />
      <circle cx="40" cy="75" r="1.3" fill="#ffffff" opacity="0.45" />

      {/* GOIANA — brilho azul por trás */}
      <text
        x="320"
        y="185"
        textAnchor="middle"
        fontFamily="'Anton', sans-serif"
        fontSize="112"
        letterSpacing="4"
        fill="#60a5fa"
        opacity="0.55"
        filter="url(#ng-glow-blue)"
      >
        GOIANA
      </text>

      {/* GOIANA — texto principal metálico com contorno escuro */}
      <text
        x="320"
        y="185"
        textAnchor="middle"
        fontFamily="'Anton', sans-serif"
        fontSize="112"
        letterSpacing="4"
        fill="url(#ng-chrome)"
        stroke="#150a22"
        strokeWidth="5"
        paintOrder="stroke"
      >
        GOIANA
      </text>

      {/* Noite — script rosa/magenta, sobreposta acima do G */}
      <text
        x="120"
        y="95"
        fontFamily="'Alex Brush', cursive"
        fontSize="78"
        fill="url(#ng-pink)"
        filter="url(#ng-glow-pink)"
        transform="rotate(-7 120 95)"
      >
        Noite
      </text>
    </svg>
  );
}
