import logoImg from '@/assets/noite-goiana-logo.webp';

interface LogoProps {
  className?: string;
}

/**
 * Wordmark oficial da Noite Goiana (arte da GSW Eventos), recortada do
 * material de divulgação da festa. className controla a altura (ex: "h-10",
 * "h-20") — a largura acompanha proporcionalmente.
 */
export function Logo({ className = 'h-10' }: LogoProps) {
  return <img src={logoImg} alt="Noite Goiana" className={`w-auto object-contain ${className}`} />;
}
