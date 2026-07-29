import { useEffect, useState } from 'react';
import { Seo } from '@/components/Seo';
import { ticketsService } from '@/services/ticketsService';
import { EVENT_ID } from '@/config/event';
import { Ticket } from '@/types';

export default function AdminClients() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketsService.listByEvent(EVENT_ID).then((data) => {
      setTickets(data);
      setLoading(false);
    });
  }, []);

  // Um cliente pode ter comprado mais de um ingresso — mostra só uma linha
  // por pessoa (pelo e-mail), mas soma quantos ingressos ela tem no total.
  const porEmail = new Map<string, { ticket: Ticket; quantidade: number }>();
  for (const t of tickets) {
    const atual = porEmail.get(t.compradorEmail);
    if (atual) atual.quantidade += 1;
    else porEmail.set(t.compradorEmail, { ticket: t, quantidade: 1 });
  }
  const clientes = Array.from(porEmail.values());

  return (
    <>
      <Seo title="Clientes" />
      <h1 className="font-display text-2xl font-bold text-white">Clientes</h1>
      <p className="mt-1 text-sm text-white/50">Pessoas que já têm ingresso — compradas ou liberadas por cortesia.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">CPF</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Nascimento</th>
              <th className="px-4 py-3 font-medium">Ingressos</th>
              <th className="px-4 py-3 font-medium">Origem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-white/40">Carregando...</td></tr>
            )}
            {!loading && clientes.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-white/40">Nenhum cliente com ingresso ainda.</td></tr>
            )}
            {clientes.map(({ ticket: c, quantidade }) => (
              <tr key={c.compradorEmail} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white/70">{c.compradorNome}</td>
                <td className="px-4 py-3 text-white/70">{c.compradorEmail}</td>
                <td className="px-4 py-3 text-white/50">{c.compradorCpf}</td>
                <td className="px-4 py-3 text-white/50">{c.compradorTelefone ?? '—'}</td>
                <td className="px-4 py-3 text-white/50">{c.compradorDataNascimento ?? '—'}</td>
                <td className="px-4 py-3 text-white/70">{quantidade}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.origem === 'manual' ? 'bg-violet-500/15 text-violet-300' : 'bg-emerald-500/15 text-emerald-400'
                  }`}>
                    {c.origem === 'manual' ? 'Cortesia' : 'Comprado'}
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
