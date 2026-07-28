import { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { eventsService } from '@/services/eventsService';
import { EventCategory } from '@/types';

export default function AdminCategories() {
  const [categorias, setCategorias] = useState<EventCategory[]>([]);

  useEffect(() => {
    eventsService.listCategories().then(setCategorias);
  }, []);

  return (
    <>
      <Seo title="Categorias" />
      <h1 className="font-display text-2xl font-bold text-white">Categorias</h1>
      <p className="mt-1 text-sm text-white/50">Categorias usadas para organizar e filtrar os eventos.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categorias.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="rounded-lg bg-violet-600/15 p-2 text-violet-400">
              <Tag size={16} />
            </div>
            <div>
              <p className="font-medium text-white">{c.nome}</p>
              <p className="text-xs text-white/40">/{c.slug}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
