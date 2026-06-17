import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-500">Area administrativa</p>
        <h1 className="mt-2 text-2xl font-semibold">Entrar no painel</h1>
        <LoginForm />
      </section>
    </main>
  );
}

