import { MessageCircle } from "lucide-react";
import { WhatsappPanel } from "./whatsapp-panel";

export default function WhatsappPage() {
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm text-zinc-500">Notificacoes</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <MessageCircle className="h-6 w-6" />
          WhatsApp
        </h1>
      </div>
      <WhatsappPanel />
    </section>
  );
}

