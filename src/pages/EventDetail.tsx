import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, Users, ShieldAlert } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Spinner } from '@/components/Spinner';
import { eventsService } from '@/services/eventsService';
import { EventItem, TicketLot } from '@/types';
import { formatCurrency, formatDateTime, lotProgress } from '@/utils/format';

export default function EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventItem | null | undefined>(undefined);
  const [selectedLot, setSelectedLot] = useState<TicketLot | null>(null);

  useEffect(() => {
    if (!slug) return;
    eventsService.getBySlug(slug).then((data) => {
      setEvent(data);
      const ativo = data?.lotes.find((l) => l.ativo && l.quantidadeVendida < l.quantidadeTotal);
      setSelectedLot(ativo ?? data?.lotes[0] ?? null);
    });
  }, [slug]);

  if (event === undefined) return <Spinner fullScreen />;
  if (event === null) return <Navigate to="/eventos" replace />;

  const loteAtual = event.lotes.find((l) => l.ativo) ?? event.lotes[event.lotes.length - 1];
  const restantes = loteAtual ? loteAtual.quantidadeTotal - loteAtual.quantidadeVendida : 0;
  const esgotado = event.status === 'esgotado' || event.lotes.every((l) => l.quantidadeVendida >= l.quantidadeTotal);

  const mapQuery = encodeURIComponent(`${event.local.local}, ${event.local.endereco}, ${event.local.cidade} - ${event.local.estado}`);

  return (
    <>
      <Seo title={event.nome} description={event.descricaoCurta} image={event.imagemBanner} />

      {/* Banner */}
      <section className="relative">
        <div className="relative h-[42vh] min-h-[320px] overflow-hidden sm:h-[52vh]">
          <img src={event.imagemBanner} alt={event.nome} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        </div>

        <div className="mx-auto -mt-24 max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-white/10 bg-ink-900/90 p-6 backdrop-blur sm:p-10"
          >
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">{event.nome}</h1>
            <p className="mt-2 text-white/50">Organizado por {event.organizador}</p>

            <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-white/70 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-violet-400" /> {formatDateTime(event.dataInicio)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-violet-400" /> {event.local.local}, {event.local.cidade} - {event.local.estado}
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-violet-400" /> Capacidade para {event.capacidade.toLocaleString('pt-BR')} pessoas
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        {/* Conteúdo principal */}
        <div className="space-y-10 lg:col-span-2">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Sobre o evento</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-white/60">{event.descricao}</p>
          </div>

          <div>
            <h2 className="font-display text-xl font-bold text-white">Local</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
              <iframe
                title={`Mapa de ${event.local.local}`}
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                className="h-72 w-full grayscale invert-[0.9] contrast-[1.1]"
                loading="lazy"
              />
            </div>
            <p className="mt-3 text-sm text-white/50">
              {event.local.local} — {event.local.endereco}, {event.local.cidade} - {event.local.estado}
            </p>
          </div>

          <div>
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
              <ShieldAlert size={18} className="text-violet-400" /> Regulamento
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/50">{event.regulamento}</p>
          </div>
        </div>

        {/* Card de compra */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-display text-lg font-bold text-white">Ingressos</h3>

            <div className="mt-4 space-y-3">
              {event.lotes.map((lot) => {
                const lotEsgotado = lot.quantidadeVendida >= lot.quantidadeTotal;
                const progresso = lotProgress(lot.quantidadeVendida, lot.quantidadeTotal);
                const selecionado = selectedLot?.id === lot.id;
                return (
                  <button
                    key={lot.id}
                    disabled={lotEsgotado || !lot.ativo}
                    onClick={() => setSelectedLot(lot)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      selecionado ? 'border-violet-500 bg-violet-600/10' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{lot.nome}</span>
                      <span className="font-display text-sm font-bold text-white">{formatCurrency(lot.preco)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cta-gradient" style={{ width: `${progresso}%` }} />
                    </div>
                    <span className="mt-1 block text-[11px] text-white/40">
                      {lotEsgotado ? 'Esgotado' : !lot.ativo ? 'Em breve' : `${lot.quantidadeTotal - lot.quantidadeVendida} restantes`}
                    </span>
                  </button>
                );
              })}
            </div>

            {loteAtual && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-white/40">
                <Clock size={13} /> Lote atual: {loteAtual.nome} · {restantes} ingressos restantes
              </p>
            )}

            <Link
              to={esgotado || !selectedLot ? '#' : `/checkout/${event.slug}?lote=${selectedLot.id}`}
              aria-disabled={esgotado || !selectedLot}
              className={`mt-6 block rounded-full px-6 py-3.5 text-center text-sm font-semibold text-white transition-transform ${
                esgotado || !selectedLot
                  ? 'cursor-not-allowed bg-white/10 text-white/40'
                  : 'bg-cta-gradient shadow-neon hover:scale-[1.02]'
              }`}
            >
              {esgotado ? 'Ingressos esgotados' : 'Comprar ingresso'}
            </Link>
          </div>
        </aside>
      </section>
    </>
  );
}
