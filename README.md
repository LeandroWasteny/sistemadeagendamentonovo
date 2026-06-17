# Sistema de Agendamento Novo

MVP dockerizado de agendamento online com tela publica, painel admin, PostgreSQL, Prisma e notificacoes por WhatsApp.

## Stack

- Next.js + React + TypeScript
- Prisma + PostgreSQL
- Docker Compose
- UI inspirada em shadcn/ui, Magic UI, ReactBits e 21st.dev
- WhatsApp via Baileys ou modo mock

## Rodar com Docker

```bash
docker compose up --build
```

O app fica em `http://localhost:3000`.

Credenciais iniciais do admin:

- E-mail: `admin@agendamento.local`
- Senha: `admin123`

## Rotas

- `/agendar`: tela publica de agendamento
- `/admin/login`: login administrativo
- `/admin`: dashboard
- `/admin/servicos`: servicos
- `/admin/profissionais`: profissionais
- `/admin/horarios`: horarios
- `/admin/agendamentos`: agendamentos

## WhatsApp

Por padrao o sistema usa `WHATSAPP_MODE=mock`, imprimindo as mensagens no log do app.

Para tentar envio real com Baileys, configure:

```env
WHATSAPP_MODE=baileys
WHATSAPP_AUTH_DIR=/app/baileys-auth
```

No primeiro uso, o Baileys pode exigir leitura do QR Code exibido no terminal do container.
