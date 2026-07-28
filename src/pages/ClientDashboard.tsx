import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { QrCode, Download, User as UserIcon, Ticket as TicketIcon } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { ticketsService } from '@/services/ticketsService';
import { generateQrDataUrl } from '@/services/qrService';
import { Ticket } from '@/types';
import { formatDateTime } from '@/utils/format';

type Tab = 'ingressos' | 'dados';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('ingressos');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    ticketsService.listByUser(user.email).then(async (data) => {
      setTickets(data);
      setLoading(false);
      const entries = await Promise.all(data.map(async (t) => [t.id, await generateQrDataUrl(t.qrPayload)] as const));
      setQrCache(Object.fromEntries(entries));
    });
  }, [user]);

  return (
    <>
      <Seo title="Meus ingressos" />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-extrabold text-white">Olá, {user?.nome.split(' ')[0]}</h1>
        <p className="mt-1 text-white/50">Gerencie seus ingressos e seus dados pessoais.</p>

        <div className="mt-8 flex gap-2 border-b border-white/10">
          <TabButton icon={TicketIcon} active={tab === 'ingressos'} onClick={() => setTab('ingressos')}>Meus ingressos</TabButton>
          <TabButton icon={UserIcon} active={tab === 'dados'} onClick={() => setTab('dados')}>Dados pessoais</TabButton>
        </div>

        {tab === 'ingressos' && (
          <div className="mt-8">
            {loading ? (
              <Spinner fullScreen />
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-16 text-center text-white/50">
                Você ainda não tem ingressos. Que tal <a href="/eventos" className="text-violet-400 hover:underline">encontrar um evento</a>?
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {tickets.map((t) => (
                  <div key={t.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                    <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-violet-400">{t.status === 'valido' ? 'Válido' : t.status === 'utilizado' ? 'Utilizado' : 'Cancelado'}</span>
                      <span className="text-xs text-white/40">{t.codigo}</span>
                    </div>
                    <div className="flex flex-col items-center gap-4 p-5 sm:flex-row">
                      {qrCache[t.id] && (
                        <img src={qrCache[t.id]} alt={`QR Code do ingresso ${t.codigo}`} className="h-28 w-28 rounded-lg bg-white p-1.5" />
                      )}
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-display font-bold text-white">{t.eventoNome}</h3>
                        <p className="text-sm text-white/50">{t.lotNome} · Ingresso #{t.numero}</p>
                        <p className="mt-1 text-xs text-white/40">Comprado em {formatDateTime(t.criadoEm)}</p>
                        <button className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-white hover:border-violet-500/50">
                          <Download size={13} /> Baixar PDF
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'dados' && (
          <div className="mt-8 max-w-md space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Nome</span>
              <input defaultValue={user?.nome} className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">E-mail</span>
              <input defaultValue={user?.email} disabled className="input opacity-60" />
            </label>
            <button className="rounded-full bg-cta-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-neon">
              Salvar alterações
            </button>
            <div className="border-t border-white/10 pt-4">
              <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
                <QrCode size={15} /> Alterar senha
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function TabButton({
  icon: Icon,
  active,
  onClick,
  children,
}: {
  icon: typeof TicketIcon;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? 'border-violet-500 text-white' : 'border-transparent text-white/40 hover:text-white/70'
      }`}
    >
      <Icon size={15} /> {children}
    </button>
  );
}
