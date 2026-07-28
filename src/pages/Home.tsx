import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, QrCode, Zap } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { EventCard } from '@/components/EventCard';
import { Logo } from '@/components/Logo';
import { eventsService } from '@/services/eventsService';
import { EventItem } from '@/types';

export default function Home() {
  const [destaques, setDestaques] = useState<EventItem[]>([]);

  useEffect(() => {
    eventsService.getFeatured().then(setDestaques);
  }, []);

  return (
    <>
      <Seo
        title="Os melhores eventos estão aqui"
        description="Compre seu ingresso online em segundos. Shows, baladas e festas universitárias de Goiás em um só lugar."
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/80 to-ink-950" />
          <div className="absolute inset-0 bg-grid-glow" />
        </div>

        <div className="mx-auto flex min-h-[88vh] max-w-5xl flex-col items-center justify-center px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Logo className="text-3xl sm:text-4xl" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8 font-display text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl md:text-7xl"
          >
            Os melhores <span className="text-gradient">eventos</span> estão aqui.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-xl text-lg text-white/60"
          >
            Compre seu ingresso online em segundos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10"
          >
            <Link
              to="/eventos"
              className="group inline-flex items-center gap-2 rounded-full bg-cta-gradient px-8 py-4 text-base font-semibold text-white shadow-neon transition-transform hover:scale-105"
            >
              Ver Eventos
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Confiança / diferenciais */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-14 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { icon: ShieldCheck, title: 'Pagamento seguro', desc: 'Checkout processado via Mercado Pago, com confirmação validada por webhook.' },
            { icon: QrCode, title: 'Ingresso com QR Code', desc: 'Cada ingresso é único, intransferível e validado na entrada em tempo real.' },
            { icon: Zap, title: 'Compra em segundos', desc: 'Escolha o evento, preencha seus dados e receba o ingresso na hora.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-start gap-3">
              <div className="rounded-xl bg-violet-600/15 p-3 text-violet-400">
                <Icon size={22} />
              </div>
              <h3 className="font-display text-lg font-bold text-white">{title}</h3>
              <p className="text-sm text-white/50">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Eventos em destaque */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">Em alta</span>
            <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">Eventos em destaque</h2>
          </div>
          <Link to="/eventos" className="hidden items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300 sm:flex">
            Ver todos <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {destaques.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-900/40 to-ink-900 p-10 text-center sm:p-16">
          <div className="absolute inset-0 bg-grid-glow" />
          <h2 className="relative font-display text-2xl font-bold text-white sm:text-4xl">
            Vai produzir um evento? Venda com a Noite Goiana.
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-white/60">
            Cadastre seus lotes, acompanhe vendas em tempo real e valide entradas com QR Code no dia do evento.
          </p>
          <a
            href="mailto:contato@noitegoiana.com.br"
            className="relative mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-semibold text-ink-950 transition-transform hover:scale-105"
          >
            Fale com a gente
          </a>
        </div>
      </section>
    </>
  );
}
