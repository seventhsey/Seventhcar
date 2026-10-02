import { ArrowUpRight, Mail, Phone, MapPin } from "lucide-react";

export default function ContactUs() {
  return (
    <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-24 bg-[#122b3a] py-16 text-white md:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#8dd5cf]">Contact Seventh</p>
          <h2 id="contact-heading" className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">Let’s plan your pickup.</h2>
          <p className="mt-5 max-w-lg leading-relaxed text-slate-300">A question before you book, or a change to an existing reservation? Get in touch with our team. If you’ve already booked, include your reservation number.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="tel:+2482502815" className="inline-flex items-center gap-3 rounded-lg bg-[#8dd5cf] px-5 py-3 font-semibold text-[#122b3a] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Phone size={18} aria-hidden="true" />Call +248 2502815</a>
            <a href="mailto:seventhseychelles@gmail.com" className="inline-flex items-center gap-3 rounded-lg border border-white/30 px-5 py-3 font-semibold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Mail size={18} aria-hidden="true" />Email us</a>
          </div>
          <a href="mailto:seventhseychelles@gmail.com" className="mt-4 inline-block break-all text-sm text-slate-300 underline underline-offset-4 hover:text-white">seventhseychelles@gmail.com</a>
        </div>
        <div className="border-t border-white/20 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div className="flex items-center gap-3"><MapPin size={21} className="text-[#8dd5cf]" aria-hidden="true" /><h3 className="text-lg font-semibold">Our Mahé office</h3></div>
          <address className="mt-4 text-sm not-italic leading-7 text-slate-300">Unique Building, 1st floor<br />Providence, Mahé<br />Seychelles</address>
          <a href="https://maps.app.goo.gl/BenGYBpuRSKBxe7W9" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8dd5cf] underline underline-offset-4 hover:text-white">Open directions<ArrowUpRight size={17} aria-hidden="true" /></a>
          <div className="mt-7 border-t border-white/20 pt-5 text-sm"><p className="font-semibold">Rental support · 24/7</p><p className="mt-2 text-slate-300">Available throughout the year.</p></div>
        </div>
      </div>
    </section>
  );
}
