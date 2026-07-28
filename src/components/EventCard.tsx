import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { EventItem } from '@/types';
import { formatCurrency, formatDay, formatMonth } from '@/utils/format';

export function EventCard({ event, index = 0 }: { event: EventItem; index?: number }) {
  const menorPreco = Math.min(...event.lotes.map((l) => l.preco));
  const esgotado = event.status === 'esgotado';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link
        to={`/eventos/${event.slug}`}
        className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-all hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-neon"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={event.imagemCapa}
            alt={event.nome}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />

          <div className="absolute left-3 top-3 flex flex-col items-center rounded-lg bg-ink-950/85 px-3 py-1.5 text-center backdrop-blur">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-400">{formatMonth(event.dataInicio)}</span>
            <span className="text-lg font-bold leading-none text-white">{formatDay(event.dataInicio)}</span>
          </div>

          {esgotado && (
            <span className="absolute right-3 top-3 rounded-full bg-red-500/90 px-3 py-1 text-[11px] font-semibold text-white">
              Esgotado
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="line-clamp-2 font-display text-base font-bold text-white group-hover:text-violet-300">
            {event.nome}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
            <MapPin size={12} /> {event.local.local} · {event.local.cidade}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <span className="block text-[11px] text-white/40">a partir de</span>
              <span className="font-display text-lg font-bold text-white">{formatCurrency(menorPreco)}</span>
            </div>
            <span className="rounded-full bg-cta-gradient px-4 py-2 text-xs font-semibold text-white transition-transform group-hover:scale-105">
              Comprar
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
