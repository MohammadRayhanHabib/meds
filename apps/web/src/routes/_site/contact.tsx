import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";

import { PageIntro, Section } from "@/components/site/page-intro";
import { contact, management } from "@/content/site";

export const Route = createFileRoute("/_site/contact")({
  head: () => ({ meta: [{ title: "Contact — QSI Medicine" }] }),
  component: ContactPage,
});

function ContactPage() {
  const [sending, setSending] = useState(false);

  // Phase 1: hands off to the visitor's email app.
  // TODO(next phase): replace with a tRPC `enquiry.create` mutation (Contact Enquiry entity in SRS §7).
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !phone || !message) {
      toast.error("Add your name, phone number and message so we can reply.");
      return;
    }
    setSending(true);
    const body = `Name: ${name}\nPhone: ${phone}\n\n${message}`;
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(
      "Website enquiry",
    )}&body=${encodeURIComponent(body)}`;
    toast.success("Your email app is open with the message ready to send.");
    setSending(false);
  }

  const field =
    "mt-1.5 w-full rounded-md border border-rule bg-white px-3.5 py-2.5 text-base outline-none focus:border-rx";

  return (
    <>
      <PageIntro eyebrow="Contact" title="Contact QSI Medicine">
        <p>Visit the pharmacy, call us, or message us on WhatsApp to check if a medicine is in stock.</p>
      </PageIntro>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-7">
            <InfoRow icon={<MapPin className="size-5" />} title="Address">
              <address className="not-italic">
                {contact.addressLines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
              <a href={contact.mapLink} className="mt-1 inline-block text-sm font-semibold text-rx underline underline-offset-4">
                Get directions
              </a>
            </InfoRow>
            <InfoRow icon={<Phone className="size-5" />} title="Phone">
              <a href={`tel:${contact.phone.replace(/\s|-/g, "")}`}>{contact.phone}</a>
            </InfoRow>
            <InfoRow icon={<MessageCircle className="size-5" />} title="WhatsApp">
              <a href={`https://wa.me/${contact.whatsapp}`} className="text-rx underline underline-offset-4">
                Message us on WhatsApp
              </a>
            </InfoRow>
            <InfoRow icon={<Mail className="size-5" />} title="Email">
              <a href={`mailto:${contact.email}`}>{contact.email}</a>
            </InfoRow>
            <InfoRow icon={<Clock className="size-5" />} title="Opening hours">
              <dl>
                {contact.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-6">
                    <dt>{h.days}</dt>
                    <dd className="text-mute">{h.time}</dd>
                  </div>
                ))}
              </dl>
            </InfoRow>
            <div className="border-t border-rule pt-6 text-sm text-mute">
              {management.map((m) => (
                <p key={m.name}>
                  <span className="font-semibold text-ink">{m.role}:</span> {m.name}
                  {m.credentials && `, ${m.credentials}`}
                </p>
              ))}
            </div>
          </div>

          <form onSubmit={onSubmit} className="rounded-3xl border border-rule bg-white p-7" noValidate>
            <h2 className="text-2xl font-semibold">Send an enquiry</h2>
            <p className="mt-1 text-sm text-mute">
              Please don't send prescriptions or personal medical details here. Bring your
              prescription to the pharmacy.
            </p>
            <div className="mt-6 grid gap-5">
              <label className="block text-sm font-medium">
                Your name
                <input name="name" autoComplete="name" required className={field} />
              </label>
              <label className="block text-sm font-medium">
                Phone number
                <input name="phone" type="tel" autoComplete="tel" required className={field} />
              </label>
              <label className="block text-sm font-medium">
                Message
                <textarea
                  name="message"
                  rows={5}
                  required
                  placeholder="For example: Is Napa Extend 500 mg in stock?"
                  className={field}
                />
              </label>
              <button
                type="submit"
                disabled={sending}
                className="justify-self-start rounded-md bg-rx px-5 py-3 font-semibold text-white hover:bg-ink disabled:opacity-60"
              >
                Send enquiry
              </button>
            </div>
          </form>
        </div>
      </Section>

      <div className="border-t border-rule">
        <iframe
          title="Map showing QSI Medicine near Kachukhet Bazar"
          src={contact.mapEmbed}
          className="h-[360px] w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </>
  );
}

function InfoRow({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 text-rx" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h2 className="font-[family-name:var(--font-body)] text-sm font-semibold text-mute">{title}</h2>
        <div className="mt-1 text-lg">{children}</div>
      </div>
    </div>
  );
}
