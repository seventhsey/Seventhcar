import { ExternalLink, MapPin, Navigation } from "lucide-react";

const GOOGLE_MAPS_PIN = "https://maps.app.goo.gl/BenGYBpuRSKBxe7W9";
const EMBED_MAP =
  "https://www.google.com/maps?q=Providence,+Mahe,+Seychelles&z=14&output=embed";

export default function LocationMap() {
  return (
    <section className="w-full bg-white py-14 md:py-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 text-[#1c7fec] font-semibold text-sm mb-2">
              <MapPin className="w-4 h-4" />
              Our location
            </div>
            <h2 className="text-[30px] md:text-[40px] leading-tight font-bold text-gray-900">
              Find us in Providence
            </h2>
            <p className="mt-3 text-gray-600 max-w-2xl text-sm md:text-base leading-relaxed">
              We are based in the Providence area on Mahé. The map below shows the
              surrounding district; click anywhere on it to open our exact location
              in Google Maps.
            </p>
          </div>

          <a
            href={GOOGLE_MAPS_PIN}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 self-start md:self-auto rounded-xl bg-gradient-to-r from-[#1c78ec] to-[#1cb4ec] px-5 py-3 text-white font-semibold shadow-sm hover:shadow-md transition"
          >
            <Navigation className="w-4 h-4" />
            Get directions
          </a>
        </div>

        <a
          href={GOOGLE_MAPS_PIN}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open our exact location in Google Maps"
          className="group block relative overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-[0_18px_45px_rgba(16,24,40,0.10)]"
        >
          <div className="relative h-[330px] md:h-[460px] w-full">
            <iframe
              src={EMBED_MAP}
              title="Providence, Mahé map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0 pointer-events-none grayscale-[10%] group-hover:scale-[1.01] transition-transform duration-500"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

            <div className="absolute left-4 right-4 bottom-4 md:left-6 md:right-auto md:bottom-6 flex items-center gap-3 rounded-2xl bg-white/95 backdrop-blur px-4 py-3 shadow-lg border border-white/70">
              <div className="w-10 h-10 rounded-full bg-[#1c7fec] text-white flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900">Providence, Mahé</p>
                <p className="text-xs md:text-sm text-gray-600 truncate">
                  Click to open exact Google Maps pin
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-[#1c7fec] ml-2 shrink-0" />
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
