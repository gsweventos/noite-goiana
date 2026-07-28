import { Seo } from '@/components/Seo';
import { mockTickets } from '@/services/mockData';

export default function AdminClients() {
  const clientesUnicos = Array.from(new Map(mockTickets.map((t) => [t.compradorEmail, t])).values());

  return (
    <>
      <Seo title="Clientes" />
      <h1 className="font-display text-2xl font-bold text-white">Clientes</h1>
      <p className="mt-1 text-sm text-white/50">Pessoas que já compraram ingressos na plataforma.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">CPF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {clientesUnicos.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-white/40">Nenhum cliente cadastrado ainda.</td></tr>
            )}
            {clientesUnicos.map((c) => (
              <tr key={c.compradorEmail} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-white/70">{c.compradorNome}</td>
                <td className="px-4 py-3 text-white/70">{c.compradorEmail}</td>
                <td className="px-4 py-3 text-white/50">{c.compradorCpf}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
