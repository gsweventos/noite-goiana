import { Link } from 'react-router-dom';
import { Seo } from '@/components/Seo';

export default function NotFound() {
  return (
    <>
      <Seo title="Página não encontrada" />
      <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <span className="font-display text-7xl font-extrabold text-gradient">404</span>
        <h1 className="mt-4 font-display text-xl font-bold text-white">Essa página não existe</h1>
        <p className="mt-2 text-white/50">O link pode estar quebrado ou o evento pode não estar mais disponível.</p>
        <Link to="/" className="mt-6 rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-neon">
          Voltar para o início
        </Link>
      </section>
    </>
  );
}
