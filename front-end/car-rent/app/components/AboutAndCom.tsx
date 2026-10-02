import Link from "next/link";
import { ArrowUpRight, MapPin, MessageCircle, ReceiptText } from "lucide-react";

const benefits = [
  { icon: ReceiptText, title: "Know your rental total", text: "Review the car, protection and extras together before sending your request." },
  { icon: MapPin, title: "Choose your meeting point", text: "Select the airport, jetty or another pickup location when you book." },
  { icon: MessageCircle, title: "Talk to our team", text: "Have a question about your trip? Contact Seventh directly for help with the details." },
];

export default function AboutAndCom() {
  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-24 bg-[#f2f7f8] py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#167a7c]">Seventh Car Hire · Mahé</p>
            <h2 id="about-heading" className="text-4xl font-semibold leading-[1.15] tracking-tight text-[#122b3a] md:text-5xl">Less organising.<br />More exploring.</h2>
            <p className="mt-6 max-w-lg leading-relaxed text-slate-600">A beach stop, a lunch in town, a different road home. Make room for your own plans with a car for your stay on Mahé.</p>
            <p className="mt-4 max-w-lg leading-relaxed text-slate-600">Choose your dates and vehicle online. We’ll review your reservation request and contact you to confirm the arrangements.</p>
            <Link href="/vehicles" className="mt-7 inline-flex items-center gap-3 border-b-2 border-[#167a7c] pb-2 font-semibold text-[#122b3a] transition hover:text-[#167a7c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#167a7c]">Meet the fleet <ArrowUpRight size={20} aria-hidden="true" /></Link>
          </div>
          <div className="rounded-3xl bg-[#122b3a] p-7 text-white md:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8dd5cf]">Your trip starts here</p>
            <h3 className="mt-3 text-2xl font-semibold">Three steps. One island to explore.</h3>
            <ol className="mt-7 divide-y divide-white/15">
              {[
                ["Set your dates", "Tell us when and where you’d like to collect and return the car."],
                ["Make it yours", "Choose a vehicle, protection plan and the extras you need."],
                ["Send your request", "Our team will get back to you to confirm your booking."],
              ].map(([title, text], index) => (
                <li key={title} className="flex gap-5 py-5">
                  <span className="pt-1 text-sm font-semibold text-[#8dd5cf]" aria-hidden="true">0{index + 1}</span>
                  <div><h4 className="font-semibold">{title}</h4><p className="mt-2 text-sm leading-relaxed text-slate-300">{text}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="mt-14 grid gap-8 border-t border-slate-200 pt-9 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-4">
              <Icon className="mt-1 h-6 w-6 shrink-0 text-[#167a7c]" aria-hidden="true" />
              <div><h3 className="font-semibold text-[#122b3a]">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
