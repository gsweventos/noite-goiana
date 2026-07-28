import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Save } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { eventsService } from '@/services/eventsService';
import { EventCategory, EventItem, TicketLot } from '@/types';

interface EventFormValues {
  nome: string;
  descricaoCurta: string;
  descricao: string;
  imagemCapa: string;
  imagemBanner: string;
  categoriaId: string;
  organizador: string;
  local: string;
  endereco: string;
  cidade: string;
  estado: string;
  dataInicio: string;
  dataFim: string;
  capacidade: number;
  regulamento: string;
  lotes: TicketLot[];
}

export default function AdminEventForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id) && id !== 'novo';
  const navigate = useNavigate();
  const [categorias, setCategorias] = useState<EventCategory[]>([]);
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, reset } = useForm<EventFormValues>({
    defaultValues: {
      nome: '',
      descricaoCurta: '',
      descricao: '',
      imagemCapa: '',
      imagemBanner: '',
      categoriaId: '',
      organizador: '',
      local: '',
      endereco: '',
      cidade: '',
      estado: 'GO',
      dataInicio: '',
      dataFim: '',
      capacidade: 500,
      regulamento: '',
      lotes: [{ id: `lot-${Date.now()}`, nome: '1º Lote', preco: 50, quantidadeTotal: 100, quantidadeVendida: 0, dataInicio: '', dataFim: '', ativo: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lotes' });

  useEffect(() => {
    eventsService.listCategories().then(setCategorias);
  }, []);

  useEffect(() => {
    if (!isEditing || !id) return;
    eventsService.listPublished().then((events) => {
      const found = events.find((e) => e.id === id) as EventItem | undefined;
      if (found) {
        reset({
          nome: found.nome,
          descricaoCurta: found.descricaoCurta,
          descricao: found.descricao,
          imagemCapa: found.imagemCapa,
          imagemBanner: found.imagemBanner,
          categoriaId: found.categoriaId,
          organizador: found.organizador,
          local: found.local.local,
          endereco: found.local.endereco,
          cidade: found.local.cidade,
          estado: found.local.estado,
          dataInicio: found.dataInicio.slice(0, 16),
          dataFim: found.dataFim.slice(0, 16),
          capacidade: found.capacidade,
          regulamento: found.regulamento,
          lotes: found.lotes,
        });
      }
    });
  }, [id, isEditing, reset]);

  async function onSubmit(values: EventFormValues) {
    setSaving(true);
    const payload: Omit<EventItem, 'id' | 'criadoEm'> = {
      slug: values.nome.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      nome: values.nome,
      descricao: values.descricao,
      descricaoCurta: values.descricaoCurta,
      imagemCapa: values.imagemCapa,
      imagemBanner: values.imagemBanner,
      categoriaId: values.categoriaId,
      organizador: values.organizador,
      local: { local: values.local, endereco: values.endereco, cidade: values.cidade, estado: values.estado },
      dataInicio: new Date(values.dataInicio).toISOString(),
      dataFim: new Date(values.dataFim).toISOString(),
      capacidade: Number(values.capacidade),
      lotes: values.lotes,
      regulamento: values.regulamento,
      status: 'publicado',
    };

    if (isEditing && id) {
      await eventsService.update(id, payload);
    } else {
      await eventsService.create(payload);
    }
    setSaving(false);
    navigate('/admin/eventos');
  }

  return (
    <>
      <Seo title={isEditing ? 'Editar evento' : 'Novo evento'} />

      <h1 className="font-display text-2xl font-bold text-white">{isEditing ? 'Editar evento' : 'Novo evento'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-display text-sm font-bold text-white">Informações gerais</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Nome do evento" className="sm:col-span-2"><input {...register('nome', { required: true })} className="input" /></F>
            <F label="Organizador"><input {...register('organizador')} className="input" /></F>
            <F label="Categoria">
              <select {...register('categoriaId')} className="input">
                <option value="">Selecione</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </F>
            <F label="Descrição curta (usada nos cards)" className="sm:col-span-2">
              <input {...register('descricaoCurta')} className="input" />
            </F>
            <F label="Descrição completa" className="sm:col-span-2">
              <textarea {...register('descricao')} rows={4} className="input resize-none" />
            </F>
            <F label="Imagem de capa (URL)"><input {...register('imagemCapa')} className="input" /></F>
            <F label="Imagem de banner (URL)"><input {...register('imagemBanner')} className="input" /></F>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-display text-sm font-bold text-white">Local e data</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <F label="Nome do local"><input {...register('local')} className="input" /></F>
            <F label="Endereço"><input {...register('endereco')} className="input" /></F>
            <F label="Cidade"><input {...register('cidade')} className="input" /></F>
            <F label="Estado"><input {...register('estado')} maxLength={2} className="input" /></F>
            <F label="Data e hora de início"><input type="datetime-local" {...register('dataInicio')} className="input" /></F>
            <F label="Data e hora de término"><input type="datetime-local" {...register('dataFim')} className="input" /></F>
            <F label="Capacidade total"><input type="number" {...register('capacidade')} className="input" /></F>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-white">Lotes</h2>
            <button
              type="button"
              onClick={() => append({ id: `lot-${Date.now()}`, nome: '', preco: 0, quantidadeTotal: 0, quantidadeVendida: 0, dataInicio: '', dataFim: '', ativo: true })}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white hover:border-violet-500/50"
            >
              <Plus size={13} /> Adicionar lote
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 p-4 sm:grid-cols-5">
                <F label="Nome do lote"><input {...register(`lotes.${index}.nome` as const)} className="input" /></F>
                <F label="Preço (R$)"><input type="number" step="0.01" {...register(`lotes.${index}.preco` as const, { valueAsNumber: true })} className="input" /></F>
                <F label="Quantidade"><input type="number" {...register(`lotes.${index}.quantidadeTotal` as const, { valueAsNumber: true })} className="input" /></F>
                <F label="Início das vendas"><input type="date" {...register(`lotes.${index}.dataInicio` as const)} className="input" /></F>
                <div className="flex items-end justify-between gap-2">
                  <F label="Fim das vendas"><input type="date" {...register(`lotes.${index}.dataFim` as const)} className="input" /></F>
                  <button type="button" onClick={() => remove(index)} className="mb-1 rounded-lg p-2 text-red-400 hover:bg-red-500/10" aria-label="Remover lote">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-display text-sm font-bold text-white">Regulamento</h2>
          <textarea {...register('regulamento')} rows={3} className="input mt-4 resize-none" />
        </section>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-neon disabled:opacity-70"
        >
          <Save size={15} /> {saving ? 'Salvando...' : 'Salvar evento'}
        </button>
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
