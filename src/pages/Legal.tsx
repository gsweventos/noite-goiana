import { Seo } from '@/components/Seo';

export function PrivacyPolicy() {
  return (
    <>
      <Seo title="Política de Privacidade" />
      <section className="mx-auto max-w-3xl px-4 py-16 text-white/60 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold text-white">Política de Privacidade</h1>
        <p className="mt-6 leading-relaxed">
          A Noite Goiana coleta apenas os dados necessários para viabilizar a compra e a validação de ingressos:
          nome, CPF, telefone e e-mail. Esses dados são usados exclusivamente para emissão do ingresso, comunicação
          sobre o evento e validação de entrada, e não são compartilhados com terceiros além dos provedores
          estritamente necessários para processar o pagamento (Asaas) e a autenticação (Firebase).
        </p>
        <p className="mt-4 leading-relaxed">
          Você pode solicitar a exclusão dos seus dados a qualquer momento pelo e-mail contato@noitegoiana.com.br.
        </p>
      </section>
    </>
  );
}

export function TermsOfUse() {
  return (
    <>
      <Seo title="Termos de Uso" />
      <section className="mx-auto max-w-3xl px-4 py-16 text-white/60 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold text-white">Termos de Uso</h1>
        <p className="mt-6 leading-relaxed">
          Ao comprar um ingresso pela Noite Goiana, o comprador declara estar ciente do regulamento específico
          de cada evento, disponível na respectiva página. Ingressos são pessoais, intransferíveis e vinculados
          ao CPF informado na compra, sendo validados por QR Code único no momento da entrada.
        </p>
        <p className="mt-4 leading-relaxed">
          Cancelamentos e reembolsos seguem as regras definidas por cada organizador de evento, respeitando a
          legislação do Código de Defesa do Consumidor.
        </p>
      </section>
    </>
  );
}
