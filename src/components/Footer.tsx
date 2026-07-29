import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Instagram, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  function irParaIngressos() {
    const scroll = () => document.getElementById('ingressos')?.scrollIntoView({ behavior: 'smooth' });
    if (location.pathname === '/') {
      scroll();
    } else {
      navigate('/');
      setTimeout(scroll, 150);
    }
  }

  return (
    <footer className="border-t border-white/10 bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo className="h-8" />
            <p className="mt-3 max-w-xs text-sm text-white/50">
              Prepare-se para viver a melhor noite automotiva que Formosa já viu.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://instagram.com/noitegoianafsa"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram da Noite Goiana"
                className="rounded-full border border-white/10 p-2 text-white/60 hover:border-violet-500/50 hover:text-violet-400"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://wa.me/5561982804443"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp da Noite Goiana"
                className="rounded-full border border-white/10 p-2 text-white/60 hover:border-violet-500/50 hover:text-violet-400"
              >
                <MessageCircle size={18} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Navegação</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/50">
              <li><button onClick={irParaIngressos} className="hover:text-violet-400">Ingressos</button></li>
              <li><Link to="/sobre" className="hover:text-violet-400">Sobre nós</Link></li>
              <li><Link to="/contato" className="hover:text-violet-400">Contato</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/50">
              <li><Link to="/privacidade" className="hover:text-violet-400">Política de Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-violet-400">Termos de Uso</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Conta</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/50">
              <li><Link to="/login" className="hover:text-violet-400">Acessar minha conta</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Noite Goiana. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
