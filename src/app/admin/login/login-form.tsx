"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Nao foi possivel entrar.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="mt-6 space-y-4">
      <label className="block space-y-1.5 text-sm font-semibold text-[#082F8B]">
        E-mail
        <Input name="email" type="email" defaultValue="admin@agendamento.local" required />
      </label>
      <label className="block space-y-1.5 text-sm font-semibold text-[#082F8B]">
        Senha
        <Input name="password" type="password" defaultValue="admin123" required />
      </label>
      {error && <p className="rounded-[14px] bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
      <Button className="h-11 w-full gap-2">
        <LogIn className="h-4 w-4" />
        Entrar
      </Button>
    </form>
  );
}
