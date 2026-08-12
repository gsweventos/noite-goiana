import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, Ticket, Camera, LogOut, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import { useAuth } from '@/context/AuthContext';

const NAV_LINKS = [
  { to: '/', label: 'Início' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
];

/** Rola até a seção de ingressos na home. Navega para "/" primeiro se necessário. */
function scrollToIngressos(navigate: ReturnType<typeof useNavigate>, isHome: boolean) {
  const scroll = () => document.getElementById('ingressos')?.scrollIntoView({ behavior: 'smooth' });
  if (isHome) {
    scroll();
  } else {
    navigate('/');
    setTimeout(scroll, 150);
  }
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Página inicial da Noite Goiana">
          <Logo className="h-8 sm:h-9" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-violet-400 ${
                  isActive ? 'text-white' : 'text-white/60'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={() => scrollToIngressos(navigate, isHome)}
            className="text-sm font-medium text-white/60 transition-colors hover:text-violet-400"
          >
            Ingressos
          </button>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user && (
            <>
              <Link
                to="/painel"
                className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-600/10 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:border-violet-500/60 hover:bg-violet-600/20"
              >
                <Ticket size={15} /> Meus ingressos
              </Link>
              <Link
                to="/fotos"
                className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-600/10 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:border-violet-500/60 hover:bg-violet-600/20"
              >
                <Camera size={15} /> Fotos
              </Link>
            </>
          )}
          {user ? (
            <div className="group relative">
              <button className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:border-violet-500/50">
                <User size={16} />
                {user.nome.split(' ')[0]}
              </button>
              <div className="invisible absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-ink-900 p-1.5 opacity-0 shadow-neon transition-all group-hover:visible group-hover:opacity-100">
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5">
                    <LayoutDashboard size={15} /> Painel admin
                  </Link>
                )}
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5"
                >
                  <LogOut size={15} /> Sair
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-cta-gradient px-5 py-2 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.03]"
            >
              Login
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          {user && (
            <>
              <Link
                to="/painel"
                aria-label="Meus ingressos"
                className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-600/10 px-3 py-2 text-xs font-medium text-violet-200"
              >
                <Ticket size={14} /> Ingressos
              </Link>
              <Link
                to="/fotos"
                aria-label="Fotos"
                className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-600/10 px-3 py-2 text-xs font-medium text-violet-200"
              >
                <Camera size={14} /> Fotos
              </Link>
            </>
          )}
          <button
            className="rounded-lg p-2 text-white"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10 md:hidden"
            aria-label="Navegação móvel"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5"
                >
                  {link.label}
                </NavLink>
              ))}
              <button
                onClick={() => {
                  setOpen(false);
                  scrollToIngressos(navigate, isHome);
                }}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/80 hover:bg-white/5"
              >
                Ingressos
              </button>
              <div className="my-2 h-px bg-white/10" />
              {user ? (
                <>
                  <Link to="/painel" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/5">
                    Meus ingressos
                  </Link>
                  <Link to="/fotos" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/5">
                    Fotos da festa
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-white/80 hover:bg-white/5">
                      Painel admin
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await logout();
                      setOpen(false);
                      navigate('/');
                    }}
                    className="rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-white/5"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-cta-gradient px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
