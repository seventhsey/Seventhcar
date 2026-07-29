"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clampExtraQuantity,
  getExtraMaxQuantity,
} from "../lib/extraLimits";
import {
  requestReservationQuote,
  ReservationQuote,
} from "../lib/quote";

type Reservation = {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  flight_number?: string;
  plate_number: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  total_price: number;
  status: string;
  notes?: string;
};

type Car = {
  plate_number: string;
  car_name: string;
  price: string | number;
};

type Extra = {
  id: number;
  name: string;
  price: number;
  charge_type: "daily" | "once";
};

type SelectedExtra = Extra & {
  extra_id: number;
  qty: number;
};

function splitName(fullName: string) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

function shortTime(value: string) {
  return String(value || "").slice(0, 5);
}

export default function ManageReservationPage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [reservationId, setReservationId] = useState("");
  const [surname, setSurname] = useState("");
  const [reservation, setReservation] = useState<Reservation | null>(null);

  const [allExtras, setAllExtras] = useState<Extra[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [availableCars, setAvailableCars] = useState<Car[]>([]);
  const [currentCar, setCurrentCar] = useState<Car | null>(null);
  const [selectedPlate, setSelectedPlate] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [quote, setQuote] = useState<ReservationQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  useEffect(() => {
    async function loadExtras() {
      try {
        const response = await fetch(`${apiUrl}/extras`);
        const result = await response.json();
        setAllExtras(
          (Array.isArray(result) ? result : []).map((extra) => ({
            id: Number(extra.id),
            name: String(extra.name || `Extra ${extra.id}`),
            price: Number(extra.price || 0),
            charge_type: extra.charge_type === "once" ? "once" : "daily",
          }))
        );
      } catch {
        setAllExtras([]);
      }
    }

    loadExtras();
  }, [apiUrl]);

  useEffect(() => {
    if (!reservation || !startDate || !endDate) return;

    const controller = new AbortController();

    async function checkAvailability() {
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          excludeReservationId: String(reservation.id),
        });
        const response = await fetch(
          `${apiUrl}/cars/available-for-edit?${params.toString()}`,
          { signal: controller.signal }
        );
        const result = await response.json();
        const cars: Car[] = Array.isArray(result) ? result : [];
        setAvailableCars(cars);

        if (!cars.some((car) => car.plate_number === selectedPlate)) {
          setAvailabilityMessage(
            "The selected vehicle is unavailable for these dates. Choose another vehicle."
          );
          if (cars.length) setSelectedPlate(cars[0].plate_number);
        } else {
          setAvailabilityMessage("");
        }
      } catch {
        if (!controller.signal.aborted) {
          setAvailabilityMessage("Could not check vehicle availability.");
        }
      }
    }

    checkAvailability();
    return () => controller.abort();
  }, [apiUrl, reservation, startDate, endDate, selectedPlate]);

  const quoteInput = useMemo(
    () => ({
      plate_number: selectedPlate,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      extras: selectedExtras.map((extra) => ({
        extra_id: extra.extra_id,
        qty: extra.qty,
      })),
    }),
    [selectedPlate, startDate, startTime, endDate, endTime, selectedExtras]
  );

  useEffect(() => {
    if (!reservation) return;

    const complete =
      quoteInput.plate_number &&
      quoteInput.start_date &&
      quoteInput.start_time &&
      quoteInput.end_date &&
      quoteInput.end_time;

    if (!complete) {
      setQuote(null);
      setQuoteError("Complete the trip details to calculate the new total.");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setQuoteLoading(true);
        setQuoteError("");
        setQuote(await requestReservationQuote(quoteInput, controller.signal));
      } catch (error) {
        if (controller.signal.aborted) return;
        setQuote(null);
        setQuoteError(
          error instanceof Error ? error.message : "Could not calculate the new total."
        );
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [reservation, quoteInput]);

  async function lookupReservation() {
    if (!reservationId.trim() || !surname.trim()) {
      alert("Please enter reservation ID and surname.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/reservations/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_id: reservationId.trim(),
          surname: surname.trim(),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Reservation not found.");
      }

      const loaded: Reservation = result.reservation;
      const customer = splitName(loaded.customer_name);
      setReservation(loaded);
      setCurrentCar(result.car || null);
      setSelectedPlate(loaded.plate_number);
      setFirstName(customer.firstName);
      setLastName(customer.lastName);
      setEmail(loaded.customer_email || "");
      setPhone(loaded.customer_phone || "");
      setFlightNumber(loaded.flight_number || "");
      setNotes(loaded.notes || "");
      setStartDate(loaded.start_date || "");
      setStartTime(shortTime(loaded.start_time));
      setEndDate(loaded.end_date || "");
      setEndTime(shortTime(loaded.end_time));

      const extras = Array.isArray(result.extras) ? result.extras : [];
      setSelectedExtras(
        extras.map((item) => {
          const matching = allExtras.find(
            (extra) => extra.id === Number(item.extra_id)
          );
          const unitPrice = Number(item.current_price || matching?.price || 0);
          const bookedPrice = Number(item.price_at_booking || unitPrice);
          const inferredQty = unitPrice > 0
            ? Math.max(1, Math.round(bookedPrice / unitPrice))
            : 1;
          const base = matching || {
            id: Number(item.extra_id),
            name: String(item.name || `Extra ${item.extra_id}`),
            price: unitPrice,
            charge_type: item.charge_type === "once" ? "once" : "daily",
          };

          return {
            ...base,
            extra_id: Number(item.extra_id),
            qty: clampExtraQuantity(base, inferredQty),
          };
        })
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not load reservation.");
    } finally {
      setLoading(false);
    }
  }

  function toggleExtra(extra: Extra) {
    const exists = selectedExtras.some(
      (selected) => selected.extra_id === extra.id
    );

    if (exists) {
      setSelectedExtras((current) =>
        current.filter((selected) => selected.extra_id !== extra.id)
      );
      return;
    }

    setSelectedExtras((current) => [
      ...current,
      { ...extra, extra_id: extra.id, qty: 1 },
    ]);
  }

  function setExtraQuantity(extra: Extra, quantity: number) {
    const safeQuantity = clampExtraQuantity(extra, quantity);
    setSelectedExtras((current) =>
      current.map((selected) =>
        selected.extra_id === extra.id
          ? { ...selected, qty: safeQuantity }
          : selected
      )
    );
  }

  async function saveChanges() {
    if (!reservation || !quote || quoteLoading || quoteError) return;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      alert("Please fill in name, email, and phone.");
      return;
    }

    if (!availableCars.some((car) => car.plate_number === selectedPlate)) {
      alert("Please choose an available vehicle.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${apiUrl}/reservations/${reservation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: `${firstName.trim()} ${lastName.trim()}`,
          customer_email: email.trim().toLowerCase(),
          customer_phone: phone.trim(),
          flight_number: flightNumber.trim(),
          plate_number: selectedPlate,
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          total_price: quote.total,
          status: "Pending",
          notes: notes.trim(),
          extras: selectedExtras.map((extra) => ({
            extra_id: extra.extra_id,
            qty: extra.qty,
          })),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Reservation could not be updated.");
      }

      router.push(`/confirmation?id=${reservation.id}&mode=updated`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update reservation.");
    } finally {
      setSaving(false);
    }
  }

  const oldTotal = Number(reservation?.total_price || 0);
  const newTotal = Number(quote?.total || 0);
  const difference = newTotal - oldTotal;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-24">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Manage reservation</h1>
        <p className="text-gray-600 mb-8">
          Enter your reservation ID and surname to load and edit your reservation.
        </p>

        {!reservation ? (
          <div className="space-y-5 max-w-xl">
            <Field label="Reservation ID">
              <input value={reservationId} onChange={(e) => setReservationId(e.target.value)} className="w-full border rounded-lg p-3 text-black" />
            </Field>
            <Field label="Surname">
              <input value={surname} onChange={(e) => setSurname(e.target.value)} className="w-full border rounded-lg p-3 text-black" />
            </Field>
            <button onClick={lookupReservation} disabled={loading} className="w-full bg-blue-600 text-white font-bold rounded-xl py-3 disabled:bg-gray-400">
              {loading ? "Loading..." : "Find reservation"}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-gray-100 rounded-xl p-4 text-gray-900">
              <p><strong>Reservation ID:</strong> #{reservation.id}</p>
              <p><strong>Status:</strong> {reservation.status}</p>
              <p><strong>Current vehicle:</strong> {currentCar?.car_name || "Selected vehicle"}</p>
            </div>

            <section>
              <h2 className="text-xl font-bold mb-4">Trip details</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Field label="Pickup date"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
                <Field label="Pickup time"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
                <Field label="Return date"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
                <Field label="Return time"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Vehicle</h2>
              {availabilityMessage && <p className="bg-yellow-50 border rounded-xl p-4 mb-4">{availabilityMessage}</p>}
              <select value={selectedPlate} onChange={(e) => setSelectedPlate(e.target.value)} className="w-full border rounded-lg p-3 text-black">
                {availableCars.map((car) => <option key={car.plate_number} value={car.plate_number}>{car.car_name}</option>)}
              </select>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Extras</h2>
              <div className="space-y-3">
                {allExtras.map((extra) => {
                  const selected = selectedExtras.find((item) => item.extra_id === extra.id);
                  const max = getExtraMaxQuantity(extra);
                  return (
                    <div key={extra.id} className={`border rounded-xl p-4 ${selected ? "bg-blue-50 border-blue-300" : ""}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <label className="flex items-center gap-3">
                          <input type="checkbox" checked={Boolean(selected)} onChange={() => toggleExtra(extra)} />
                          <span className="font-semibold">{extra.name}</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <span>€{extra.price.toFixed(2)} {extra.charge_type === "once" ? "one-time" : "/day"}</span>
                          {selected && max > 1 && <input type="number" min={1} max={max} value={selected.qty} onChange={(e) => setExtraQuantity(extra, Number(e.target.value))} className="w-20 border rounded-lg p-2 text-black" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">Customer information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="First name"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
                <Field label="Last name"><input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
                <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
                <Field label="Phone"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
                <Field label="Flight number"><input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} className="w-full border rounded-lg p-3 text-black" /></Field>
                <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border rounded-lg p-3 text-black min-h-[100px]" /></Field>
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <h2 className="text-xl font-bold mb-4">Backend price summary</h2>
              {quoteLoading ? <p>Calculating…</p> : quoteError ? <p className="text-red-600">{quoteError}</p> : quote ? (
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Original total</span><strong>€{oldTotal.toFixed(2)}</strong></div>
                  <div className="flex justify-between"><span>New total</span><strong>€{newTotal.toFixed(2)}</strong></div>
                  <div className="flex justify-between border-t pt-2"><span>Difference</span><strong>{difference > 0 ? "+" : ""}€{difference.toFixed(2)}</strong></div>
                </div>
              ) : null}
            </section>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setReservation(null)} className="px-5 py-3 rounded-xl bg-gray-200 font-bold">Look up another reservation</button>
              <button onClick={saveChanges} disabled={saving || !quote || quoteLoading || Boolean(quoteError) || availableCars.length === 0} className="px-5 py-3 rounded-xl bg-green-600 text-white font-bold disabled:bg-gray-400">
                {saving ? "Saving..." : "Submit reservation changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold mb-1 text-gray-800">{label}</span>
      {children}
    </label>
  );
}
