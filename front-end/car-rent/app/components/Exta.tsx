import { ReceiptText, Headset, CalendarDays, MapPin } from "lucide-react";

const features = [
  { icon: ReceiptText, title: "Transparent Pricing", description: "See your total before submitting" },
  { icon: Headset, title: "24/7 Support", description: "We’re always here to help" },
  { icon: CalendarDays, title: "Flexible Booking", description: "Book your car on your schedule" },
  { icon: MapPin, title: "Flexible Locations", description: "Airport, jetty, and custom pickup" },
];

export default function Exta() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 lg:grid-cols-4">
      {features.map(({ icon: Icon, title, description }) => (
        <div key={title} className="flex items-start gap-3">
          <Icon className="mt-1 h-6 w-6 shrink-0 text-[#167a7c]" aria-hidden="true" />
          <div><h2 className="text-sm font-semibold text-[#122b3a]">{title}</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p></div>
        </div>
      ))}
    </div>
  );
}
