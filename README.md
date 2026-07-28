# Noite Goiana 🎟️

Plataforma de venda de ingressos para eventos, shows, baladas e festas universitárias — inspirada em Sympla / Ingresse, com identidade visual própria (dark mode, roxo `#6D28D9` + gradientes neon).

**Domínio de produção:** `www.noitegoiana.com.br`
**Frontend:** GitHub Pages (estático)
**Backend:** Firebase Cloud Functions (Node 20 + Express) + Firestore + Storage + Mercado Pago

---

## 1. Visão geral da arquitetura

```
┌─────────────────────┐        HTTPS        ┌───────────────────────────┐
│   Frontend (SPA)     │ ───────────────────▶ │  Cloud Functions (API)    │
│  React + Vite + TS   │                       │  Express + Admin SDK      │
│  GitHub Pages        │ ◀─────────────────── │  /payments  /checkin      │
└─────────┬────────────┘        JSON          └───────────┬───────────────┘
          │                                                │
          │ Firebase Auth (client SDK)                     │ Admin SDK
          │ Firestore (leitura pública de /events)          │ (escreve tickets,
          ▼                                                ▼  payments, checkins)
┌─────────────────────┐                       ┌───────────────────────────┐
│      Firestore       │ ◀───────────────────  │        Mercado Pago        │
│  events, tickets,     │      Webhook          │   Checkout Pro + API       │
│  payments, checkins   │                       └───────────────────────────┘
└─────────────────────┘
```

Regra central de segurança: **o frontend nunca cria ingressos, nunca confirma pagamentos e nunca fala diretamente com a API do Mercado Pago.** Ele só chama o backend próprio, que é o único lugar com o Access Token do Mercado Pago e com permissão de escrita nas coleções sensíveis (`tickets`, `payments`, `checkins` — ver `firestore.rules`).

O app roda **sem nenhum backend configurado**: enquanto o `.env` não tiver credenciais do Firebase, todos os serviços em `src/services/` usam dados fictícios em memória (`USE_MOCK = true`), então você já vê a interface inteira funcionando localmente antes de configurar qualquer coisa.

---

## 2. Estrutura de pastas

```
noite-goiana/
├── src/
│   ├── admin/            # Área administrativa (dashboard, CRUD de eventos, etc.)
│   ├── components/       # Componentes reutilizáveis (Header, Footer, EventCard...)
│   ├── context/          # AuthContext (login, cadastro, sessão)
│   ├── lib/               # Inicialização do Firebase (client SDK)
│   ├── pages/             # Páginas públicas e do cliente (Home, Eventos, Checkout...)
│   ├── services/          # Camada de dados: eventsService, paymentService, etc.
│   │                       # (troca mock ↔ Firestore automaticamente)
│   ├── types/              # Tipos TypeScript do domínio
│   └── utils/               # Formatação de moeda, data, CPF, telefone
├── functions/               # Backend: Cloud Functions (Express)
│   └── src/
│       ├── index.ts         # Entry point (Express app + rotas)
│       ├── payments.ts       # Criação de preferência + webhook do Mercado Pago
│       ├── checkin.ts         # Validação de QR Code (transação atômica)
│       ├── qr.ts               # Assinatura HMAC do QR Code
│       ├── pdf.ts               # Geração do PDF do ingresso
│       └── email.ts              # Envio do ingresso por e-mail (SMTP)
├── firestore.rules            # Regras de segurança do Firestore
├── storage.rules               # Regras de segurança do Storage
├── firebase.json                 # Config do projeto Firebase (hosting/functions/rules)
├── .github/workflows/deploy.yml   # CI/CD → GitHub Pages
├── .env.example                    # Variáveis de ambiente do FRONTEND
└── functions/.env.example           # Variáveis de ambiente do BACKEND
```

---

## 3. Rodando localmente (modo demonstração, sem backend)

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Toda a interface funciona com dados fictícios (`src/services/mockData.ts`):

- Login demo: `cliente@noitegoiana.com.br` ou `admin@noitegoiana.com.br`, senha `123456`
- Compra de ingresso simulada (sem cobrança real)
- `/checkin` (como admin) lê o QR Code do ingresso de demonstração

Esse modo é ótimo para revisar a UI, mas **nenhum dado é persistido** entre recarregamentos (fica só em memória/sessão do navegador).

---

## 4. Configurando o backend real (Firebase + Mercado Pago)

### 4.1 Criar o projeto Firebase

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com)
2. Ative **Authentication** → métodos "E-mail/senha" e "Google"
3. Ative **Firestore Database** (modo produção)
4. Ative **Storage**
5. Em *Configurações do projeto → Geral → Seus apps*, crie um app **Web** e copie as chaves do SDK

### 4.2 Configurar o `.env` do frontend

```bash
cp .env.example .env
```

Preencha com as chaves do passo anterior:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=noite-goiana.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=noite-goiana
VITE_FIREBASE_STORAGE_BUCKET=noite-goiana.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_BASE_URL=https://us-central1-noite-goiana.cloudfunctions.net/api
```

Assim que `VITE_FIREBASE_API_KEY` e `VITE_FIREBASE_PROJECT_ID` estiverem preenchidos, `USE_MOCK` vira `false` automaticamente (ver `src/lib/firebase.ts`) e o app passa a usar Firestore/Auth de verdade.

### 4.3 Marcar um usuário como administrador

Depois de criar sua conta pelo app (`/login` → Cadastro), vá ao Firestore Console e:

1. Copie o **UID** do usuário em `Authentication`
2. Crie manualmente um documento em `admins/{uid}` com qualquer campo (ex.: `{ criadoEm: <timestamp> }`)
3. Em `users/{uid}`, defina `role: "admin"`

Isso libera `/admin` e `/checkin` para esse usuário (ver `RequireAdmin` em `src/components/RouteGuards.tsx` e as regras em `firestore.rules`).

### 4.4 Publicar as regras de segurança

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # selecione seu projeto
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

### 4.5 Configurar o Mercado Pago

1. Crie uma aplicação em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers/panel)
2. Copie o **Access Token de produção** (nunca o de teste, em produção)
3. Configure a variável no backend:

```bash
cd functions
cp .env.example .env
```

```env
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx
PUBLIC_API_URL=https://us-central1-noite-goiana.cloudfunctions.net/api
PUBLIC_APP_URL=https://www.noitegoiana.com.br
QR_SECRET=uma-string-longa-e-aleatoria-só-sua
SMTP_HOST=smtp.seuservidor.com
SMTP_PORT=587
SMTP_USER=contato@noitegoiana.com.br
SMTP_PASSWORD=************
SMTP_FROM="Noite Goiana <contato@noitegoiana.com.br>"
```

Para produção, prefira **secrets** do Firebase em vez de `.env` cru:

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN
firebase functions:secrets:set QR_SECRET
firebase functions:secrets:set SMTP_PASSWORD
```

(e referencie-os em `functions/src/index.ts` conforme a [documentação de secrets do Firebase Functions](https://firebase.google.com/docs/functions/config-env?gen=2#secret-manager)).

### 4.6 Deploy do backend

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Anote a URL gerada (algo como `https://us-central1-noite-goiana.cloudfunctions.net/api`) e coloque em `VITE_API_BASE_URL` no `.env` do frontend — e também nos *secrets* do GitHub Actions (passo 5).

### 4.7 Configurar o webhook no Mercado Pago

No painel do Mercado Pago → sua aplicação → **Notificações (Webhooks)**, cadastre:

```
https://us-central1-noite-goiana.cloudfunctions.net/api/payments/webhook
```

Evento: `payment`.

> A rota `POST /payments/create-preference` já envia essa mesma URL como `notification_url` automaticamente — cadastrar manualmente no painel é uma camada extra de garantia.

---

## 5. Deploy do frontend no GitHub Pages

O workflow `.github/workflows/deploy.yml` já faz build + deploy automático a cada push em `main`.

1. Em **Settings → Pages** do repositório, defina a origem como "GitHub Actions"
2. Em **Settings → Secrets and variables → Actions**, cadastre os mesmos valores do seu `.env`:
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
   - `VITE_API_BASE_URL`
   - `VITE_MERCADOPAGO_PUBLIC_KEY` (se for usar Checkout Transparente no futuro)
3. Faça push em `main` — o Actions builda e publica `dist/` automaticamente

### 5.1 Domínio próprio (`www.noitegoiana.com.br`)

O arquivo `public/CNAME` já contém `www.noitegoiana.com.br`, então o GitHub Pages serve o site nesse domínio assim que o DNS apontar corretamente:

1. No seu provedor de DNS, crie um registro **CNAME**:
   ```
   www.noitegoiana.com.br  →  <seu-usuario>.github.io
   ```
2. (Opcional, para o domínio raiz `noitegoiana.com.br` redirecionar também) crie registros **A** apontando para os IPs do GitHub Pages:
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
3. Em **Settings → Pages**, confirme o domínio customizado e ative **"Enforce HTTPS"** assim que o certificado for emitido (pode levar até 24h)

---

## 6. Fluxo de compra ponta a ponta (produção)

1. Usuário escolhe evento e lote → preenche nome, CPF, telefone, e-mail (`Checkout.tsx`)
2. Frontend chama `POST /payments/create-preference` → backend cria um `payments/{id}` com `status: "pendente"` e retorna a URL do Checkout Pro
3. Usuário é redirecionado ao Mercado Pago e paga
4. Mercado Pago chama `POST /payments/webhook` no backend
5. Backend **reconsulta a API do Mercado Pago** pelo `payment_id` (nunca confia só no corpo do webhook), confirma `status === "approved"`
6. Dentro de uma transação Firestore: debita o lote, gera o(s) ingresso(s) com UUID + QR Code assinado (HMAC), grava em `tickets`
7. Backend gera o PDF do ingresso e envia por e-mail
8. Painel do cliente (`/painel`) já reflete o novo ingresso

## 7. Fluxo de check-in

1. Operador logado como admin abre `/checkin` e autoriza a câmera
2. `html5-qrcode` lê o conteúdo do QR Code e envia para `POST /checkin/validate`
3. Backend verifica a assinatura HMAC, busca o ingresso, e **dentro de uma transação** decide:
   - `autorizado` → marca como `utilizado`, registra em `checkins`, mostra tela verde
   - `ja_utilizado` → tela vermelha com aviso
   - `invalido` → assinatura não bate ou ticket não existe → tela vermelha

---

## 8. Segurança implementada

- **Firestore Rules**: cliente só lê os próprios ingressos; escrita em `tickets`/`payments`/`checkins` é bloqueada para o client SDK (só Admin SDK, via Cloud Functions)
- **Assinatura HMAC do QR Code**: impossível forjar um QR Code válido sem o `QR_SECRET`, que só existe no backend
- **Idempotência do webhook**: reprocessar a mesma notificação não gera ingressos duplicados
- **Transações atômicas**: tanto a geração de ingressos quanto o check-in usam `runTransaction`, evitando overselling e reuso de QR Code em leituras simultâneas
- **Rate limiting**: `express-rate-limit` nas rotas da API
- **CORS restrito** ao domínio do frontend
- **Validação com Zod** em todas as entradas de API e formulários
- **Nenhum segredo no frontend**: Access Token do Mercado Pago e `QR_SECRET` existem só no backend

---

## 9. Próximos passos sugeridos

- Trocar o placeholder de gráfico do dashboard admin por Recharts consumindo `vendasPorDia` real do Firestore
- Implementar meia-entrada com upload/validação de documento (Storage + revisão manual no admin)
- Adicionar paginação/infinite scroll em `/eventos` para catálogos grandes
- Cobertura de testes (Vitest + Testing Library no frontend, Jest nas Functions)
- CDN/compressão de imagens (ex.: Cloudinary ou Firebase Extensions de resize) antes de produção

---

## 10. Licença

Projeto proprietário da Noite Goiana. Uso interno — ajuste esta seção conforme a licença que desejar aplicar publicamente.
