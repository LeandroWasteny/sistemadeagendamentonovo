export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://agendamento:agendamento@localhost:5432/agendamento?schema=public"
  }
};
