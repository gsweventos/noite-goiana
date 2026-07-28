import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Ticket, Users, CreditCard, ScanLine, Tag } from 'lucide-react';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/eventos', label: 'Eventos', icon: CalendarDays },
  { to: '/admin/categorias', label: 'Categorias', icon: Tag },
  { to: '/admin/ingressos', label: 'Ingressos', icon: Ticket },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/pagamentos', label: 'Pagamentos', icon: CreditCard },
  { to: '/checkin', label: 'Check-in', icon: ScanLine },
];

export default function AdminLayout() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-56 lg:shrink-0">
        <h2 className="mb-4 px-2 text-xs font-semibold uppercase tracking-widest text-white/40">Administração</h2>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-violet-600/15 text-violet-300' : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
