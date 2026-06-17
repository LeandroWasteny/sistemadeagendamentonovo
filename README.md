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

O app fica em `http://localhost:3020`.

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

Por padrao o Docker usa `WHATSAPP_MODE=baileys` e o QR Code fica disponivel no admin em `/admin/whatsapp`.

Para usar apenas logs, configure:

```env
WHATSAPP_MODE=mock
```

No primeiro uso com Baileys, entre no admin, abra `WhatsApp`, clique em conectar e leia o QR Code pelo WhatsApp em aparelhos conectados.
