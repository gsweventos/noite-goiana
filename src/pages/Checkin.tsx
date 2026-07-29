import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ScanLine } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { useAuth } from '@/context/AuthContext';
import { checkinService, CheckinResponse } from '@/services/checkinService';
import { formatDateTime } from '@/utils/format';

/**
 * Página exclusiva de check-in (/checkin), protegida por RequireAdmin no router.
 * Usa html5-qrcode para acessar a câmera e ler o QR Code do ingresso.
 */
export default function Checkin() {
  const { user } = useAuth();
  const scannerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [totalCheckins, setTotalCheckins] = useState(0);

  // Usamos refs (não useState) pra travar leituras duplicadas: o leitor de
  // câmera pode disparar o callback mais de uma vez para o MESMO QR Code em
  // uma fração de segundo (varre a cada frame), e o estado do React só
  // atualiza no próximo render — rápido demais pra esse controle. A ref
  // muda na hora, então a segunda leitura é ignorada de verdade antes de
  // chegar a chamar o backend (evitando o falso "já utilizado").
  const processandoRef = useRef(false);
  const html5QrCodeRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (cancelled || !scannerRef.current) return;
      const html5QrCode = new Html5Qrcode('checkin-reader');
      html5QrCodeRef.current = html5QrCode;

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (processandoRef.current) return; // já tem uma leitura em andamento — ignora
            processandoRef.current = true;

            // Congela a câmera no frame atual assim que detecta um código,
            // pra parar de tentar ler novos frames enquanto mostra o resultado.
            try {
              await html5QrCode.pause(true);
            } catch {
              /* se já estiver pausado/parado, tudo bem */
            }

            try {
              const response = await checkinService.validateQr(decodedText, user?.id ?? 'operador');
              setResult(response);
              if (response.resultado === 'autorizado') setTotalCheckins((c) => c + 1);
            } finally {
              processandoRef.current = false;
            }
          },
          () => {
            /* erro de leitura por frame — ignorado silenciosamente */
          }
        );
      } catch {
        // Câmera indisponível (ex.: sem permissão ou ambiente sem hardware de vídeo).
      }
    })();

    return () => {
      cancelled = true;
      html5QrCodeRef.current?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function novoScan() {
    setResult(null);
    try {
      html5QrCodeRef.current?.resume();
    } catch {
      /* se não der pra retomar (ex.: câmera já parada), o próximo useEffect cuida */
    }
  }

  return (
    <>
      <Seo title="Check-in de ingressos" />

      <section className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-white">Check-in</h1>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
            {totalCheckins} entradas confirmadas
          </span>
        </div>
        <p className="mt-1 text-sm text-white/50">Operador: {user?.nome}</p>

        <div className={`mt-6 overflow-hidden rounded-2xl border border-white/10 ${result ? 'hidden' : ''}`}>
          <div id="checkin-reader" ref={scannerRef} className="aspect-square w-full bg-black" />
          <div className="flex items-center justify-center gap-2 bg-white/5 py-3 text-xs text-white/50">
            <ScanLine size={14} className="animate-pulse-slow text-violet-400" /> Aponte a câmera para o QR Code do ingresso
          </div>
        </div>

        {result && (
          <div
            className={`mt-6 rounded-2xl border p-8 text-center ${
              result.resultado === 'autorizado'
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-red-500/40 bg-red-500/10'
            }`}
          >
            {result.resultado === 'autorizado' && <CheckCircle2 className="mx-auto text-emerald-400" size={56} />}
            {result.resultado === 'ja_utilizado' && <AlertTriangle className="mx-auto text-amber-400" size={56} />}
            {result.resultado === 'invalido' && <XCircle className="mx-auto text-red-400" size={56} />}

            <h2 className="mt-4 font-display text-xl font-bold text-white">
              {result.resultado === 'autorizado' && 'Entrada autorizada'}
              {result.resultado === 'ja_utilizado' && 'Ingresso já utilizado'}
              {result.resultado === 'invalido' && 'Ingresso inexistente'}
            </h2>

            {result.ticket && (
              <div className="mt-4 space-y-1 text-sm text-white/70">
                <p className="font-medium text-white">{result.ticket.nome}</p>
                <p>{result.ticket.evento}</p>
                <p className="text-white/40">{result.ticket.lote} · {result.ticket.codigo}</p>
                <p className="text-xs text-white/30">{formatDateTime(new Date().toISOString())}</p>
              </div>
            )}

            <button
              onClick={novoScan}
              className="mt-6 rounded-full bg-cta-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-neon"
            >
              Ler próximo ingresso
            </button>
          </div>
        )}
      </section>
    </>
  );
}
