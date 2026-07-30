"use client";

import {
  ChevronRight,
  Mail,
  MessageSquareText,
  Phone,
  Plane,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReviewSummary, {
  AvailableExtra,
  BookingData,
  ReservationExtra,
} from "../components/ReviewSummary";

type PaymentOption = "arrival" | "deposit" | "full" | "";
type StoredExtra = number | { id?: number; qty?: number };

type StoredReservation = {
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
  island?: string;
  dropOff?: string;
  extras?: StoredExtra[];
};

type StoredCar = {
  plate_number?: string;
  model?: string;
};

const paymentOptions = [
  {
    id: "arrival" as const,
    title: "Pay on arrival",
    description: "Pay for the rental upon pickup with card or cash.",
    disabled: false,
  },
  {
    id: "deposit" as const,
    title: "10% deposit payment",
    description: "Online deposit payment is coming soon.",
    disabled: true,
  },
  {
    id: "full" as const,
    title: "100% full amount payment",
    description: "Online full payment is coming soon.",
    disabled: true,
  },
];

const initialBookingData: BookingData = {
  start_date: "",
  start_time: "",
  end_date: "",
  end_time: "",
  pickup_location: "",
  dropoff_location: "",
  plate_number: "",
  car_model: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  flight_number: "",
  notes: "",
  payment_option: "",
  estimated_total: 0,
  extras: [],
};

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") as T;
  } catch {
    return fallback;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isValidPhone(value: string) {
  return /^\+?[0-9\s()-]{7,20}$/.test(value.trim());
}

export default function Contact() {
  const router = useRouter();
  const [openReview, setOpenReview] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentOption>("");
  const [submitting, setSubmitting] = useState(false);
  const [availableExtras, setAvailableExtras] = useState<AvailableExtra[]>([]);
  const [data, setData] = useState<BookingData>(initialBookingData);

  useEffect(() => {
    async function loadExtras() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extras`);
        const result = await response.json();

        setAvailableExtras(
          (Array.isArray(result) ? result : []).map((extra) => ({
            id: Number(extra.id),
            name: String(extra.name || `Extra ${extra.id}`),
            price: Number(extra.price || 0),
            charge_type: extra.charge_type === "once" ? "once" : "daily",
          }))
        );
      } catch {
        setAvailableExtras([]);
      }
    }

    loadExtras();
  }, []);

  useEffect(() => {
    const reservation = readStoredJson<StoredReservation>(
      "pendingReservation",
      {}
    );
    const selectedCar = readStoredJson<StoredCar>("selectedCar", {});

    const extras: ReservationExtra[] = (reservation.extras || [])
      .map((item) => {
        const id = typeof item === "number" ? item : Number(item.id);
        if (!id) return null;

        const extra = availableExtras.find((candidate) => candidate.id === id);
        return {
          extra_id: id,
          price_at_booking: Number(extra?.price || 0),
          days: 1,
          qty: typeof item === "number" ? 1 : Number(item.qty || 1),
          charge_type: extra?.charge_type === "once" ? "once" : "daily",
        } satisfies ReservationExtra;
      })
      .filter((item): item is ReservationExtra => Boolean(item));

    setData((current) => ({
      ...current,
      start_date: reservation.pickupDate || "",
      start_time: reservation.pickupTime || "",
      end_date: reservation.returnDate || "",
      end_time: reservation.returnTime || "",
      pickup_location: reservation.island || "",
      dropoff_location: reservation.dropOff || "",
      plate_number: selectedCar.plate_number || "",
      car_model: selectedCar.model || "",
      extras,
    }));
  }, [availableExtras]);

  const bind = (key: keyof BookingData) => ({
    value: String(data[key] ?? ""),
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setData((current) => ({ ...current, [key]: event.target.value })),
  });

  async function submitReservation(confirmed: BookingData) {
    if (submitting) return;

    const firstName = confirmed.firstName.trim();
    const lastName = confirmed.lastName.trim();
    const email = confirmed.email.trim().toLowerCase();
    const phone = confirmed.phone.trim();

    if (!firstName || !lastName || !email || !phone) {
      alert("Please fill in your name, email, and phone number.");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!isValidPhone(phone)) {
      alert("Please enter a valid phone number.");
      return;
    }

    if (!confirmed.plate_number) {
      alert("No vehicle selected. Please go back and choose a vehicle.");
      return;
    }

    if (
      !confirmed.start_date ||
      !confirmed.start_time ||
      !confirmed.end_date ||
      !confirmed.end_time
    ) {
      alert("Reservation dates or times are missing. Please start again.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reservations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: `${firstName} ${lastName}`,
            customer_email: email,
            customer_phone: phone,
            flight_number: confirmed.flight_number || "",
            plate_number: confirmed.plate_number,
            start_date: confirmed.start_date,
            start_time: confirmed.start_time,
            end_date: confirmed.end_date,
            end_time: confirmed.end_time,
            status: "Pending",
            notes: confirmed.notes || "",
            extras: confirmed.extras.map((extra) => ({
              extra_id: extra.extra_id,
              qty: Number(extra.qty || 1),
            })),
          }),
        }
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Reservation could not be created.");
      }

      localStorage.removeItem("pendingReservation");
      localStorage.removeItem("selectedCar");
      router.push(`/confirmation?id=${result.reservationId}`);
    } catch (error) {
      console.error("Reservation submit error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the reservation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="px-4 md:px-10 py-10 mt-16">
        <div className="w-full max-w-5xl mx-auto">
          <div className="p-6 bg-white text-black rounded-2xl">
            <h2 className="text-2xl font-bold mb-6">Basic information</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField label="First name" icon={<UserPlus />} inputProps={{ type: "text", placeholder: "Enter first name", ...bind("firstName") }} />
              <TextField label="Last name" icon={<UserPlus />} inputProps={{ type: "text", placeholder: "Enter last name", ...bind("lastName") }} />
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextField label="E-mail" icon={<Mail />} inputProps={{ type: "email", placeholder: "Enter e-mail", ...bind("email") }} />
                <TextField label="Phone" icon={<Phone />} inputProps={{ type: "tel", placeholder: "Enter phone number", ...bind("phone") }} />
                <TextField label="Flight number" icon={<Plane />} inputProps={{ type: "text", placeholder: "Enter flight number", ...bind("flight_number") }} />
              </div>
              <div className="relative md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Additional notes</label>
                <textarea className="w-full bg-gray-100 rounded-lg py-2 px-4 pl-10 outline-none min-h-[100px]" placeholder="Write any additional notes..." {...bind("notes")} />
                <MessageSquareText className="absolute bg-white p-1 -left-2 top-16 text-blue-500 rounded-full" />
              </div>
            </form>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl space-y-6 mt-20">
          <h2 className="text-2xl font-bold text-gray-800">Payment options</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {paymentOptions.map((option) => {
              const active = selectedPayment === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  disabled={option.disabled}
                  onClick={() => {
                    setSelectedPayment(option.id);
                    setData((current) => ({ ...current, payment_option: option.id }));
                  }}
                  className={`relative text-left rounded-xl p-6 transition space-y-2 border ${
                    option.disabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-70"
                      : active
                        ? "bg-blue-500 text-white border-blue-600 shadow-lg"
                        : "bg-gray-50 text-gray-900 hover:shadow-lg hover:border-blue-400"
                  }`}
                >
                  <h3 className="font-extrabold text-lg">{option.title}</h3>
                  <p className="text-sm">{option.description}</p>
                  <ChevronRight className={`absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 p-1 rounded-full bg-white ${active ? "text-blue-500" : "text-blue-400"}`} />
                </button>
              );
            })}
          </div>

          <div className="flex justify-center mt-8">
            <button
              type="button"
              disabled={!selectedPayment || submitting}
              onClick={() => setOpenReview(true)}
              className={`px-6 py-3 rounded-xl font-bold transition ${
                selectedPayment && !submitting
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Proceed to Confirmation
            </button>
          </div>
        </div>
      </div>

      <ReviewSummary
        open={openReview}
        onClose={() => setOpenReview(false)}
        mode="create"
        lockCar
        initialData={data}
        availableExtras={availableExtras}
        onConfirm={(confirmed) => {
          setData(confirmed);
          submitReservation(confirmed);
        }}
      />
    </>
  );
}

function TextField({
  label,
  icon,
  inputProps,
}: {
  label: string;
  icon: React.ReactNode;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div className="relative">
      <label className="block text-sm font-semibold mb-1">{label}</label>
      <input className="w-full bg-gray-100 rounded-lg py-2 px-4 pl-10 outline-none" {...inputProps} />
      <span className="absolute bg-white p-1 -left-2 top-8 text-blue-500 rounded-full [&>svg]:w-6 [&>svg]:h-6">
        {icon}
      </span>
    </div>
  );
}
