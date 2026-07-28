import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Ticket, Calendar, DollarSign } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { eventsService } from '@/services/eventsService';
import { EventItem } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

export default function AdminDashboard() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    eventsService.listPublished().then(setEvents);
  }, []);

  const ingressosVendidos = events.reduce((acc, e) => acc + e.lotes.reduce((a, l) => a + l.quantidadeVendida, 0), 0);
  const receitaTotal = events.reduce((acc, e) => acc + e.lotes.reduce((a, l) => a + l.quantidadeVendida * l.preco, 0), 0);

  const stats = [
    { label: 'Eventos ativos', value: events.length, icon: Calendar },
    { label: 'Ingressos vendidos', value: ingressosVendidos.toLocaleString('pt-BR'), icon: Ticket },
    { label: 'Receita total', value: formatCurrency(receitaTotal), icon: DollarSign },
    { label: 'Taxa média de ocupação', value: '68%', icon: TrendingUp },
  ];

  return (
    <>
      <Seo title="Painel administrativo" />

      <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-white/50">Visão geral da operação da Noite Goiana.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">{label}</span>
              <Icon size={16} className="text-violet-400" />
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder de gráfico de vendas — pronto para plugar Recharts/Chart.js com dados reais do Firestore */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="font-display text-sm font-bold text-white">Vendas nos últimos 14 dias</h2>
        <div className="mt-4 flex h-40 items-end gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => {
            const h = 20 + Math.round(Math.sin(i / 2) * 20 + 40 + (i % 3) * 8);
            return <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-violet-700 to-violet-400" style={{ height: `${h}%` }} />;
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 className="font-display text-sm font-bold text-white">Próximos eventos</h2>
          <Link to="/admin/eventos" className="text-xs font-medium text-violet-400 hover:text-violet-300">Gerenciar eventos</Link>
        </div>
        <div className="divide-y divide-white/5">
          {events.map((e) => {
            const vendidos = e.lotes.reduce((a, l) => a + l.quantidadeVendida, 0);
            const capacidade = e.capacidade;
            return (
              <div key={e.id} className="flex items-center justify-between p-4 text-sm">
                <div className="flex items-center gap-3">
                  <img src={e.imagemCapa} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  <div>
                    <p className="font-medium text-white">{e.nome}</p>
                    <p className="text-xs text-white/40">{formatDate(e.dataInicio)} · {e.local.cidade}</p>
                  </div>
                </div>
                <span className="text-xs text-white/50">{vendidos}/{capacidade} vendidos</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
