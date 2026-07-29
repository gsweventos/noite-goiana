import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ShieldAlert, Instagram, MessageCircle, Ticket, AlertTriangle } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Spinner } from '@/components/Spinner';
import { Logo } from '@/components/Logo';
import { eventsService } from '@/services/eventsService';
import { EventItem, TicketLot } from '@/types';
import { formatCurrency, formatDateTime, lotProgress } from '@/utils/format';

/**
 * Agrupa lotes que compartilham o campo `grupo` (ex: versão feminina e
 * masculina do "1º Lote") pra exibir lado a lado num único card. Lotes sem
 * grupo (ou com um grupo usado por só um lote) continuam aparecendo sozinhos,
 * do jeito de sempre.
 *
 * Também calcula, na mesma passada, qual "rodada" de lotes está liberada
 * pra venda AGORA: a ordem em que os lotes foram cadastrados define a
 * sequência (1º Lote, 2º Lote, ...); assim que todos os lotes de uma rodada
 * esgotam, a próxima rodada libera sozinha — sem precisar mexer em nada no
 * admin.
 */
type GrupoDeLotes = { chave: string; titulo: string | null; lotes: TicketLot[]; esgotado: boolean; disponivel: boolean };

function agruparLotes(lotes: TicketLot[]): GrupoDeLotes[] {
  const porGrupo = new Map<string, TicketLot[]>();
  const semGrupo: TicketLot[] = [];
  const ordemGrupo = new Map<string, number>(); // pra manter a ordem de primeira aparição

  lotes.forEach((lote, index) => {
    if (lote.grupo) {
      if (!porGrupo.has(lote.grupo)) ordemGrupo.set(lote.grupo, index);
      const lista = porGrupo.get(lote.grupo) ?? [];
      lista.push(lote);
      porGrupo.set(lote.grupo, lista);
    } else {
      semGrupo.push(lote);
      ordemGrupo.set(lote.id, index);
    }
  });

  const brutos: { chave: string; titulo: string | null; lotes: TicketLot[]; ordem: number }[] = [];
  for (const [grupo, lotesDoGrupo] of porGrupo) {
    if (lotesDoGrupo.length > 1) {
      brutos.push({ chave: grupo, titulo: grupo, lotes: lotesDoGrupo, ordem: ordemGrupo.get(grupo)! });
    } else {
      semGrupo.push(...lotesDoGrupo);
    }
  }
  for (const lote of semGrupo) {
    brutos.push({ chave: lote.id, titulo: null, lotes: [lote], ordem: ordemGrupo.get(lote.id)! });
  }
  brutos.sort((a, b) => a.ordem - b.ordem);

  let rodadaLiberada = true; // a primeira rodada não esgotada encontrada, na ordem, é a atual
  return brutos.map(({ chave, titulo, lotes: lotesDoGrupo }) => {
    const esgotado = lotesDoGrupo.every((l) => l.quantidadeVendida >= l.quantidadeTotal);
    const disponivel = !esgotado && rodadaLiberada;
    if (disponivel) rodadaLiberada = false; // achou a rodada atual — as próximas ficam "em breve"
    return { chave, titulo, lotes: lotesDoGrupo, esgotado, disponivel };
  });
}

const GENERO_LABEL: Record<'feminino' | 'masculino', string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
};

export default function Home() {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [selectedLot, setSelectedLot] = useState<TicketLot | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    eventsService.getMainEvent().then((data) => {
      setEvent(data);
      const grupos = agruparLotes(data.lotes);
      const rodadaAtual = grupos.find((g) => g.disponivel);
      const primeiraOpcao = rodadaAtual?.lotes.find((l) => l.ativo !== false && l.quantidadeVendida < l.quantidadeTotal);
      setSelectedLot(primeiraOpcao ?? null);
    });
  }, []);

  // As URLs de retorno do checkout sempre apontam para a raiz do site
  // (nosso HashRouter usa "#" nas rotas internas, e isso evita depender de
  // cada provedor de pagamento aceitar "#" nas back_urls). O Mercado Pago
  // adiciona parâmetros como "collection_status"/"status" na volta, mas
  // qualquer acesso à raiz com algum parâmetro na URL já é tratado aqui
  // como um retorno do checkout, e a pessoa é levada direto pro painel — a
  // confirmação real do pagamento sempre acontece via webhook, não aqui.
  useEffect(() => {
    if (window.location.search.length > 1) {
      navigate('/painel', { replace: true });
    }
  }, [navigate]);

  if (!event) return <Spinner fullScreen />;

  const lotesDefinidos = event.lotes.length > 0;
  const esgotado = lotesDefinidos && event.lotes.every((l) => l.quantidadeVendida >= l.quantidadeTotal);
  const temLocal = Boolean(event.local.endereco);
  const mapQuery = encodeURIComponent(`${event.local.local}, ${event.local.endereco}, ${event.local.cidade} - ${event.local.estado}`);
  const gruposDeLotes = agruparLotes(event.lotes);

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

      {/* Aviso importante — bem destacado, ninguém pode deixar de ver */}
      {event.avisoImportante && (
        <section className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-start gap-3 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-4 sm:p-5"
          >
            <AlertTriangle size={22} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="text-sm font-medium leading-relaxed text-amber-200 sm:text-base">
              {event.avisoImportante}
            </p>
          </motion.div>
        </section>
      )}

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
                  href="https://instagram.com/noitegoianafsa"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:border-violet-500/50"
                >
                  <Instagram size={15} /> Instagram
                </a>
                <a
                  href="https://wa.me/5561982804443"
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
                {gruposDeLotes.map((grupo) => {
                  // Grupo com mais de um lote (ex: feminino + masculino) — um
                  // card só, com as opções lado a lado.
                  if (grupo.titulo) {
                    return (
                      <div key={grupo.chave} className={`rounded-xl border p-4 ${grupo.disponivel ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                        <span className="text-sm font-semibold text-white">{grupo.titulo}</span>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {grupo.lotes.map((lot) => {
                            const lotEsgotado = lot.quantidadeVendida >= lot.quantidadeTotal;
                            const liberado = grupo.disponivel && lot.ativo !== false && !lotEsgotado;
                            const selecionado = selectedLot?.id === lot.id;
                            const label = lot.genero ? GENERO_LABEL[lot.genero] : lot.nome;
                            return (
                              <button
                                key={lot.id}
                                disabled={!liberado}
                                onClick={() => setSelectedLot(lot)}
                                className={`rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                  selecionado ? 'border-violet-500 bg-violet-600/10' : 'border-white/10 hover:border-white/20'
                                }`}
                              >
                                <span className={`block text-xs font-semibold uppercase tracking-wide ${
                                  lot.genero === 'feminino' ? 'text-pink-300' : lot.genero === 'masculino' ? 'text-sky-300' : 'text-white/70'
                                }`}>
                                  {label}
                                </span>
                                <span className="mt-1 block font-display text-base font-bold text-white">{formatCurrency(lot.preco)}</span>
                                <span className="mt-1 block text-[11px] text-white/40">
                                  {lotEsgotado ? 'Esgotado' : !liberado ? 'Em breve' : `${lot.quantidadeTotal - lot.quantidadeVendida} restantes`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // Lote individual (sem par de gênero) — mesmo visual de sempre.
                  const lot = grupo.lotes[0];
                  const lotEsgotado = lot.quantidadeVendida >= lot.quantidadeTotal;
                  const liberado = grupo.disponivel && lot.ativo !== false && !lotEsgotado;
                  const progresso = lotProgress(lot.quantidadeVendida, lot.quantidadeTotal);
                  const selecionado = selectedLot?.id === lot.id;
                  return (
                    <button
                      key={lot.id}
                      disabled={!liberado}
                      onClick={() => setSelectedLot(lot)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        selecionado ? 'border-violet-500 bg-violet-600/10' : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">
                          {lot.nome}
                          {lot.genero && (
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              lot.genero === 'feminino' ? 'bg-pink-500/15 text-pink-300' : 'bg-sky-500/15 text-sky-300'
                            }`}>
                              {GENERO_LABEL[lot.genero]}
                            </span>
                          )}
                        </span>
                        <span className="font-display text-base font-bold text-white">{formatCurrency(lot.preco)}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-cta-gradient" style={{ width: `${progresso}%` }} />
                      </div>
                      <span className="mt-1 block text-[11px] text-white/40">
                        {lotEsgotado ? 'Esgotado' : !liberado ? 'Em breve' : `${lot.quantidadeTotal - lot.quantidadeVendida} restantes`}
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
                {esgotado ? 'Ingressos esgotados' : !selectedLot ? 'Escolha uma opção acima' : 'Comprar ingresso'}
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
