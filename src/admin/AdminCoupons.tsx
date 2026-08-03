import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Tag, Loader2, CheckCircle2, Trash2, Plus } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { couponService } from '@/services/couponService';
import { Coupon } from '@/types';

interface CouponFormValues {
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  ativo: boolean;
  usosMaximos: number | '';
  validoAte: string;
}

export default function AdminCoupons() {
  const [cupons, setCupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [apagando, setApagando] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CouponFormValues>({
    defaultValues: { tipo: 'percentual', valor: 10, ativo: true, usosMaximos: '', validoAte: '' },
  });

  function carregar() {
    setLoading(true);
    couponService.listarAdmin().then((data) => {
      setCupons(data);
      setLoading(false);
    });
  }

  useEffect(carregar, []);

  async function onSubmit(values: CouponFormValues) {
    setErro(null);
    setSucesso(false);
    setSaving(true);
    try {
      await couponService.salvar({
        codigo: values.codigo,
        tipo: values.tipo,
        valor: Number(values.valor),
        ativo: values.ativo,
        usosMaximos: values.usosMaximos === '' ? undefined : Number(values.usosMaximos),
        validoAte: values.validoAte || undefined,
      });
      setSucesso(true);
      reset({ tipo: 'percentual', valor: 10, ativo: true, usosMaximos: '', validoAte: '' });
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o cupom.');
    } finally {
      setSaving(false);
    }
  }

  async function apagar(codigo: string) {
    if (!confirm(`Apagar o cupom "${codigo}"?\n\nQuem já usou continua com o desconto aplicado — isso só impede novos usos.`)) return;
    setApagando(codigo);
    try {
      await couponService.apagar(codigo);
      setCupons((prev) => prev.filter((c) => c.codigo !== codigo));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Não foi possível apagar.');
    } finally {
      setApagando(null);
    }
  }

  return (
    <>
      <Seo title="Cupons de desconto" />

      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-600/15 p-2.5 text-violet-400">
          <Tag size={20} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Cupons de desconto</h1>
          <p className="text-sm text-white/50">O desconto é sempre conferido de novo no servidor na hora do pagamento — nunca só na tela.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <F label="Código do cupom" error={errors.codigo?.message}>
            <input
              {...register('codigo', { required: 'Obrigatório', minLength: { value: 2, message: 'Muito curto' } })}
              className="input uppercase"
              placeholder="Ex: NOITE10"
              style={{ textTransform: 'uppercase' }}
            />
          </F>

          <F label="Tipo de desconto">
            <select {...register('tipo')} className="input">
              <option value="percentual">Percentual (%)</option>
              <option value="fixo">Valor fixo (R$)</option>
            </select>
          </F>

          <F label="Valor do desconto">
            <input type="number" step="0.01" min={0} {...register('valor', { required: true, valueAsNumber: true, min: 0 })} className="input" />
          </F>

          <F label="Limite de usos (opcional)">
            <input type="number" min={1} {...register('usosMaximos')} className="input" placeholder="Sem limite" />
          </F>

          <F label="Válido até (opcional)">
            <input type="date" {...register('validoAte')} className="input" />
          </F>

          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-white/70">
            <input type="checkbox" {...register('ativo')} className="h-4 w-4 rounded border-white/20 bg-ink-900 accent-violet-600" />
            Ativo
          </label>
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}
        {sucesso && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle2 size={15} /> Cupom salvo!
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-neon disabled:opacity-70"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {saving ? 'Salvando...' : 'Salvar cupom'}
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Desconto</th>
              <th className="px-4 py-3 font-medium">Usos</th>
              <th className="px-4 py-3 font-medium">Válido até</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-white/40">Carregando...</td></tr>
            )}
            {!loading && cupons.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-white/40">Nenhum cupom cadastrado ainda.</td></tr>
            )}
            {cupons.map((c) => (
              <tr key={c.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-white">{c.codigo}</td>
                <td className="px-4 py-3 text-white/70">{c.tipo === 'percentual' ? `${c.valor}%` : `R$ ${c.valor.toFixed(2)}`}</td>
                <td className="px-4 py-3 text-white/50">{c.usosAtuais}{c.usosMaximos ? ` / ${c.usosMaximos}` : ' (sem limite)'}</td>
                <td className="px-4 py-3 text-white/50">{c.validoAte ? new Date(c.validoAte).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${c.ativo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/10 text-white/50'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => apagar(c.codigo)}
                    disabled={apagando === c.codigo}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    aria-label="Apagar cupom"
                  >
                    {apagando === c.codigo ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function F({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-white/60">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
