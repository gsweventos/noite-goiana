interface LogoProps {
  className?: string;
}

/** Wordmark da Noite Goiana — usada no header, footer e hero. */
export function Logo({ className = '' }: LogoProps) {
  return (
    <span className={`font-display font-extrabold tracking-tight ${className}`}>
      <span className="text-white">Noite</span>
      <span className="text-gradient">Goiana</span>
    </span>
  );
}
