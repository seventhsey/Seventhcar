"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  transmission?: string;
  fuel_type?: string;
  door_count?: number;
  storage_space?: string;
  price: string | number;
};

type Extra = {
  id: number;
  name: string;
  price: string | number;
  charge_type?: "daily" | "once";
};

type SelectedExtra = {
  extra_id: number;
  name: string;
  price: number;
  charge_type: "daily" | "once";
  qty: number;
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length <= 1) {
    return {
      firstName: parts[0] || "",
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function timeShort(value: string) {
  return String(value || "").slice(0, 5);
}

function calculateBookingDays(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
) {
  if (!startDate || !startTime || !endDate || !endTime) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  let days =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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

export default function ManageReservationPage() {
  const router = useRouter();

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

  const dayCount = useMemo(
    () => calculateBookingDays(startDate, startTime, endDate, endTime),
    [startDate, startTime, endDate, endTime]
  );

  const selectedCar = useMemo(() => {
    return (
      availableCars.find((car) => car.plate_number === selectedPlate) ||
      currentCar
    );
  }, [availableCars, currentCar, selectedPlate]);

  const dailyRate = Number(selectedCar?.price || 0);

  const extrasTotal = useMemo(() => {
    return selectedExtras.reduce((sum, ex) => {
      if (ex.charge_type === "once") {
        return sum + ex.price * ex.qty;
      }

      return sum + ex.price * ex.qty * dayCount;
    }, 0);
  }, [selectedExtras, dayCount]);

  const newTotal = useMemo(() => {
    const carTotal = dayCount * dailyRate * tierMultiplier(dayCount);
    return carTotal + extrasTotal;
  }, [dayCount, dailyRate, extrasTotal]);

  const oldTotal = Number(reservation?.total_price || 0);
  const difference = newTotal - oldTotal;

  useEffect(() => {
    async function loadExtras() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extras`);
        const raw = await res.json();

        setAllExtras(
          (Array.isArray(raw) ? raw : []).map((ex) => ({
            id: Number(ex.id),
            name: ex.name,
            price: Number(ex.price || 0),
            charge_type: ex.charge_type === "once" ? "once" : "daily",
          }))
        );
      } catch {
        setAllExtras([]);
      }
    }

    loadExtras();
  }, []);

  useEffect(() => {
    if (!reservation || !startDate || !endDate) return;

    async function checkAvailability() {
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          excludeReservationId: String(reservation.id),
        });

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/cars/available-for-edit?${params.toString()}`
        );

        const cars = await res.json();
        const cleanCars: Car[] = Array.isArray(cars) ? cars : [];

        setAvailableCars(cleanCars);

        const selectedStillAvailable = cleanCars.some(
          (car) => car.plate_number === selectedPlate
        );

        if (!selectedStillAvailable) {
          setAvailabilityMessage(
            "The selected vehicle is not available for these dates. Please choose another vehicle."
          );

          if (cleanCars.length > 0) {
            setSelectedPlate(cleanCars[0].plate_number);
          }
        } else {
          setAvailabilityMessage("");
        }
      } catch {
        setAvailabilityMessage("Could not check vehicle availability.");
      }
    }

    checkAvailability();
  }, [reservation, startDate, endDate, selectedPlate]);

  const lookupReservation = async () => {
    if (!reservationId.trim() || !surname.trim()) {
      alert("Please enter reservation ID and surname.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reservations/lookup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservation_id: reservationId.trim(),
            surname: surname.trim(),
          }),
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Reservation not found.");
      }

      const loadedReservation: Reservation = result.reservation;
      const customer = splitName(loadedReservation.customer_name || "");

      setReservation(loadedReservation);
      setCurrentCar(result.car || null);
      setSelectedPlate(loadedReservation.plate_number);

      setFirstName(customer.firstName);
      setLastName(customer.lastName);
      setEmail(loadedReservation.customer_email || "");
      setPhone(loadedReservation.customer_phone || "");
      setFlightNumber(loadedReservation.flight_number || "");
      setNotes(loadedReservation.notes || "");

      setStartDate(loadedReservation.start_date || "");
      setStartTime(timeShort(loadedReservation.start_time));
      setEndDate(loadedReservation.end_date || "");
      setEndTime(timeShort(loadedReservation.end_time));

      const loadedExtras = Array.isArray(result.extras) ? result.extras : [];

      setSelectedExtras(
        loadedExtras.map((ex) => {
          const currentPrice = Number(ex.current_price || ex.price_at_booking || 0);
          const priceAtBooking = Number(ex.price_at_booking || 0);
          const qty =
            currentPrice > 0
              ? Math.max(1, Math.round(priceAtBooking / currentPrice))
              : 1;

          return {
            extra_id: Number(ex.extra_id),
            name: ex.name || `Extra #${ex.extra_id}`,
            price: currentPrice,
            charge_type: ex.charge_type === "once" ? "once" : "daily",
            qty,
          };
        })
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load reservation.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExtra = (extra: Extra) => {
    const id = Number(extra.id);
    const exists = selectedExtras.some((ex) => ex.extra_id === id);

    if (exists) {
      setSelectedExtras((prev) => prev.filter((ex) => ex.extra_id !== id));
      return;
    }

    setSelectedExtras((prev) => [
      ...prev,
      {
        extra_id: id,
        name: extra.name,
        price: Number(extra.price || 0),
        charge_type: extra.charge_type === "once" ? "once" : "daily",
        qty: 1,
      },
    ]);
  };

  const setExtraQty = (extraId: number, qty: number) => {
    setSelectedExtras((prev) =>
      prev.map((ex) =>
        ex.extra_id === extraId
          ? { ...ex, qty: Math.max(1, Math.floor(qty) || 1) }
          : ex
      )
    );
  };

  const saveChanges = async () => {
    if (!reservation) return;

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanFirstName || !cleanLastName || !cleanEmail || !cleanPhone) {
      alert("Please fill in name, email, and phone.");
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      alert("Please fill in start and end date/time.");
      return;
    }

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (start >= end) {
      alert("Return date/time must be after pickup date/time.");
      return;
    }

    const selectedCarIsAvailable = availableCars.some(
      (car) => car.plate_number === selectedPlate
    );

    if (!selectedCarIsAvailable) {
      alert("Please choose an available vehicle for the selected dates.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        customer_name: `${cleanFirstName} ${cleanLastName}`.trim(),
        customer_email: cleanEmail,
        customer_phone: cleanPhone,
        flight_number: flightNumber.trim(),
        plate_number: selectedPlate,
        start_date: startDate,
        start_time: startTime,
        end_date: endDate,
        end_time: endTime,
        total_price: Number(newTotal.toFixed(2)),
        status: "Pending",
        notes: notes.trim(),
        extras: selectedExtras.map((ex) => ({
          extra_id: ex.extra_id,
          days: ex.charge_type === "once" ? 1 : dayCount,
          price_at_booking: ex.price * ex.qty,
        })),
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reservations/${reservation.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Reservation could not be updated.");
      }

      router.push(
        `/confirmation?id=${reservation.id}&total=${Number(
          newTotal || 0
        ).toFixed(2)}&mode=updated`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not update reservation.";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-24">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          Manage reservation
        </h1>

        <p className="text-gray-600 mb-8">
          Enter your reservation ID and surname to load and edit your reservation.
        </p>

        {!reservation && (
          <div className="space-y-5 max-w-xl">
            <div>
              <label className="block text-sm font-bold mb-1 text-gray-800">
                Reservation ID
              </label>
              <input
                value={reservationId}
                onChange={(e) => setReservationId(e.target.value)}
                className="w-full border rounded-lg p-3 text-black"
                placeholder="Example: 123"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1 text-gray-800">
                Surname
              </label>
              <input
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                className="w-full border rounded-lg p-3 text-black"
                placeholder="Example: Smith"
              />
            </div>

            <button
              type="button"
              onClick={lookupReservation}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold rounded-xl py-3 hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Loading..." : "Find reservation"}
            </button>
          </div>
        )}

        {reservation && (
          <div className="space-y-8">
            <div className="bg-gray-100 rounded-xl p-4 text-gray-900 space-y-2">
              <p>
                <strong>Reservation ID:</strong> #{reservation.id}
              </p>
              <p>
                <strong>Status:</strong> {reservation.status}
              </p>
              <p>
                <strong>Current vehicle:</strong>{" "}
                {selectedCar?.car_name || "Selected vehicle"}
              </p>
            </div>

            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                Trip details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Field label="Pickup date">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>

                <Field label="Pickup time">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>

                <Field label="Return date">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>

                <Field label="Return time">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>
              </div>

              <p className="text-sm text-gray-600 mt-2">
                Charged days: {dayCount}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                Vehicle
              </h2>

              {availabilityMessage && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-4 mb-4">
                  {availabilityMessage}
                </div>
              )}

              <select
                value={selectedPlate}
                onChange={(e) => setSelectedPlate(e.target.value)}
                className="w-full border rounded-lg p-3 text-black"
              >
                {availableCars.map((car) => (
                  <option key={car.plate_number} value={car.plate_number}>
                    {car.car_name} — €{Number(car.price || 0).toFixed(2)}/day
                  </option>
                ))}
              </select>

              {availableCars.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  No vehicles are available for the selected dates.
                </p>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                Extras
              </h2>

              <div className="space-y-3">
                {allExtras.map((extra) => {
                  const selected = selectedExtras.find(
                    (ex) => ex.extra_id === Number(extra.id)
                  );

                  return (
                    <div
                      key={extra.id}
                      className={`border rounded-xl p-4 ${
                        selected ? "bg-blue-50 border-blue-300" : "bg-white"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <label className="flex items-center gap-3 text-gray-900">
                          <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={() => toggleExtra(extra)}
                          />
                          <span className="font-semibold">{extra.name}</span>
                        </label>

                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-700">
                            €{Number(extra.price || 0).toFixed(2)}{" "}
                            {extra.charge_type === "once"
                              ? "one-time"
                              : "/day"}
                          </span>

                          {selected && (
                            <input
                              type="number"
                              min={1}
                              value={selected.qty}
                              onChange={(e) =>
                                setExtraQty(
                                  Number(extra.id),
                                  Number(e.target.value)
                                )
                              }
                              className="w-20 border rounded-lg p-2 text-black"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                Customer information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="First name">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>

                <Field label="Last name">
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>

                <Field label="Flight number">
                  <input
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    className="w-full border rounded-lg p-3 text-black"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Notes">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border rounded-lg p-3 text-black min-h-[120px]"
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="border rounded-xl p-4 text-gray-900">
              <h2 className="text-xl font-bold mb-4">Price summary</h2>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Original total</span>
                  <strong>€{oldTotal.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between">
                  <span>New total</span>
                  <strong>€{newTotal.toFixed(2)}</strong>
                </div>

                <div className="flex justify-between border-t pt-2">
                  <span>Difference</span>
                  <strong
                    className={
                      difference > 0
                        ? "text-red-600"
                        : difference < 0
                          ? "text-green-600"
                          : "text-gray-900"
                    }
                  >
                    {difference > 0 ? "+" : ""}
                    €{difference.toFixed(2)}
                  </strong>
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-4">
                Changes will be submitted as pending for review. If the price
                increases, the team will confirm the additional amount manually.
              </p>
            </section>

            <div className="flex flex-col md:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => setReservation(null)}
                className="px-5 py-3 rounded-xl bg-gray-200 text-gray-900 font-bold"
              >
                Look up another reservation
              </button>

              <button
                type="button"
                onClick={saveChanges}
                disabled={saving || availableCars.length === 0}
                className="px-5 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? "Saving..." : "Submit reservation changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-bold mb-1 text-gray-800">
        {label}
      </span>
      {children}
    </label>
  );
}