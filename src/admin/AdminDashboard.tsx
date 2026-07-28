import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, DollarSign, Pencil } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { eventsService } from '@/services/eventsService';
import { EventItem } from '@/types';
import { formatCurrency, formatDateTime, lotProgress } from '@/utils/format';

export default function AdminDashboard() {
  const [event, setEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    eventsService.getMainEvent().then(setEvent);
  }, []);

  if (!event) return null;

  const ingressosVendidos = event.lotes.reduce((a, l) => a + l.quantidadeVendida, 0);
  const totalLotes = event.lotes.reduce((a, l) => a + l.quantidadeTotal, 0);
  const receitaTotal = event.lotes.reduce((a, l) => a + l.quantidadeVendida * l.preco, 0);

  const stats = [
    { label: 'Data da festa', value: formatDateTime(event.dataInicio), icon: Calendar },
    { label: 'Ingressos vendidos', value: ingressosVendidos.toLocaleString('pt-BR'), icon: Ticket },
    { label: 'Receita total', value: formatCurrency(receitaTotal), icon: DollarSign },
  ];

  return (
    <>
      <Seo title="Painel administrativo" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/50">Visão geral da {event.nome}.</p>
        </div>
        <Link
          to="/admin/evento"
          className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white hover:border-violet-500/50"
        >
          <Pencil size={14} /> Editar festa
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">{label}</span>
              <Icon size={16} className="text-violet-400" />
            </div>
            <p className="mt-2 font-display text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-display text-sm font-bold text-white">Lotes de ingresso</h2>
        {event.lotes.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">
            Nenhum lote cadastrado ainda — o site está mostrando "Lotes em breve" para os visitantes.{' '}
            <Link to="/admin/evento" className="text-violet-400 hover:underline">Cadastrar lotes</Link>
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {event.lotes.map((lot) => (
              <div key={lot.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3 text-sm">
                <div>
                  <p className="font-medium text-white">{lot.nome}</p>
                  <p className="text-xs text-white/40">{formatCurrency(lot.preco)} · {lot.quantidadeVendida}/{lot.quantidadeTotal} vendidos</p>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-cta-gradient" style={{ width: `${lotProgress(lot.quantidadeVendida, lot.quantidadeTotal)}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-white/40">Total: {ingressosVendidos}/{totalLotes} ingressos vendidos</p>
          </div>
        )}
      </div>
    </>
  );
}
