import { Seo } from '@/components/Seo';
import { mockPayments } from '@/services/mockData';
import { formatCurrency, formatDateTime } from '@/utils/format';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  estornado: 'Estornado',
  em_analise: 'Em análise',
};

export default function AdminPayments() {
  return (
    <>
      <Seo title="Pagamentos" />
      <h1 className="font-display text-2xl font-bold text-white">Pagamentos</h1>
      <p className="mt-1 text-sm text-white/50">Histórico de transações processadas via Asaas.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">ID Asaas</th>
              <th className="px-4 py-3 font-medium">Comprador</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {mockPayments.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-white/70">{p.asaasPaymentId ?? "—"}</td>
                <td className="px-4 py-3 text-white/70">{p.compradorNome}</td>
                <td className="px-4 py-3 text-white/70">{formatCurrency(p.valorTotal)}</td>
                <td className="px-4 py-3 text-white/50">{formatDateTime(p.criadoEm)}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    {STATUS_LABEL[p.status]}
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
