"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Gooqi Scribe?",
    a: "An ambient AI medical scribe. It records the doctor–patient consultation, transcribes it with speaker labels, and generates a structured SOAP note and prescription for you to review and sign off.",
  },
  {
    q: "Which languages are supported?",
    a: "Indian English, Hindi and mixed Hinglish out of the box, with additional regional languages available depending on the speech provider configured.",
  },
  {
    q: "Is patient data secure?",
    a: "Consent is a hard gate before any recording, every consent is written to an append-only audit log, and audio is stored in a private, access-controlled bucket. The pipeline is designed to be DPDP-ready.",
  },
  {
    q: "What happens if my internet drops mid-consultation?",
    a: "Recording is crash-safe: audio is saved on the device in 30-second chunks as you record, so a refresh or lost connection never loses the visit. Pending chunks upload automatically when you reconnect.",
  },
  {
    q: "Can I edit the note before it's final?",
    a: "Yes. Every note opens as an editable draft — transcript, SOAP fields and prescriptions — and autosaves as you work. Nothing is finalised until you sign off.",
  },
  {
    q: "Can I manage patients and see past visits?",
    a: "Yes. Every consultation is linked to a patient record, and each patient has a profile with their full visit history so you can pull up earlier notes in a couple of clicks.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <Card 
            key={i} 
            className={cn(
              "overflow-hidden border transition-all duration-300 rounded-cards",
              isOpen 
                ? "bg-iris-shadow border-iris-veil shadow-lg" 
                : "bg-iris-shadow/60 border-iris-border/50 hover:border-iris-border hover:bg-iris-shadow"
            )}
          >
            <button
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left group"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-3 text-[17px] font-semibold text-cloud-white tracking-[-0.3px] group-hover:text-clinical-cyan transition-colors">
                <HelpCircle className="size-5 text-lilac-mist shrink-0 stroke-[1.8]" />
                {item.q}
              </span>
              <span className="flex size-7 items-center justify-center rounded-full bg-deep-iris border border-iris-border group-hover:border-clinical-cyan transition-colors">
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-clinical-cyan transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                />
              </span>
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-[14px] leading-relaxed text-ash/90 tracking-[0.28px] border-t border-iris-border/30 pt-4">
                  {item.a}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
