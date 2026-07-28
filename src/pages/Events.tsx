import { useEffect, useState } from 'react';
import { Seo } from '@/components/Seo';
import { EventCard } from '@/components/EventCard';
import { EventFilters } from '@/components/EventFilters';
import { Spinner } from '@/components/Spinner';
import { eventsService } from '@/services/eventsService';
import { EventItem, EventCategory } from '@/types';

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categorias, setCategorias] = useState<EventCategory[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<{ cidade: string; categoriaId: string; precoMax?: number; busca: string }>({
    cidade: '',
    categoriaId: '',
    precoMax: undefined,
    busca: '',
  });

  useEffect(() => {
    Promise.all([eventsService.listCategories(), eventsService.listCities()]).then(([cats, cities]) => {
      setCategorias(cats);
      setCidades(cities);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      eventsService.listPublished(filters).then((data) => {
        setEvents(data);
        setLoading(false);
      });
    }, 200); // pequeno debounce para a busca por texto
    return () => clearTimeout(timeout);
  }, [filters]);

  return (
    <>
      <Seo title="Eventos" description="Encontre shows, baladas, festas universitárias e festivais em Goiás." />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Eventos</h1>
        <p className="mt-2 text-white/50">Filtre por cidade, categoria e preço para encontrar seu próximo rolê.</p>

        <div className="mt-8">
          <EventFilters
            cidades={cidades}
            categorias={categorias}
            cidade={filters.cidade}
            categoriaId={filters.categoriaId}
            precoMax={filters.precoMax}
            busca={filters.busca}
            onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          />
        </div>

        <div className="mt-10">
          {loading ? (
            <Spinner fullScreen />
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-16 text-center text-white/50">
              Nenhum evento encontrado com esses filtros. Tente ajustar a busca.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {events.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
