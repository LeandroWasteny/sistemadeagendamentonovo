import { BrandLogo } from "@/components/brand/brand-logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#ffffff_0%,#f4f9ff_52%,#eefcf5_100%)] px-4 py-8 text-[#082F8B]">
      <section className="w-full max-w-md rounded-[24px] border border-white bg-white/95 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur">
        <BrandLogo size="md" />
        <p className="mt-7 text-sm font-semibold text-[#0F5EF7]">Area administrativa</p>
        <h1 className="font-display mt-2 text-2xl font-semibold text-[#082F8B]">Entrar no painel</h1>
        <LoginForm />
      </section>
    </main>
  );
}
