import { MessageCircle, Phone } from "lucide-react";

import { contact } from "@/content/site";

/** Persistent Call / WhatsApp buttons, bottom-right. */
export function FloatingActions() {
  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col gap-3">
      <a
        href={`https://wa.me/${contact.whatsapp}`}
        aria-label="Message QSI Medicine on WhatsApp"
        className="grid size-14 place-items-center rounded-full bg-[#1f9d55] text-white shadow-lg hover:scale-105"
      >
        <MessageCircle className="size-6" />
      </a>
      <a
        href={`tel:${contact.phone.replace(/\s|-/g, "")}`}
        aria-label="Call QSI Medicine"
        className="grid size-14 place-items-center rounded-full bg-deep text-white shadow-lg hover:scale-105"
      >
        <Phone className="size-5" />
      </a>
    </div>
  );
}
