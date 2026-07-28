import { Search } from 'lucide-react';
import { EventCategory } from '@/types';

interface Props {
  cidades: string[];
  categorias: EventCategory[];
  cidade: string;
  categoriaId: string;
  precoMax: number | undefined;
  busca: string;
  onChange: (patch: Partial<{ cidade: string; categoriaId: string; precoMax: number | undefined; busca: string }>) => void;
}

const PRECO_OPCOES = [
  { label: 'Qualquer preço', value: undefined },
  { label: 'Até R$ 50', value: 50 },
  { label: 'Até R$ 100', value: 100 },
  { label: 'Até R$ 200', value: 200 },
];

export function EventFilters({ cidades, categorias, cidade, categoriaId, precoMax, busca, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
        <input
          type="search"
          value={busca}
          onChange={(e) => onChange({ busca: e.target.value })}
          placeholder="Buscar evento pelo nome..."
          className="w-full rounded-xl border border-white/10 bg-ink-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-violet-500"
        />
      </div>

      <select
        value={cidade}
        onChange={(e) => onChange({ cidade: e.target.value })}
        className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white focus:border-violet-500"
      >
        <option value="">Todas as cidades</option>
        {cidades.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={categoriaId}
        onChange={(e) => onChange({ categoriaId: e.target.value })}
        className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white focus:border-violet-500"
      >
        <option value="">Todas as categorias</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <select
        value={precoMax ?? ''}
        onChange={(e) => onChange({ precoMax: e.target.value ? Number(e.target.value) : undefined })}
        className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2.5 text-sm text-white focus:border-violet-500"
      >
        {PRECO_OPCOES.map((o) => (
          <option key={o.label} value={o.value ?? ''}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
