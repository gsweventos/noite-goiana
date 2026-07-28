import { useEffect, useState } from 'react';
import { Seo } from '@/components/Seo';
import { ticketsService } from '@/services/ticketsService';
import { EVENT_ID } from '@/config/event';
import { Ticket } from '@/types';
import { formatDateTime } from '@/utils/format';

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    ticketsService.listByEvent(EVENT_ID).then(setTickets);
  }, []);

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
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tickets.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-white/40">Nenhum ingresso emitido ainda.</td></tr>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
