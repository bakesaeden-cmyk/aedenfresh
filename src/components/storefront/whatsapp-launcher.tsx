"use client";

import { MessageCircle } from "lucide-react";

export function WhatsAppLauncher() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
  if (!number) return null;

  const text = encodeURIComponent(
    "Hi Aeden Fresh! I would like help choosing or ordering a fresh bowl.",
  );

  return (
    <a
      href={`https://wa.me/${number}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      className="bg-secondary text-secondary-foreground shadow-luxe-lg fixed right-4 bottom-24 z-50 flex h-13 w-13 items-center justify-center rounded-full transition-transform hover:-translate-y-1 md:right-6 md:bottom-6"
      aria-label="Chat with Aeden Fresh on WhatsApp"
    >
      <MessageCircle size={21} />
    </a>
  );
}
