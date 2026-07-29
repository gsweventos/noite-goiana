import { useEffect, useState } from 'react';
import { Seo } from '@/components/Seo';
import { adminPaymentsService } from '@/services/adminPaymentsService';
import { Payment } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils/format';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  estornado: 'Estornado',
  em_analise: 'Em análise',
};

const STATUS_COR: Record<string, string> = {
  pendente: 'bg-white/10 text-white/60',
  aprovado: 'bg-emerald-500/15 text-emerald-400',
  rejeitado: 'bg-red-500/15 text-red-400',
  estornado: 'bg-red-500/15 text-red-400',
  em_analise: 'bg-amber-500/15 text-amber-400',
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminPaymentsService.listAll().then((data) => {
      setPayments(data);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <Seo title="Pagamentos" />
      <h1 className="font-display text-2xl font-bold text-white">Pagamentos</h1>
      <p className="mt-1 text-sm text-white/50">Histórico de transações processadas via Mercado Pago (inclui cortesias liberadas manualmente).</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">ID Mercado Pago</th>
              <th className="px-4 py-3 font-medium">Comprador</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-white/40">Carregando...</td></tr>
            )}
            {!loading && payments.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-white/40">Nenhum pagamento ainda.</td></tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-white/70">{p.mpPaymentId ?? '—'}</td>
                <td className="px-4 py-3 text-white/70">{p.compradorNome}</td>
                <td className="px-4 py-3 text-white/70">{p.origem === 'manual' ? 'Cortesia' : formatCurrency(p.valorTotal)}</td>
                <td className="px-4 py-3 text-white/50">{formatDateTime(p.criadoEm)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.origem === 'manual' ? 'bg-violet-500/15 text-violet-300' : 'bg-white/10 text-white/60'}`}>
                    {p.origem === 'manual' ? 'Manual' : 'Checkout'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COR[p.status] ?? 'bg-white/10 text-white/60'}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
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
