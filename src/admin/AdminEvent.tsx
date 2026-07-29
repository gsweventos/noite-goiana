import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Save, CheckCircle2, Loader2 } from 'lucide-react';
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
  avisoImportante: string;
  cortesiasTotal: number;
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
  const [apagandoLote, setApagandoLote] = useState<string | null>(null);

  const { register, control, handleSubmit, reset, getValues } = useForm<EventFormValues>({
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
      avisoImportante: '',
      cortesiasTotal: 0,
      lotes: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lotes' });
  const [lotesSalvos, setLotesSalvos] = useState<string[]>([]);

  function carregar() {
    return eventsService.getMainEvent().then((found: EventItem) => {
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
        avisoImportante: found.avisoImportante ?? '',
        cortesiasTotal: found.cortesias?.quantidadeTotal ?? 0,
        lotes: found.lotes,
      });
      setLotesSalvos(found.lotes.map((l) => l.id));
      return found;
    });
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  /**
   * Apaga um lote. Se ele já estiver salvo no banco, apaga NA HORA (sem
   * precisar mexer/salvar o resto do formulário) — busca o evento de
   * verdade, remove só esse lote e já grava. Se for um lote recém-
   * adicionado (ainda não salvo), só tira do formulário, sem precisar
   * chamar o backend.
   *
   * ⚠️ Não use isso pra apagar um lote que já tenha ingressos vendidos —
   * os ingressos já emitidos continuam existindo, só "perdem" o lote de
   * origem. Pra lotes de teste sem venda, é seguro e rápido.
   */
  async function excluirLote(index: number, loteId: string, nomeLote: string) {
    if (!lotesSalvos.includes(loteId)) {
      remove(index); // ainda nem foi salvo — só tira do formulário
      return;
    }

    const confirmado = confirm(`Apagar o lote "${nomeLote || 'sem nome'}" agora mesmo?\n\nIsso salva na hora, sem precisar clicar em "Salvar alterações".`);
    if (!confirmado) return;

    setApagandoLote(loteId);
    try {
      const atual = await eventsService.getMainEvent();
      const novosLotes = atual.lotes.filter((l) => l.id !== loteId);
      await eventsService.update({ ...atual, lotes: novosLotes });
      await carregar(); // atualiza o formulário com o resultado real
    } catch {
      alert('Não foi possível apagar o lote agora. Tenta de novo em instantes.');
    } finally {
      setApagandoLote(null);
    }
  }

  async function onSubmit(values: EventFormValues) {
    setSaving(true);
    setSalvo(false);

    // Busca o evento completo atual e mescla por cima, garantindo que campos
    // internos (status, slug, capacidade, etc.) nunca fiquem ausentes no
    // documento salvo — mesmo que esse formulário não os edite diretamente.
    const atual = await eventsService.getMainEvent();
    const payload: EventItem = {
      ...atual,
      nome: values.nome,
      descricao: values.descricao,
      descricaoCurta: values.descricaoCurta,
      imagemCapa: values.imagemCapa,
      imagemBanner: values.imagemBanner,
      organizador: values.organizador,
      local: { local: values.local, endereco: values.endereco, cidade: values.cidade, estado: values.estado },
      dataInicio: new Date(values.dataInicio).toISOString(),
      lotes: values.lotes.map((lote) => ({
        ...lote,
        genero: lote.genero || undefined,
        grupo: lote.grupo || undefined,
      })),
      regulamento: values.regulamento,
      avisoImportante: values.avisoImportante || undefined,
      cortesias: {
        quantidadeTotal: values.cortesiasTotal || 0,
        quantidadeUsada: atual.cortesias?.quantidadeUsada ?? 0,
      },
      status: 'publicado',
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
              <p className="mt-1 text-xs text-white/40">
                O <strong>preço que você digita aqui é o valor base</strong> — o site soma automaticamente 10% de taxa de
                serviço em cima disso na hora de mostrar e cobrar do comprador (ele vê os dois valores separados no checkout).
                Os lotes ficam disponíveis <strong>na ordem em que aparecem aqui embaixo</strong>: assim que todos os ingressos
                de um lote (ou par feminino/masculino do mesmo "Grupo") esgotam, o próximo da lista libera sozinho no site —
                não precisa mexer em nada. O checkbox "Ativo" é só pra pausar manualmente um lote específico, se precisar.
                Pra ter preço diferente pra homem e mulher no mesmo lote: cadastra dois lotes com o <strong>mesmo texto em "Grupo"</strong> (ex: "1º Lote" nos dois) e define o "Gênero" de cada um.
              </p>
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
              <div key={field.id} className="space-y-3 rounded-xl border border-white/10 p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <F label="Nome do lote"><input {...register(`lotes.${index}.nome` as const)} className="input" placeholder="Ex: 1º Lote" /></F>
                  <F label="Preço base (R$)"><input type="number" step="0.01" {...register(`lotes.${index}.preco` as const, { valueAsNumber: true })} className="input" /></F>
                  <F label="Quantidade"><input type="number" {...register(`lotes.${index}.quantidadeTotal` as const, { valueAsNumber: true })} className="input" /></F>
                  <div className="flex items-end justify-between gap-2">
                    <label className="flex items-center gap-2 pb-2 text-sm text-white/70">
                      <input type="checkbox" {...register(`lotes.${index}.ativo` as const)} className="h-4 w-4 rounded border-white/20 bg-ink-900 accent-violet-600" />
                      Ativo
                    </label>
                    <button
                      type="button"
                      onClick={() => excluirLote(index, getValues(`lotes.${index}.id`), getValues(`lotes.${index}.nome`))}
                      disabled={apagandoLote === getValues(`lotes.${index}.id`)}
                      className="mb-1 rounded-lg p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      aria-label="Apagar lote"
                    >
                      {apagandoLote === getValues(`lotes.${index}.id`) ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
                  <F label="Gênero (opcional)">
                    <select {...register(`lotes.${index}.genero` as const)} className="input">
                      <option value="">Unissex (sem diferença)</option>
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                    </select>
                  </F>
                  <F label="Grupo (opcional)">
                    <input {...register(`lotes.${index}.grupo` as const)} className="input" placeholder="Ex: 1º Lote (deixe igual no par F/M)" />
                  </F>
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

        <section className="rounded-2xl border border-violet-500/20 bg-violet-600/[0.03] p-6">
          <h2 className="font-display text-sm font-bold text-white">Cortesias</h2>
          <p className="mt-1 text-xs text-white/40">
            Reserva separada dos lotes de venda — não desconta deles nem aparece pro público. Defina aqui quantas cortesias
            você quer poder liberar no total; depois é só usar a tela <span className="text-white/70">Cortesias</span> no menu pra ir distribuindo.
          </p>
          <div className="mt-4 max-w-xs">
            <F label="Total de cortesias reservadas">
              <input type="number" min={0} {...register('cortesiasTotal', { valueAsNumber: true, min: 0 })} className="input" />
            </F>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-6">
          <h2 className="font-display text-sm font-bold text-amber-200">Aviso em destaque no site</h2>
          <p className="mt-1 text-xs text-white/40">Aparece bem visível na página inicial, logo acima dos ingressos (ex: aviso de conferência de documento). Deixe em branco pra não mostrar nada.</p>
          <textarea {...register('avisoImportante')} rows={2} className="input mt-4 resize-none" placeholder="Ex: Ingressos femininos e masculinos têm valores diferentes. Documento com foto será conferido na entrada." />
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
