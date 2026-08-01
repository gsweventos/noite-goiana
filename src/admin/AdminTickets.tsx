import { useEffect, useState } from 'react';
import { Trash2, Loader2, QrCode, Download, X } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { ticketsService } from '@/services/ticketsService';
import { adminManageService } from '@/services/adminManageService';
import { generateQrDataUrl } from '@/services/qrService';
import { EVENT_ID } from '@/config/event';
import { Ticket } from '@/types';
import { formatDateTime } from '@/utils/format';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [apagando, setApagando] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [verQr, setVerQr] = useState<Ticket | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  function carregar() {
    setLoading(true);
    ticketsService.listByEvent(EVENT_ID).then((data) => {
      setTickets(data);
      setLoading(false);
    });
  }

  useEffect(carregar, []);

  async function abrirQr(t: Ticket) {
    setVerQr(t);
    setQrDataUrl(null);
    const url = await generateQrDataUrl(t.qrPayload);
    setQrDataUrl(url);
  }

  async function baixarPdf(t: Ticket) {
    if (!API_BASE_URL) {
      alert('O download do PDF só funciona com o backend configurado.');
      return;
    }
    setBaixando(t.id);
    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${t.id}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ingresso-${t.codigo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Não foi possível baixar o PDF agora. Tenta de novo em instantes.');
    } finally {
      setBaixando(null);
    }
  }

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
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => abrirQr(t)}
                      className="rounded-lg p-1.5 text-white/40 hover:bg-violet-500/10 hover:text-violet-300"
                      aria-label="Ver QR Code"
                      title="Ver QR Code"
                    >
                      <QrCode size={15} />
                    </button>
                    <button
                      onClick={() => baixarPdf(t)}
                      disabled={baixando === t.id}
                      className="rounded-lg p-1.5 text-white/40 hover:bg-violet-500/10 hover:text-violet-300 disabled:opacity-50"
                      aria-label="Baixar PDF"
                      title="Baixar PDF"
                    >
                      {baixando === t.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                    </button>
                    <button
                      onClick={() => apagar(t)}
                      disabled={apagando === t.id}
                      className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      aria-label="Apagar ingresso"
                      title="Apagar ingresso"
                    >
                      {apagando === t.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal simples de visualização do QR Code */}
      {verQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setVerQr(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border border-white/10 bg-ink-900 p-6 text-center"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{verQr.codigo}</span>
              <button onClick={() => setVerQr(null)} className="rounded-lg p-1 text-white/40 hover:bg-white/5" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
            <p className="mt-1 text-xs text-white/40">{verQr.compradorNome}</p>

            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code do ingresso ${verQr.codigo}`} className="mx-auto mt-4 h-56 w-56 rounded-xl bg-white p-2" />
            ) : (
              <div className="mx-auto mt-4 flex h-56 w-56 items-center justify-center rounded-xl bg-white/5">
                <Loader2 size={20} className="animate-spin text-white/40" />
              </div>
            )}

            <button
              onClick={() => baixarPdf(verQr)}
              disabled={baixando === verQr.id}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white hover:border-violet-500/50 disabled:opacity-60"
            >
              {baixando === verQr.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Baixar PDF completo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
