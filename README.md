# Noite Goiana 🎟️

Site oficial de venda de ingressos da **Noite Goiana** — festa de som automotivo em Formosa (GO), com identidade visual dark/roxo neon.

**Domínio:** `www.noitegoiana.com.br`
**Frontend:** GitHub Pages (estático)
**Dados/Login:** Firebase (Authentication + Firestore)
**Backend de pagamento:** Vercel (Serverless Functions) — não usa Firebase Cloud Functions, então **não exige o plano pago (Blaze) do Firebase**

---

## 1. Visão geral da arquitetura

```
┌─────────────────────┐        HTTPS        ┌───────────────────────────┐
│   Frontend (SPA)     │ ───────────────────▶ │   Backend (Vercel)         │
│  React + Vite + TS   │                       │  Serverless Functions      │
│  GitHub Pages        │ ◀─────────────────── │  /api/payments  /api/checkin│
└─────────┬────────────┘        JSON          └───────────┬───────────────┘
          │                                                │
          │ Firebase Auth (client SDK)                     │ Firebase Admin SDK
          │ Firestore (leitura pública de /events)          │ (conta de serviço)
          ▼                                                ▼
┌─────────────────────┐                       ┌───────────────────────────┐
│      Firestore       │ ◀───────────────────  │        PagBank         │
│  events, tickets,     │      Webhook          │   Checkout Pro + API        │
│  payments, checkins   │                       └───────────────────────────┘
└─────────────────────┘
```

Regra central de segurança: **o frontend nunca cria ingressos, nunca confirma pagamentos e nunca fala diretamente com a API do PagBank.** Ele só chama o backend (`/backend`, hospedado no Vercel), que é o único lugar com o Access Token do PagBank e com credenciais para escrever nas coleções sensíveis do Firestore (`tickets`, `payments`, `checkins`).

O site roda **sem nenhum backend configurado**: enquanto o `.env` do frontend não tiver credenciais do Firebase, os serviços em `src/services/` usam os dados de `src/config/event.ts` em memória (`USE_MOCK = true`), então dá pra ver a interface inteira funcionando localmente antes de configurar qualquer coisa.

### Por que Vercel e não Firebase Cloud Functions?

Cloud Functions exige o plano **Blaze** do Firebase (pagamento por uso, com verificação de cartão/depósito). O Vercel tem um plano gratuito (Hobby) que não exige cartão nem depósito para hospedar funções serverless em Node.js — por isso o pagamento roda lá, enquanto **Firestore e Authentication continuam no Firebase normalmente** (esses dois funcionam no plano gratuito Spark sem problema).

---

## 2. Estrutura de pastas

```
noite-goiana/
├── src/
│   ├── admin/            # Área administrativa (dashboard, editar a festa, etc.)
│   ├── components/       # Componentes reutilizáveis (Header, Footer, Logo...)
│   ├── config/            # src/config/event.ts — dados da festa (fonte única)
│   ├── context/            # AuthContext (login, cadastro, sessão)
│   ├── lib/                 # Inicialização do Firebase (client SDK)
│   ├── pages/                 # Páginas públicas e do cliente (Home, Checkout...)
│   ├── services/                # Camada de dados (troca mock ↔ Firestore automaticamente)
│   ├── types/                     # Tipos TypeScript do domínio
│   └── utils/                       # Formatação de moeda, data, CPF, telefone
├── backend/                          # Backend: Vercel Serverless Functions
│   └── api/
│       ├── _lib/                       # Módulos compartilhados (não viram rota)
│       │   ├── firebaseAdmin.ts          # Firebase Admin SDK (conta de serviço)
│       │   ├── pagbank.ts             # Cliente do PagBank
│       │   ├── qr.ts                       # Assinatura HMAC do QR Code
│       │   ├── pdf.ts                       # Geração do PDF do ingresso
│       │   ├── email.ts                      # Envio do ingresso por e-mail (SMTP)
│       │   └── cors.ts                        # CORS compartilhado
│       ├── payments/
│       │   ├── create-preference.ts             # POST — cria a cobrança
│       │   ├── webhook.ts                        # POST — confirmação do PagBank
│       │   └── [id]/status.ts                     # GET — status de um pagamento
│       ├── checkin/
│       │   └── validate.ts                          # POST — valida um QR Code
│       └── health.ts                                   # GET — healthcheck
├── firestore.rules            # Regras de segurança do Firestore
├── storage.rules               # Regras de segurança do Storage
├── .github/workflows/deploy.yml   # CI/CD do frontend → GitHub Pages
├── .env.example                    # Variáveis de ambiente do FRONTEND
└── backend/.env.example              # Variáveis de ambiente do BACKEND (Vercel)
```

---

## 3. Rodando localmente (modo demonstração, sem backend)

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Toda a interface funciona com os dados de `src/config/event.ts`:

- Login demo: `cliente@noitegoiana.com.br` ou `admin@noitegoiana.com.br`, senha `123456`
- Compra de ingresso simulada (sem cobrança real)
- `/checkin` (como admin) lê o QR Code do ingresso de demonstração

---

## 4. Configurando o Firebase (dados, login, área administrativa)

### 4.1 Criar o projeto Firebase

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com) (plano **Spark**, gratuito — não precisa de Blaze para nada desta seção)
2. Ative **Authentication** → métodos "E-mail/senha" e "Google"
3. Ative **Firestore Database** (modo produção)

### 4.2 Configurar o `.env` do frontend

```bash
cp .env.example .env
```

Preencha com as chaves de *Configurações do projeto → Geral → Seus apps → Config*:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=noite-goiana.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=noite-goiana
VITE_FIREBASE_STORAGE_BUCKET=noite-goiana.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_BASE_URL=https://noite-goiana-backend.vercel.app/api
```

Assim que `VITE_FIREBASE_API_KEY` e `VITE_FIREBASE_PROJECT_ID` estiverem preenchidos, `USE_MOCK` vira `false` automaticamente (ver `src/lib/firebase.ts`).

### 4.3 Publicar as regras de segurança do Firestore

No Firebase Console → Firestore Database → aba "Regras", cole o conteúdo de `firestore.rules` deste repositório e publique.

### 4.4 Virar administrador

1. Crie sua conta pelo próprio site (`/login` → Cadastre-se)
2. Firebase Console → Authentication → Users → copie o **UID** dessa conta
3. Firestore → crie a coleção `admins`, com um documento de ID igual a esse UID (qualquer campo dentro)
4. Firestore → na coleção `users`, no documento desse mesmo UID, defina `role: "admin"`

Saia e entre de novo no site — o menu deve mostrar "Painel admin".

---

## 5. Configurando o backend de pagamento (Vercel)

### 5.1 Gerar a conta de serviço do Firebase

O backend precisa de credenciais para escrever no Firestore de fora do ambiente do Firebase:

1. Firebase Console → ⚙️ Configurações do projeto → **Contas de serviço**
2. Clique em **"Gerar nova chave privada"** → baixa um arquivo `.json`
3. Guarde esse arquivo — você vai usar três campos dele (`project_id`, `client_email`, `private_key`) na próxima etapa

### 5.2 Pegar o token de integração do PagBank

1. Crie/acesse sua conta em [minhaconta.pagseguro.uol.com.br](https://minhaconta.pagseguro.uol.com.br) ou [pagbank.com.br](https://pagbank.com.br)
2. No painel, procure por **"Integrações"** → **"Token de integração"** (às vezes em "Minha Conta → Preferências → Integrações")
3. Copie o token — é ele que vai virar a variável `PAGBANK_TOKEN`
4. Confirme também que sua conta tem uma **chave Pix cadastrada** (Pix → Cadastrar chave), senão o Pix não aparece como opção pro comprador

### 5.3 Publicar o backend no Vercel

1. Crie uma conta em [vercel.com](https://vercel.com) (dá pra entrar direto com o GitHub)
2. **Add New → Project** → importe o repositório `noite-goiana`
3. Em **"Root Directory"**, selecione a pasta **`backend`** (importante — o Vercel não deve tentar buildar o frontend, só essa pasta)
4. Em **Environment Variables**, cadastre (usando o `.env.example` de `backend/` como guia):
   - `PAGBANK_TOKEN`
   - `PUBLIC_API_URL` (preencha depois do primeiro deploy, com a URL que o Vercel gerar + `/api`)
   - `PUBLIC_APP_URL` = `https://www.noitegoiana.com.br`
   - `QR_SECRET` (qualquer texto longo e aleatório só seu)
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (do arquivo `.json` da etapa 5.1)
   - `SMTP_*` (opcional, para envio de e-mail — pode deixar em branco por enquanto)
5. Clique em **Deploy**

Depois do primeiro deploy, o Vercel te dá uma URL tipo `https://noite-goiana-backend.vercel.app`. Volte em Environment Variables e preencha `PUBLIC_API_URL` com essa URL + `/api`, depois clique em **Redeploy**.

### 5.4 Conectar o frontend ao backend

Cadastre `VITE_API_BASE_URL` com essa mesma URL (`https://noite-goiana-backend.vercel.app/api`):
- No seu `.env` local (se for testar localmente)
- Como *Secret* no GitHub (**Settings → Secrets and variables → Actions**), para o build do GitHub Pages usar

### 5.5 Webhook no PagBank

Diferente do Mercado Pago, o PagBank não tem uma tela separada de "cadastrar webhook" — a URL de notificação é enviada automaticamente em cada Checkout criado (campo `payment_notification_urls`, já configurado em `backend/api/payments/create-preference.ts` apontando para `PUBLIC_API_URL + /payments/webhook`). Não precisa cadastrar nada manualmente no painel do PagBank.

---

## 6. Deploy do frontend no GitHub Pages

O workflow `.github/workflows/deploy.yml` já faz build + deploy automático a cada push em `main`.

1. **Settings → Pages** → Source: **"GitHub Actions"**
2. **Settings → Secrets and variables → Actions**, cadastre os mesmos valores do `.env` (as 6 chaves do Firebase + `VITE_API_BASE_URL`)
3. Push em `main` → o Actions builda e publica `dist/` automaticamente

### Domínio próprio (`www.noitegoiana.com.br`)

O arquivo `public/CNAME` já contém `www.noitegoiana.com.br`. No seu provedor de DNS, crie:
```
CNAME   www   →   <seu-usuario>.github.io
A       @     →   185.199.108.153 / .109.153 / .110.153 / .111.153
```
Depois, em Settings → Pages, confirme o domínio customizado e ative "Enforce HTTPS".

---

## 7. Fluxo de compra ponta a ponta (produção)

1. Usuário escolhe o lote → preenche nome, CPF, telefone, e-mail (`Checkout.tsx`)
2. Frontend chama `POST /api/payments/create-preference` → backend cria um `payments/{id}` com `status: "pendente"` e retorna a URL do Checkout Pro
3. Usuário é redirecionado ao PagBank e paga
4. PagBank chama `POST /api/payments/webhook`
5. Backend **valida a assinatura do webhook e reconsulta a API do PagBank** pelo id do pedido (nunca confia só no corpo do webhook), confirma `status === "PAID"`
6. Dentro de uma transação Firestore: debita o lote, gera o(s) ingresso(s) com UUID + QR Code assinado (HMAC), grava em `tickets`
7. Backend gera o PDF do ingresso e envia por e-mail (se o SMTP estiver configurado)
8. Painel do cliente (`/painel`) já reflete o novo ingresso

## 8. Fluxo de check-in

1. Operador logado como admin abre `/checkin` e autoriza a câmera
2. `html5-qrcode` lê o QR Code e envia para `POST /api/checkin/validate`
3. Backend verifica a assinatura HMAC, busca o ingresso, e **dentro de uma transação** decide: autorizado / já utilizado / inválido

---

## 9. Segurança implementada

- **Firestore Rules**: cliente só lê os próprios ingressos; escrita em `tickets`/`payments`/`checkins` é bloqueada para o client SDK (só o backend, via Admin SDK, escreve)
- **Assinatura do webhook do PagBank**: cada notificação é validada via SHA-256 (`x-authenticity-token`) antes de qualquer processamento — notificações forjadas são descartadas
- **Assinatura HMAC do QR Code**: impossível forjar um QR Code válido sem o `QR_SECRET`, que só existe no backend
- **Idempotência do webhook**: reprocessar a mesma notificação não gera ingressos duplicados
- **Transações atômicas**: geração de ingressos e check-in usam `runTransaction`, evitando overselling e reuso de QR Code
- **Validação com Zod** em todas as entradas de API e formulários
- **CORS restrito** ao domínio do frontend
- **Nenhum segredo no frontend**: Access Token do PagBank, `QR_SECRET` e credenciais do Firebase Admin existem só no backend (Vercel)

---

## 10. Próximos passos sugeridos

- Cadastrar os lotes de ingresso reais em `/admin/evento` assim que os valores forem definidos
- Configurar o envio de e-mail (SMTP) para o PDF do ingresso chegar automaticamente
- Adicionar testes automatizados
- Trocar o placeholder de gráfico do dashboard admin por dados reais de vendas por dia

---

## 11. Licença

Projeto proprietário da Noite Goiana. Uso interno.
