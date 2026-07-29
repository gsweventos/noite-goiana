import { useEffect, useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { ticketsService } from '@/services/ticketsService';
import { adminManageService } from '@/services/adminManageService';
import { EVENT_ID } from '@/config/event';
import { Ticket } from '@/types';
import { formatDateTime } from '@/utils/format';

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [apagando, setApagando] = useState<string | null>(null);

  function carregar() {
    setLoading(true);
    ticketsService.listByEvent(EVENT_ID).then((data) => {
      setTickets(data);
      setLoading(false);
    });
  }

  useEffect(carregar, []);

  async function apagar(t: Ticket) {
    const confirmado = confirm(`Apagar o ingresso ${t.codigo} (${t.compradorNome})?\n\nNão tem como desfazer.`);
    if (!confirmado) return;

    setApagando(t.id);
    try {
      await adminManageService.deleteTicket(t.id);
      setTickets((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível apagar.');
    } finally {
      setApagando(null);
    }
  }

  return (
    <>
      <Seo title="Ingressos" />
      <h1 className="font-display text-2xl font-bold text-white">Ingressos emitidos</h1>
      <p className="mt-1 text-sm text-white/50">Todos os ingressos gerados após pagamento aprovado, com status de uso.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium">Comprador</th>
              <th className="px-4 py-3 font-medium">Emitido em</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-white/40">Carregando...</td></tr>
            )}
            {!loading && tickets.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-white/40">Nenhum ingresso emitido ainda.</td></tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-white/70">{t.codigo}</td>
                <td className="px-4 py-3 text-white/70">{t.eventoNome}</td>
                <td className="px-4 py-3 text-white/70">{t.compradorNome}</td>
                <td className="px-4 py-3 text-white/50">{formatDateTime(t.criadoEm)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    t.status === 'valido' ? 'bg-emerald-500/15 text-emerald-400' :
                    t.status === 'utilizado' ? 'bg-white/10 text-white/50' : 'bg-red-500/15 text-red-400'
                  }`}>
                    {t.status === 'valido' ? 'Válido' : t.status === 'utilizado' ? 'Utilizado' : 'Cancelado'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => apagar(t)}
                    disabled={apagando === t.id}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    aria-label="Apagar ingresso"
                  >
                    {apagando === t.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
