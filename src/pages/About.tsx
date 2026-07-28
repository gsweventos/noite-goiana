import { Seo } from '@/components/Seo';

export default function About() {
  return (
    <>
      <Seo title="Sobre" description="Conheça a Noite Goiana, a plataforma de ingressos para os melhores eventos de Goiás." />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Sobre a Noite Goiana</h1>
        <p className="mt-6 leading-relaxed text-white/60">
          A Noite Goiana nasceu para conectar quem produz eventos, shows, baladas e festas universitárias a
          quem quer viver essas experiências, com um processo de compra simples, rápido e seguro do início ao fim.
        </p>
        <p className="mt-4 leading-relaxed text-white/60">
          Cada ingresso vendido pela plataforma é único, gerado com QR Code exclusivo e validado em tempo real
          na entrada do evento — garantindo mais segurança para organizadores e para o público.
        </p>
      </section>
    </>
  );
}
