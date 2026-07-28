import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ShieldAlert, Instagram, MessageCircle, Ticket } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Spinner } from '@/components/Spinner';
import { Logo } from '@/components/Logo';
import { eventsService } from '@/services/eventsService';
import { EventItem, TicketLot } from '@/types';
import { formatCurrency, formatDateTime, lotProgress } from '@/utils/format';

export default function Home() {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [selectedLot, setSelectedLot] = useState<TicketLot | null>(null);

  useEffect(() => {
    eventsService.getMainEvent().then((data) => {
      setEvent(data);
      const ativo = data.lotes.find((l) => l.ativo && l.quantidadeVendida < l.quantidadeTotal);
      setSelectedLot(ativo ?? data.lotes[0] ?? null);
    });
  }, []);

  if (!event) return <Spinner fullScreen />;

  const lotesDefinidos = event.lotes.length > 0;
  const esgotado = lotesDefinidos && event.lotes.every((l) => l.quantidadeVendida >= l.quantidadeTotal);
  const temLocal = Boolean(event.local.endereco);
  const mapQuery = encodeURIComponent(`${event.local.local}, ${event.local.endereco}, ${event.local.cidade} - ${event.local.estado}`);

  return (
    <>
      <Seo title={event.nome} description={event.descricaoCurta} image={event.imagemBanner} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={event.imagemBanner} alt="" className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-950/75 to-ink-950" />
          <div className="absolute inset-0 bg-grid-glow" />
        </div>

        <div className="mx-auto flex min-h-[88vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Logo className="h-20 sm:h-24" />
          </motion.div>

          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-4 rounded-full border border-violet-500/30 bg-violet-600/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-300"
          >
            Festa de Som Automotivo
          </motion.span>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-violet-400"
          >
            <Calendar size={16} /> {formatDateTime(event.dataInicio)}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 font-display text-3xl font-extrabold leading-[1.2] text-white sm:text-5xl"
          >
            {event.descricao}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4 flex items-center gap-1.5 text-white/50"
          >
            <MapPin size={15} /> {event.local.cidade} - {event.local.estado}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10"
          >
            <button
              onClick={() => document.getElementById('ingressos')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-full bg-cta-gradient px-8 py-4 text-base font-semibold text-white shadow-neon transition-transform hover:scale-105"
            >
              <Ticket size={18} /> Ver ingressos
            </button>
          </motion.div>
        </div>
      </section>

      {/* Ingressos */}
      <section id="ingressos" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
          <h2 className="font-display text-2xl font-bold text-white">Ingressos</h2>

          {!lotesDefinidos && (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
              <Ticket className="mx-auto text-violet-400" size={28} />
              <p className="mt-3 font-medium text-white">Lotes em breve</p>
              <p className="mt-1 text-sm text-white/50">
                Os valores e a quantidade de ingressos ainda serão anunciados. Acompanhe nossas redes para não perder o lançamento.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <a
                  href="https://instagram.com/noitegoiana"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:border-violet-500/50"
                >
                  <Instagram size={15} /> Instagram
                </a>
                <a
                  href="https://wa.me/5562900000000"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:border-violet-500/50"
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
              </div>
            </div>
          )}

          {lotesDefinidos && (
            <>
              <div className="mt-6 space-y-3">
                {event.lotes.map((lot) => {
                  const lotEsgotado = lot.quantidadeVendida >= lot.quantidadeTotal;
                  const progresso = lotProgress(lot.quantidadeVendida, lot.quantidadeTotal);
                  const selecionado = selectedLot?.id === lot.id;
                  return (
                    <button
                      key={lot.id}
                      disabled={lotEsgotado || !lot.ativo}
                      onClick={() => setSelectedLot(lot)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        selecionado ? 'border-violet-500 bg-violet-600/10' : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{lot.nome}</span>
                        <span className="font-display text-base font-bold text-white">{formatCurrency(lot.preco)}</span>
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

              <Link
                to={esgotado || !selectedLot ? '#' : `/checkout?lote=${selectedLot.id}`}
                aria-disabled={esgotado || !selectedLot}
                className={`mt-6 block rounded-full px-6 py-3.5 text-center text-sm font-semibold text-white transition-transform ${
                  esgotado || !selectedLot
                    ? 'cursor-not-allowed bg-white/10 text-white/40'
                    : 'bg-cta-gradient shadow-neon hover:scale-[1.02]'
                }`}
              >
                {esgotado ? 'Ingressos esgotados' : 'Comprar ingresso'}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Local */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6 lg:px-8">
        <h2 className="font-display text-xl font-bold text-white">Local</h2>
        {temLocal ? (
          <>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <iframe
                title={`Mapa de ${event.local.local}`}
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                className="h-64 w-full grayscale invert-[0.9] contrast-[1.1]"
                loading="lazy"
              />
            </div>
            <p className="mt-3 text-sm text-white/50">
              {event.local.local} — {event.local.endereco}, {event.local.cidade} - {event.local.estado}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-white/50">
            Local em {event.local.cidade} - {event.local.estado}, a confirmar em breve.
          </p>
        )}
      </section>

      {/* Regulamento */}
      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6 lg:px-8">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
          <ShieldAlert size={18} className="text-violet-400" /> Regulamento
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/50">{event.regulamento}</p>
      </section>
    </>
  );
}
