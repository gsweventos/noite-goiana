import { MessageCircle } from 'lucide-react';

const GRUPO_WHATSAPP_URL = 'https://chat.whatsapp.com/InpJbyMkCDbL0PWqQlqTGl?s=sh&p=i&ilr=0&amv=2';

/**
 * Botão flutuante fixo (canto inferior direito) convidando pro grupo do
 * WhatsApp da festa. Fica visível em todas as páginas, sem atrapalhar o
 * conteúdo — discreto, mas com um leve efeito de pulso pra chamar atenção.
 */
export function WhatsAppGroupButton() {
  return (
    <a
      href={GRUPO_WHATSAPP_URL}
      target="_blank"
      rel="noreferrer"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] py-3 pl-3 pr-4 text-sm font-semibold text-ink-950 shadow-lg shadow-black/30 transition-all hover:scale-105 hover:pr-5"
      aria-label="Entrar no grupo do WhatsApp da Noite Goiana"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-40" />
      <MessageCircle size={20} strokeWidth={2.5} />
      <span className="hidden sm:inline">Entrar no grupo</span>
    </a>
  );
}
