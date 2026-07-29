import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Gift, Loader2, CheckCircle2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { eventsService } from '@/services/eventsService';
import { courtesyService } from '@/services/courtesyService';
import { adminManageService } from '@/services/adminManageService';
import { EventItem } from '@/types';
import { isValidCpf, maskCpf, maskDate, maskPhone } from '@/utils/format';

interface CourtesyFormValues {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  dataNascimento: string;
  quantidade: number;
  motivo: string;
}

/**
 * Tela para o admin liberar ingresso(s) sem cobrar nada (cortesia). Usa uma
 * reserva PRÓPRIA, separada dos lotes de venda — não desconta deles, e não
 * aparece pro público em nenhum momento. O ingresso gerado é idêntico a um
 * comprado: tem QR Code, aparece no painel da pessoa, passa no check-in.
 */
export default function AdminCourtesy() {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [corrigindo, setCorrigindo] = useState(false);
  const [resultadoCorrecao, setResultadoCorrecao] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CourtesyFormValues>({
    defaultValues: { quantidade: 1 },
  });

  function carregar() {
    return eventsService.getMainEvent().then(setEvent);
  }

  useEffect(() => {
    carregar();
  }, []);

  const total = event?.cortesias?.quantidadeTotal ?? 0;
  const usadas = event?.cortesias?.quantidadeUsada ?? 0;
  const disponiveis = total - usadas;

  async function corrigirAntigas() {
    setCorrigindo(true);
    setResultadoCorrecao(null);
    try {
      const resultado = await adminManageService.corrigirCortesiasAntigas();
      setResultadoCorrecao(
        resultado.corrigidos > 0
          ? `Pronto! ${resultado.corrigidos} cortesia(s) antiga(s) corrigida(s).`
          : (resultado.mensagem ?? 'Nada para corrigir.')
      );
      await carregar();
    } catch (e) {
      setResultadoCorrecao(e instanceof Error ? e.message : 'Não foi possível corrigir.');
    } finally {
      setCorrigindo(false);
    }
  }

  async function onSubmit(values: CourtesyFormValues) {
    setErro(null);
    setSucesso(false);
    setSaving(true);
    try {
      await courtesyService.liberarCortesia({
        eventoId: event!.id,
        quantidade: Number(values.quantidade),
        comprador: {
          nome: values.nome,
          cpf: values.cpf,
          email: values.email,
          telefone: values.telefone,
          dataNascimento: values.dataNascimento || undefined,
        },
        motivo: values.motivo || undefined,
      });
      setSucesso(true);
      reset({ quantidade: 1 });
      await carregar(); // atualiza a contagem de disponíveis na tela
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível liberar a cortesia.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Seo title="Cortesias" />

      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-600/15 p-2.5 text-violet-400">
          <Gift size={20} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Cortesias</h1>
          <p className="text-sm text-white/50">
            Libera ingresso(s) sem cobrar nada — usa uma reserva própria, separada dos lotes de venda, e não aparece pro público.
          </p>
        </div>
      </div>

      {event && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-white/70">
          <Gift size={14} className="text-violet-400" />
          {total === 0
            ? 'Nenhuma reserva de cortesias configurada ainda'
            : `${disponiveis} de ${total} cortesias disponíveis`}
        </div>
      )}

      {event && total > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-white/70">Correção única: cortesias liberadas antes dessa reserva existir</p>
            <p className="mt-0.5 text-xs text-white/40">
              Se você já tinha dado cortesias antes (vinculadas a um lote de venda), clica aqui pra corrigir de vez —
              devolve a vaga pro lote e passa a contar aqui na reserva. Seguro rodar mais de uma vez.
            </p>
            {resultadoCorrecao && <p className="mt-1.5 text-xs text-emerald-400">{resultadoCorrecao}</p>}
          </div>
          <button
            type="button"
            onClick={corrigirAntigas}
            disabled={corrigindo}
            className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white hover:border-violet-500/50 disabled:opacity-60"
          >
            {corrigindo ? 'Corrigindo...' : 'Corrigir agora'}
          </button>
        </div>
      )}

      {event && total === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-sm text-white/40">
          Antes de liberar cortesias, defina quantas você quer reservar no total em{' '}
          <span className="text-white/70">Editar festa → Cortesias</span>.
        </div>
      )}

      {event && total > 0 && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Nome completo" className="sm:col-span-2" error={errors.nome?.message}>
              <input {...register('nome', { required: 'Obrigatório' })} className="input" />
            </F>

            <F label="CPF" error={errors.cpf?.message}>
              <input
                {...register('cpf', { required: 'Obrigatório', validate: (v) => isValidCpf(v) || 'CPF inválido' })}
                className="input"
                placeholder="000.000.000-00"
                value={watch('cpf') ?? ''}
                onChange={(e) => setValue('cpf', maskCpf(e.target.value), { shouldValidate: true })}
              />
            </F>

            <F label="Telefone" error={errors.telefone?.message}>
              <input
                {...register('telefone', { required: 'Obrigatório' })}
                className="input"
                placeholder="(62) 90000-0000"
                value={watch('telefone') ?? ''}
                onChange={(e) => setValue('telefone', maskPhone(e.target.value), { shouldValidate: true })}
              />
            </F>

            <F label="E-mail" error={errors.email?.message}>
              <input {...register('email', { required: 'Obrigatório' })} type="email" className="input" />
            </F>

            <F label="Data de nascimento (opcional)">
              <input
                {...register('dataNascimento')}
                className="input"
                placeholder="00/00/0000"
                value={watch('dataNascimento') ?? ''}
                onChange={(e) => setValue('dataNascimento', maskDate(e.target.value))}
              />
            </F>

            <F label={`Quantidade de ingressos (máx. ${disponiveis})`}>
              <input
                type="number"
                min={1}
                max={disponiveis}
                {...register('quantidade', { required: true, valueAsNumber: true, min: 1, max: disponiveis })}
                className="input"
              />
            </F>

            <F label="Motivo (opcional, só pra sua organização)" className="sm:col-span-2">
              <input {...register('motivo')} className="input" placeholder="Ex: Cortesia — equipe de som" />
            </F>
          </div>

          {erro && <p className="text-sm text-red-400">{erro}</p>}
          {sucesso && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 size={15} /> Cortesia liberada! O ingresso já está disponível no painel da pessoa (login com esse e-mail).
            </p>
          )}

          <button
            type="submit"
            disabled={saving || disponiveis <= 0}
            className="flex items-center gap-2 rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-neon disabled:opacity-70"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />}
            {saving ? 'Liberando...' : disponiveis <= 0 ? 'Reserva esgotada' : 'Liberar cortesia'}
          </button>
        </form>
      )}
    </>
  );
}

function F({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
