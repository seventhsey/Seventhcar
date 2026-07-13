"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";

/* ---------- Types ---------- */
export type ReservationExtra = {
  extra_id: number;
  days: number;                // derived in component
  price_at_booking: number;    // base price
  qty?: number;                // quantity from Extras step
  charge_type?: "daily" | "once";
};

export type AvailableExtra = {
  id: number;
  name: string;
  price: number;               // base price
  charge_type?: "daily" | "once";
};

export type BookingData = {
  // trip (coming from ReservationForm)
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  pickup_location?: string;
  dropoff_location?: string;

  // vehicle (plate hidden in UI but used to fetch rate)
  plate_number: string;
  car_model?: string;

  // customer
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  flight_number?: string;
  notes?: string;

  // payment
  payment_option: "arrival" | "deposit" | "full" | "";

  // money
  estimated_total: number;

  // extras
  extras: ReservationExtra[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  reservationId?: number;
  initialData?: Partial<BookingData>;
  availableExtras?: AvailableExtra[];
  onConfirm: (data: BookingData) => void;
  lockCar?: boolean;
};

/* ---------- Merge helper ---------- */
function mergeData(fetched: Partial<BookingData>, initial?: Partial<BookingData>): BookingData {
  const base: BookingData = {
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
  return { ...base, ...fetched, ...(initial || {}) };
}

/* ---------- Price helpers (same logic as admin) ---------- */
function calculateBookingDays(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
) {
  if (!startDate || !startTime || !endDate || !endTime) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  let days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (endTime > startTime) {
    days += 1;
  }

  return Math.max(1, days);
}
function tierMultiplier(dayCount: number) {
  if (dayCount <= 0) return 1;
  if (dayCount === 1) return 1.5;
  if (dayCount < 4) return 1.25;
  if (dayCount < 7) return 1.11;
  if (dayCount < 11) return 1.0;
  if (dayCount < 15) return 0.9;
  if (dayCount < 22) return 0.8;
  return 0.7;
}

export default function ReviewSummary({
  open,
  onClose,
  mode,
  reservationId,
  initialData,
  availableExtras = [],
  onConfirm,
  lockCar = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BookingData>(() => mergeData({}, initialData));
  useEffect(() => {
  if (!open) return;
  setData(mergeData({}, initialData || {}));
}, [initialData, open]);

  // (Optional) fetch by ID for admin edit
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!reservationId || !open) return;
      try {
        setLoading(true);
        const [rRes, eRes] = await Promise.all([
          fetch(`/api/reservations/${reservationId}`),
          fetch(`/api/reservations/${reservationId}/extras`),
        ]);
        const rJson = await rRes.json();
        const eJson: ReservationExtra[] = await eRes.json();
        if (!ignore) setData(mergeData({ ...rJson, extras: eJson }, initialData));
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [reservationId, open, initialData]);

  // days
  const dayCount = useMemo(
  () => calculateBookingDays(data.start_date, data.start_time, data.end_date, data.end_time),
  [data.start_date, data.start_time, data.end_date, data.end_time]
);

  // daily rate from plate_number
  const [dailyRate, setDailyRate] = useState(0);
  useEffect(() => {
    (async () => {
      if (!data.plate_number) { setDailyRate(0); return; }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/cars/${encodeURIComponent(data.plate_number)}`);
        if (res.ok) {
          const car = await res.json();
          setDailyRate(Number(car.price || 0));
        }
      } catch {
        setDailyRate(0);
      }
    })();
  }, [data.plate_number]);

  // extras total = Σ(price * qty * dayCount)
  const extrasTotal = useMemo(() => {
  return (data.extras || []).reduce((sum, ex) => {
    const qty = ex.qty || 1;
    const price = ex.price_at_booking || 0;
    const chargeType = ex.charge_type === "once" ? "once" : "daily";

    if (chargeType === "once") {
      return sum + price * qty;
    }

    return sum + price * qty * dayCount;
  }, 0);
}, [data.extras, dayCount]);

  // final estimate
  const estimated = useMemo(() => {
    const mult = tierMultiplier(dayCount);
    const carPrice = dayCount * dailyRate * mult;
    return carPrice + extrasTotal;
  }, [dayCount, dailyRate, extrasTotal]);

  // keep estimate in data
  useEffect(() => {
    setData((d) => ({ ...d, estimated_total: Number.isFinite(estimated) ? estimated : 0 }));
  }, [estimated]);

  if (!open) return null;

  // toggle an extra; default qty = 1
  function toggleExtra(ex: AvailableExtra) {
    const exists = (data.extras || []).find((e) => e.extra_id === ex.id);
    if (exists) {
      setData((d) => ({ ...d, extras: d.extras.filter((e) => e.extra_id !== ex.id) }));
    } else {
      setData((d) => ({
        ...d,
        extras: [
          ...(d.extras || []),
          {
  extra_id: ex.id,
  price_at_booking: ex.price,
  days: ex.charge_type === "once" ? 1 : dayCount || 1,
  qty: 1,
  charge_type: ex.charge_type === "once" ? "once" : "daily",
},
        ],
      }));
    }
  }
  function setQty(extraId: number, qty: number) {
    setData((d) => ({
      ...d,
      extras: (d.extras || []).map((e) =>
        e.extra_id === extraId ? { ...e, qty: Math.max(1, Math.floor(qty) || 1) } : e
      ),
    }));
  }

  const chosen = new Map((data.extras || []).map((e) => [e.extra_id, e]));

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-xl font-bold">{mode === "edit" ? "Edit Reservation" : "Review & Confirm"}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Vehicle (plate hidden) */}
          <section className="border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Vehicle</h4>
              {lockCar && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 rounded">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-gray-500">Model</label>
                <input
                  value={data.car_model || ""}
                  onChange={(e) => setData({ ...data, car_model: e.target.value })}
                  readOnly={lockCar}
                  className={`w-full ${lockCar ? "bg-gray-100" : "bg-gray-50"} rounded-lg py-2 px-3 outline-none`}
                />
              </div>
            </div>
          </section>

          {/* Trip (dates shown & editable here for final check) */}
          <section className="border rounded-xl p-4">
            <h4 className="font-semibold mb-3">Trip details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledInput label="Start date" type="date" value={data.start_date} onChange={(v) => setData({ ...data, start_date: v })} />
              <LabeledInput label="Start time" type="time" value={data.start_time} onChange={(v) => setData({ ...data, start_time: v })} />
              <LabeledInput label="End date" type="date" value={data.end_date} onChange={(v) => setData({ ...data, end_date: v })} />
              <LabeledInput label="End time" type="time" value={data.end_time} onChange={(v) => setData({ ...data, end_time: v })} />
              <LabeledInput label="Pick-up location" value={data.pickup_location || ""} onChange={(v) => setData({ ...data, pickup_location: v })} />
              <LabeledInput label="Drop-off location" value={data.dropoff_location || ""} onChange={(v) => setData({ ...data, dropoff_location: v })} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{dayCount} day(s)</p>
          </section>

          {/* Customer */}
          <section className="border rounded-xl p-4">
            <h4 className="font-semibold mb-3">Customer</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledInput label="First name" value={data.firstName} onChange={(v) => setData({ ...data, firstName: v })} />
              <LabeledInput label="Last name" value={data.lastName} onChange={(v) => setData({ ...data, lastName: v })} />
              <LabeledInput label="E-mail" type="email" value={data.email} onChange={(v) => setData({ ...data, email: v })} />
              <LabeledInput label="Phone" value={data.phone} onChange={(v) => setData({ ...data, phone: v })} />
              <LabeledInput label="Flight number" value={data.flight_number || ""} onChange={(v) => setData({ ...data, flight_number: v })} />
              <div className="sm:col-span-2">
                <LabeledTextarea label="Notes" value={data.notes || ""} onChange={(v) => setData({ ...data, notes: v })} />
              </div>
            </div>
          </section>

          {/* Extras with qty */}
          <section className="border rounded-xl p-4">
            <h4 className="font-semibold mb-3">Extras</h4>
            {availableExtras.length === 0 ? (
              <p className="text-sm text-gray-500">No extras available.</p>
            ) : (
              <div className="space-y-2">
                {availableExtras.map((ex) => {
                  const picked = chosen.get(ex.id);
                  return (
                    <div
                      key={ex.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 border ${picked ? "bg-blue-50 border-blue-300" : "bg-gray-50"}`}
                    >
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={!!picked}
                          onChange={() => toggleExtra(ex)}
                        />
                        <span className="text-sm">{ex.name}</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
  €{ex.price.toFixed(2)} {ex.charge_type === "once" ? "one-time" : "/day"}
</span>
                        {picked && (
                          <input
                            type="number"
                            min={1}
                            className="w-16 bg-white border rounded px-2 py-1 text-sm"
                            value={picked.qty || 1}
                            onChange={(e) => setQty(ex.id, Number(e.target.value))}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Totals */}
          <section className="border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Estimated total</span>
              <span className="text-xl font-extrabold">
                €{(data.estimated_total || 0).toFixed(2)}
              </span>
            </div>
          </section>

          {loading && <div className="text-sm text-gray-500">Loading reservation…</div>}
        </div>

        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-200">Back</button>
          <button
            onClick={() =>
  onConfirm({
    ...data,
    estimated_total: estimated,
    extras: data.extras.map((ex) => ({
  ...ex,
  days: ex.charge_type === "once" ? 1 : dayCount,
})),
  })
}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {mode === "edit" ? "Save Changes" : "Confirm Reservation"}
          </button>
        </div>
      </div>
    </div>
  );
} 

/* ---------- Small inputs ---------- */
function LabeledInput({
  label, value, onChange, type = "text",
}: { label: string; value: string; onChange: (v: string) => void; type?: string; }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-100 rounded-lg py-2 px-3 outline-none"
      />
    </div>
  );
}
function LabeledTextarea({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void; }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-100 rounded-lg py-2 px-3 outline-none min-h-[84px]"
      />
    </div>
  );
}
