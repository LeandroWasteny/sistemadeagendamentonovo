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
- `/admin/financeiro`: financeiro
- `/admin/cupons`: cupons
- `/admin/relatorios`: relatorios
- `/admin/perfil`: perfil publico do negocio
- `/admin/whatsapp`: conexao do WhatsApp

## WhatsApp

Por padrao o Docker usa `WHATSAPP_MODE=baileys` e o QR Code fica disponivel no admin em `/admin/whatsapp`.

Para usar apenas logs, configure:

```env
WHATSAPP_MODE=mock
```

No primeiro uso com Baileys, entre no admin, abra `WhatsApp`, clique em conectar e leia o QR Code pelo WhatsApp em aparelhos conectados.

## Horarios, Feriados e Bloqueios

A tela `/admin/horarios` controla a disponibilidade publica:

- Janelas semanais por profissional, com dia da semana, inicio, fim e intervalo entre vagas.
- Bloqueios de agenda para feriados, folgas, cursos, manutencoes ou qualquer excecao.
- Bloqueio geral para todos os profissionais ou especifico para uma profissional.
- Bloqueio de dia inteiro ou apenas de um intervalo de horario.

Os bloqueios sao aplicados na consulta de disponibilidade e tambem na confirmacao final do agendamento. Assim, se uma data estiver bloqueada, o horario nao aparece para o cliente e tambem nao pode ser confirmado pela API.

## Banco e Migrations

O projeto usa Prisma 7 com configuracao em `prisma.config.ts`. Ao subir com Docker, as migrations sao aplicadas antes do app iniciar.

Comandos uteis:

```bash
npx prisma generate
npx prisma migrate deploy
npm run build
```
