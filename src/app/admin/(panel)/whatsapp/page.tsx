import { MessageCircle } from "lucide-react";
import { WhatsappPanel } from "./whatsapp-panel";

export default function WhatsappPage() {
  return (
    <section>
      <div className="mb-6 rounded-[20px] border border-white bg-white/95 p-5 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-semibold text-[#0F5EF7]">Notificacoes</p>
        <h1 className="font-display mt-1 flex items-center gap-2 text-2xl font-semibold text-[#082F8B]">
          <MessageCircle className="h-6 w-6 text-[#22C55E]" />
          WhatsApp
        </h1>
      </div>
      <WhatsappPanel />
    </section>
  );
}
