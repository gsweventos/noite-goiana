import { useState } from 'react';
import { Instagram, Mail, MessageCircle } from 'lucide-react';
import { Seo } from '@/components/Seo';

export default function Contact() {
  const [enviado, setEnviado] = useState(false);

  return (
    <>
      <Seo title="Contato" description="Fale com a equipe da Noite Goiana." />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">Fale com a gente</h1>
        <p className="mt-3 text-white/50">Dúvidas sobre um ingresso, um evento ou quer vender com a Noite Goiana? É só chamar.</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a href="mailto:gswprodeventos@gmail.com" className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center hover:border-violet-500/40">
            <Mail size={22} className="text-violet-400" />
            <span className="text-sm text-white">gswprodeventos@gmail.com</span>
          </a>
          <a href="https://wa.me/5561982804443" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center hover:border-violet-500/40">
            <MessageCircle size={22} className="text-violet-400" />
            <span className="text-sm text-white">WhatsApp</span>
          </a>
          <a href="https://instagram.com/noitegoianafsa" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center hover:border-violet-500/40">
            <Instagram size={22} className="text-violet-400" />
            <span className="text-sm text-white">@noitegoianafsa</span>
          </a>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); setEnviado(true); }}
          className="mt-10 space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Nome</span>
              <input required className="input" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">E-mail</span>
              <input required type="email" className="input" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/60">Mensagem</span>
            <textarea required rows={4} className="input resize-none" />
          </label>
          {enviado && <p className="text-sm text-emerald-400">Mensagem enviada! Retornaremos em breve.</p>}
          <button className="rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-neon">Enviar mensagem</button>
        </form>
      </section>
    </>
  );
}
