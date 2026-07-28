import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Users2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { eventsService } from '@/services/eventsService';
import { EventItem } from '@/types';
import { formatCurrency, formatDate, lotProgress } from '@/utils/format';

export default function AdminEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    eventsService.listPublished().then(setEvents);
  }, []);

  return (
    <>
      <Seo title="Gerenciar eventos" />

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Eventos</h1>
        <Link
          to="/admin/eventos/novo"
          className="flex items-center gap-1.5 rounded-full bg-cta-gradient px-4 py-2 text-sm font-semibold text-white shadow-neon"
        >
          <Plus size={15} /> Novo evento
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Cidade</th>
              <th className="px-4 py-3 font-medium">Vendas</th>
              <th className="px-4 py-3 font-medium">Receita</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {events.map((e) => {
              const vendidos = e.lotes.reduce((a, l) => a + l.quantidadeVendida, 0);
              const totalLotes = e.lotes.reduce((a, l) => a + l.quantidadeTotal, 0);
              const receita = e.lotes.reduce((a, l) => a + l.quantidadeVendida * l.preco, 0);
              return (
                <tr key={e.id} className="bg-white/[0.01] hover:bg-white/[0.03]">
                  <td className="flex items-center gap-3 px-4 py-3">
                    <img src={e.imagemCapa} alt="" className="h-9 w-9 rounded-lg object-cover" />
                    <span className="font-medium text-white">{e.nome}</span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{formatDate(e.dataInicio)}</td>
                  <td className="px-4 py-3 text-white/60">{e.local.cidade}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full bg-cta-gradient" style={{ width: `${lotProgress(vendidos, totalLotes)}%` }} />
                      </div>
                      <span className="text-xs text-white/40">{vendidos}/{totalLotes}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{formatCurrency(receita)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      {e.status === 'publicado' ? 'Publicado' : e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/eventos/${e.id}`} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Editar evento">
                        <Pencil size={15} />
                      </Link>
                      <Link to={`/admin/eventos/${e.id}/clientes`} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Ver compradores">
                        <Users2 size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
