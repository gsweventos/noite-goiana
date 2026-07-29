import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams, Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Minus, Plus, ShieldCheck, Loader2, CheckCircle2, Copy, Check, QrCode, CreditCard } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Spinner } from '@/components/Spinner';
import { eventsService } from '@/services/eventsService';
import { paymentService, CreatePixResponse } from '@/services/paymentService';
import { EventItem, TicketLot } from '@/types';
import { formatCurrency, isValidCpf, isValidBirthDate, maskCpf, maskDate, maskPhone } from '@/utils/format';

const checkoutSchema = z.object({
  nome: z.string().min(3, 'Informe seu nome completo'),
  cpf: z.string().refine(isValidCpf, 'CPF inválido'),
  telefone: z.string().min(14, 'Telefone inválido'),
  email: z.string().email('E-mail inválido'),
  dataNascimento: z.string().refine(isValidBirthDate, 'Data de nascimento inválida'),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;
type Metodo = 'pix' | 'cartao';
type Step = 'quantidade' | 'dados' | 'gerando' | 'pix' | 'sucesso';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const loteId = searchParams.get('lote');

  const [event, setEvent] = useState<EventItem | null | undefined>(undefined);
  const [quantidade, setQuantidade] = useState(1);
  const [metodo, setMetodo] = useState<Metodo>('pix');
  const [step, setStep] = useState<Step>('quantidade');
  const [erro, setErro] = useState<string | null>(null);
  const [pix, setPix] = useState<CreatePixResponse | null>(null);
  const [copiado, setCopiado] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    eventsService.getMainEvent().then(setEvent);
  }, []);

  // Para de checar o status quando o componente desmontar (sai da página).
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutForm>({ resolver: zodResolver(checkoutSchema) });

  if (event === undefined) return <Spinner fullScreen />;
  if (event === null) return <Navigate to="/" replace />;

  const lote: TicketLot | undefined = event.lotes.find((l) => l.id === loteId) ?? event.lotes[0];
  if (!lote) return <Navigate to="/" replace />;

  const restantes = lote.quantidadeTotal - lote.quantidadeVendida;
  const total = lote.preco * quantidade;

  /** Fica checando o status do pagamento a cada 4s, até aprovar (ou a pessoa sair da página). */
  function iniciarPolling(paymentId: string) {
    pollingRef.current = setInterval(async () => {
      try {
        const status = await paymentService.getPaymentStatus(paymentId);
        if (status.status === 'aprovado') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setStep('sucesso');
        }
      } catch {
        // Falha isolada de uma consulta não é motivo pra parar de tentar.
      }
    }, 4000);
  }

  async function onSubmit(data: CheckoutForm) {
    setErro(null);

    if (metodo === 'pix') {
      setStep('gerando');
      try {
        const response = await paymentService.createPixPayment({
          eventoId: event!.id,
          lotId: lote!.id,
          quantidade,
          comprador: data,
        });
        setPix(response);
        setStep('pix');

        if (response.paymentId.startsWith('demo-')) {
          // Modo demonstração: simula aprovação depois de alguns segundos.
          setTimeout(() => setStep('sucesso'), 4000);
        } else {
          iniciarPolling(response.paymentId);
        }
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao gerar o Pix.');
        setStep('dados');
      }
      return;
    }

    // Cartão de crédito: mantém o fluxo de redirecionamento ao Checkout Pro.
    setStep('gerando');
    try {
      const response = await paymentService.createPreference({
        eventoId: event!.id,
        lotId: lote!.id,
        quantidade,
        comprador: data,
      });

      if (response.initPoint === '#checkout-demo') {
        await new Promise((r) => setTimeout(r, 1200));
        setStep('sucesso');
        return;
      }

      window.location.href = response.initPoint;
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao processar pagamento.');
      setStep('dados');
    }
  }

  async function copiarCodigoPix() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.qrCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <>
      <Seo title={`Comprar ingresso — ${event.nome}`} />

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-white/40 hover:text-white/70">
          ← Voltar
        </Link>

        <h1 className="mt-4 font-display text-3xl font-extrabold text-white">{event.nome}</h1>
        <p className="text-white/50">{lote.nome} · {formatCurrency(lote.preco)} por ingresso</p>

        <Stepper step={step} />

        {step === 'quantidade' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-display text-lg font-bold text-white">Quantidade de ingressos</h2>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                className="rounded-full border border-white/10 p-2 text-white hover:border-violet-500"
                aria-label="Diminuir quantidade"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-display text-xl font-bold text-white">{quantidade}</span>
              <button
                onClick={() => setQuantidade((q) => Math.min(restantes, Math.min(6, q + 1)))}
                className="rounded-full border border-white/10 p-2 text-white hover:border-violet-500"
                aria-label="Aumentar quantidade"
              >
                <Plus size={16} />
              </button>
              <span className="text-xs text-white/40">máx. 6 por compra · {restantes} disponíveis</span>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-white/60">Total</span>
              <span className="font-display text-2xl font-bold text-white">{formatCurrency(total)}</span>
            </div>

            <button
              onClick={() => setStep('dados')}
              className="mt-6 w-full rounded-full bg-cta-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.01]"
            >
              Continuar
            </button>
          </motion.div>
        )}

        {(step === 'dados' || step === 'gerando') && (
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h2 className="font-display text-lg font-bold text-white">Forma de pagamento</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodo('pix')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                  metodo === 'pix' ? 'border-violet-500 bg-violet-600/10 text-white' : 'border-white/10 text-white/60 hover:border-white/20'
                }`}
              >
                <QrCode size={16} /> Pix
              </button>
              <button
                type="button"
                onClick={() => setMetodo('cartao')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                  metodo === 'cartao' ? 'border-violet-500 bg-violet-600/10 text-white' : 'border-white/10 text-white/60 hover:border-white/20'
                }`}
              >
                <CreditCard size={16} /> Cartão de crédito
              </button>
            </div>

            <h2 className="pt-2 font-display text-lg font-bold text-white">Dados do comprador</h2>

            <Field label="Nome completo" error={errors.nome?.message}>
              <input {...register('nome')} className="input" placeholder="Como está no seu documento" />
            </Field>

            <Field label="CPF" error={errors.cpf?.message}>
              <input
                {...register('cpf')}
                className="input"
                placeholder="000.000.000-00"
                value={watch('cpf') ?? ''}
                onChange={(e) => setValue('cpf', maskCpf(e.target.value), { shouldValidate: true })}
              />
            </Field>

            <Field label="Telefone" error={errors.telefone?.message}>
              <input
                {...register('telefone')}
                className="input"
                placeholder="(62) 90000-0000"
                value={watch('telefone') ?? ''}
                onChange={(e) => setValue('telefone', maskPhone(e.target.value), { shouldValidate: true })}
              />
            </Field>

            <Field label="Data de nascimento" error={errors.dataNascimento?.message}>
              <input
                {...register('dataNascimento')}
                className="input"
                placeholder="00/00/0000"
                inputMode="numeric"
                value={watch('dataNascimento') ?? ''}
                onChange={(e) => setValue('dataNascimento', maskDate(e.target.value), { shouldValidate: true })}
              />
            </Field>

            <Field label="E-mail" error={errors.email?.message}>
              <input {...register('email')} type="email" className="input" placeholder="voce@email.com" />
            </Field>

            {erro && <p className="text-sm text-red-400">{erro}</p>}

            <div className="flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs text-white/50">
              <ShieldCheck size={16} className="shrink-0 text-violet-400" />
              Pagamento processado com segurança pelo Mercado Pago. A confirmação final é validada por webhook antes da emissão do ingresso.
            </div>

            <button
              type="submit"
              disabled={isSubmitting || step === 'gerando'}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-cta-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-neon transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {step === 'gerando' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {metodo === 'pix' ? 'Gerando o Pix...' : 'Redirecionando para o Mercado Pago...'}
                </>
              ) : (
                `Pagar ${formatCurrency(total)}`
              )}
            </button>
          </motion.form>
        )}

        {step === 'pix' && pix && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
          >
            <h2 className="font-display text-lg font-bold text-white">Escaneie o QR Code para pagar</h2>
            <p className="mt-1 text-sm text-white/50">{formatCurrency(total)} · abre o app do seu banco e escaneia</p>

            {pix.qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code do Pix"
                className="mx-auto mt-6 h-56 w-56 rounded-xl bg-white p-2"
              />
            ) : (
              <div className="mx-auto mt-6 flex h-56 w-56 items-center justify-center rounded-xl bg-white/5 text-xs text-white/40">
                (QR Code de demonstração)
              </div>
            )}

            <button
              onClick={copiarCodigoPix}
              className="mx-auto mt-5 flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:border-violet-500/50"
            >
              {copiado ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              {copiado ? 'Código copiado!' : 'Copiar código Pix'}
            </button>

            <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-2 text-xs text-white/40">
              <Loader2 size={13} className="animate-spin" />
              Aguardando confirmação do pagamento — isso é automático, não precisa recarregar a página.
            </div>
          </motion.div>
        )}

        {step === 'sucesso' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
          >
            <CheckCircle2 className="mx-auto text-emerald-400" size={44} />
            <h2 className="mt-4 font-display text-xl font-bold text-white">Pagamento aprovado!</h2>
            <p className="mt-2 text-sm text-white/60">
              Seu ingresso foi gerado com QR Code exclusivo e enviado para o seu e-mail em PDF.
            </p>
            <Link
              to="/painel"
              className="mt-6 inline-block rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-neon"
            >
              Ver meus ingressos
            </Link>
          </motion.div>
        )}
      </section>
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'quantidade', label: 'Quantidade' },
    { key: 'dados', label: 'Seus dados' },
    { key: 'sucesso', label: 'Confirmação' },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step) === -1
    ? (step === 'gerando' || step === 'pix' ? 1 : 0)
    : steps.findIndex((s) => s.key === step);

  return (
    <div className="mt-8 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              i <= activeIndex ? 'bg-cta-gradient text-white' : 'bg-white/10 text-white/40'
            }`}
          >
            {i + 1}
          </div>
          <span className={`hidden text-xs sm:block ${i <= activeIndex ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
          {i < steps.length - 1 && <div className={`h-px flex-1 ${i < activeIndex ? 'bg-violet-500' : 'bg-white/10'}`} />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
