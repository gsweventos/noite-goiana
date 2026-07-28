import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Save, CheckCircle2 } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { eventsService } from '@/services/eventsService';
import { EventItem, TicketLot } from '@/types';

interface EventFormValues {
  nome: string;
  descricaoCurta: string;
  descricao: string;
  imagemCapa: string;
  imagemBanner: string;
  organizador: string;
  local: string;
  endereco: string;
  cidade: string;
  estado: string;
  dataInicio: string;
  regulamento: string;
  lotes: TicketLot[];
}

/**
 * Tela única de edição da festa (não existe "lista de eventos" nem "criar
 * novo evento" — a Noite Goiana é o site de UM evento só, ver
 * src/config/event.ts).
 */
export default function AdminEvent() {
  const [saving, setSaving] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const { register, control, handleSubmit, reset } = useForm<EventFormValues>({
    defaultValues: {
      nome: '',
      descricaoCurta: '',
      descricao: '',
      imagemCapa: '',
      imagemBanner: '',
      organizador: '',
      local: '',
      endereco: '',
      cidade: '',
      estado: 'GO',
      dataInicio: '',
      regulamento: '',
      lotes: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lotes' });

  useEffect(() => {
    eventsService.getMainEvent().then((found: EventItem) => {
      reset({
        nome: found.nome,
        descricaoCurta: found.descricaoCurta,
        descricao: found.descricao,
        imagemCapa: found.imagemCapa,
        imagemBanner: found.imagemBanner,
        organizador: found.organizador,
        local: found.local.local,
        endereco: found.local.endereco,
        cidade: found.local.cidade,
        estado: found.local.estado,
        dataInicio: found.dataInicio.slice(0, 16),
        regulamento: found.regulamento,
        lotes: found.lotes,
      });
    });
  }, [reset]);

  async function onSubmit(values: EventFormValues) {
    setSaving(true);
    setSalvo(false);
    const payload: Partial<EventItem> = {
      nome: values.nome,
      descricao: values.descricao,
      descricaoCurta: values.descricaoCurta,
      imagemCapa: values.imagemCapa,
      imagemBanner: values.imagemBanner,
      organizador: values.organizador,
      local: { local: values.local, endereco: values.endereco, cidade: values.cidade, estado: values.estado },
      dataInicio: new Date(values.dataInicio).toISOString(),
      lotes: values.lotes,
      regulamento: values.regulamento,
    };

    await eventsService.update(payload);
    setSaving(false);
    setSalvo(true);
  }

  return (
    <>
      <Seo title="Editar festa" />

      <h1 className="font-display text-2xl font-bold text-white">Editar a festa</h1>
      <p className="mt-1 text-sm text-white/50">Essas informações aparecem direto na página inicial do site.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-display text-sm font-bold text-white">Informações gerais</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Nome da festa" className="sm:col-span-2"><input {...register('nome', { required: true })} className="input" /></F>
            <F label="Organizador"><input {...register('organizador')} className="input" /></F>
            <F label="Frase de destaque (aparece no topo do site)" className="sm:col-span-2">
              <textarea {...register('descricao')} rows={2} className="input resize-none" />
            </F>
            <F label="Descrição curta (usada no compartilhamento/SEO)" className="sm:col-span-2">
              <input {...register('descricaoCurta')} className="input" />
            </F>
            <F label="Imagem de capa (URL)"><input {...register('imagemCapa')} className="input" /></F>
            <F label="Imagem de banner (URL)"><input {...register('imagemBanner')} className="input" /></F>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-display text-sm font-bold text-white">Local e data</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Nome do local"><input {...register('local')} className="input" placeholder="Ex: Espaço Vitória" /></F>
            <F label="Endereço"><input {...register('endereco')} className="input" placeholder="Deixe em branco se ainda não definiu" /></F>
            <F label="Cidade"><input {...register('cidade')} className="input" /></F>
            <F label="Estado"><input {...register('estado')} maxLength={2} className="input" /></F>
            <F label="Data e hora"><input type="datetime-local" {...register('dataInicio')} className="input" /></F>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-white">Lotes de ingresso</h2>
              <p className="mt-1 text-xs text-white/40">Sem nenhum lote aqui, o site mostra "Lotes em breve" para os visitantes.</p>
            </div>
            <button
              type="button"
              onClick={() => append({ id: `lot-${Date.now()}`, nome: '', preco: 0, quantidadeTotal: 0, quantidadeVendida: 0, dataInicio: '', dataFim: '', ativo: true })}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white hover:border-violet-500/50"
            >
              <Plus size={13} /> Adicionar lote
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-4">
                <F label="Nome do lote"><input {...register(`lotes.${index}.nome` as const)} className="input" placeholder="Ex: 1º Lote" /></F>
                <F label="Preço (R$)"><input type="number" step="0.01" {...register(`lotes.${index}.preco` as const, { valueAsNumber: true })} className="input" /></F>
                <F label="Quantidade"><input type="number" {...register(`lotes.${index}.quantidadeTotal` as const, { valueAsNumber: true })} className="input" /></F>
                <div className="flex items-end justify-between gap-2">
                  <label className="flex items-center gap-2 pb-2 text-sm text-white/70">
                    <input type="checkbox" {...register(`lotes.${index}.ativo` as const)} className="h-4 w-4 rounded border-white/20 bg-ink-900 accent-violet-600" />
                    Ativo para venda
                  </label>
                  <button type="button" onClick={() => remove(index)} className="mb-1 rounded-lg p-2 text-red-400 hover:bg-red-500/10" aria-label="Remover lote">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/40">
                Nenhum lote cadastrado ainda.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-display text-sm font-bold text-white">Regulamento</h2>
          <textarea {...register('regulamento')} rows={3} className="input mt-4 resize-none" />
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-neon disabled:opacity-70"
          >
            <Save size={15} /> {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          {salvo && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 size={15} /> Salvo
            </span>
          )}
        </div>
      </form>
    </>
  );
}

function F({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
      {children}
    </label>
  );
}
