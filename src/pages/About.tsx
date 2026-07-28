import { Seo } from '@/components/Seo';

export default function About() {
  return (
    <>
      <Seo title="Sobre" description="Conheça a Noite Goiana, festa de som automotivo em Formosa." />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Sobre a Noite Goiana</h1>
        <p className="mt-6 leading-relaxed text-white/60">
          A Noite Goiana é uma festa de som automotivo em Formosa, feita para quem curte grave, boa música e uma
          noite marcante. No dia 12 de setembro, a partir das 22h, vamos reunir tudo isso em um só lugar.
        </p>
        <p className="mt-4 leading-relaxed text-white/60">
          Cada ingresso é único, gerado com QR Code exclusivo e validado em tempo real na entrada — garantindo
          mais segurança e agilidade para todo mundo.
        </p>
      </section>
    </>
  );
}
