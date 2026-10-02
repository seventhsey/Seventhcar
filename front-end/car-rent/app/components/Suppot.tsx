import Link from "next/link";
import { ArrowRight, Compass, LifeBuoy, ClipboardCheck } from "lucide-react";

const resources = [
  { icon: Compass, title: "Planning your trip", text: "Documents, protection and the details to check before booking.", href: "/faq", link: "Read the rental FAQs" },
  { icon: ClipboardCheck, title: "Already booked?", text: "Look up your reservation to review or request changes to your plans.", href: "/manage-reservation", link: "Manage your reservation" },
  { icon: LifeBuoy, title: "Need a hand?", text: "Speak to our team about pickup, your rental or returning the car.", href: "#contact", link: "Contact Seventh" },
];

export function SupportCenter() {
  return (
    <section aria-labelledby="help-heading" className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-9 max-w-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#167a7c]">Useful before you go</p>
        <h2 id="help-heading" className="text-3xl font-semibold tracking-tight text-[#122b3a] md:text-4xl">A little help along the way.</h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {resources.map(({ icon: Icon, title, text, href, link }) => (
          <Link href={href} key={title} className="group flex flex-col rounded-2xl border border-slate-200 p-6 transition hover:border-[#167a7c] hover:bg-[#f2f7f8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#167a7c]">
            <Icon className="mb-6 h-7 w-7 text-[#167a7c]" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-[#122b3a]">{title}</h3>
            <p className="mb-7 mt-3 text-sm leading-relaxed text-slate-600">{text}</p>
            <span className="mt-auto flex items-center justify-between gap-3 text-sm font-semibold text-[#122b3a]">{link}<ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default SupportCenter;
