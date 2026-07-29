"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import {
  clampExtraQuantity,
  getExtraMaxQuantity,
} from "../lib/extraLimits";
import {
  requestReservationQuote,
  ReservationQuote,
} from "../lib/quote";

export type ReservationExtra = {
  extra_id: number;
  days: number;
  price_at_booking: number;
  qty?: number;
  charge_type?: "daily" | "once";
};

export type AvailableExtra = {
  id: number;
  name: string;
  price: number;
  charge_type?: "daily" | "once";
};

export type BookingData = {
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  pickup_location?: string;
  dropoff_location?: string;
  plate_number: string;
  car_model?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  flight_number?: string;
  notes?: string;
  payment_option: "arrival" | "deposit" | "full" | "";
  estimated_total: number;
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

function mergeData(
  fetched: Partial<BookingData>,
  initial?: Partial<BookingData>
): BookingData {
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
  const [data, setData] = useState<BookingData>(() =>
    mergeData({}, initialData)
  );
  const [quote, setQuote] = useState<ReservationQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  useEffect(() => {
    if (!open) return;
    setData(mergeData({}, initialData || {}));
  }, [initialData, open]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!reservationId || !open) return;

      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const [reservationResponse, extrasResponse] = await Promise.all([
          fetch(`${apiUrl}/reservations/${reservationId}`),
          fetch(`${apiUrl}/reservations/${reservationId}/extras`),
        ]);

        const reservation = await reservationResponse.json();
        const extras: ReservationExtra[] = await extrasResponse.json();

        if (!ignore) {
          setData(mergeData({ ...reservation, extras }, initialData));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [reservationId, open, initialData]);

  const quoteInput = useMemo(
    () => ({
      plate_number: data.plate_number,
      start_date: data.start_date,
      start_time: data.start_time,
      end_date: data.end_date,
      end_time: data.end_time,
      extras: (data.extras || []).map((extra) => ({
        extra_id: extra.extra_id,
        qty: Number(extra.qty || 1),
      })),
    }),
    [
      data.plate_number,
      data.start_date,
      data.start_time,
      data.end_date,
      data.end_time,
      data.extras,
    ]
  );

  useEffect(() => {
    if (!open) return;

    const hasRequiredDetails =
      quoteInput.plate_number &&
      quoteInput.start_date &&
      quoteInput.start_time &&
      quoteInput.end_date &&
      quoteInput.end_time;

    if (!hasRequiredDetails) {
      setQuote(null);
      setQuoteError("Choose a vehicle and complete the trip details to calculate the price.");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setQuoteLoading(true);
        setQuoteError("");
        const nextQuote = await requestReservationQuote(
          quoteInput,
          controller.signal
        );
        setQuote(nextQuote);
      } catch (error) {
        if (controller.signal.aborted) return;
        setQuote(null);
        setQuoteError(
          error instanceof Error
            ? error.message
            : "Could not calculate the booking total."
        );
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, quoteInput]);

  useEffect(() => {
    if (!quote) return;

    setData((current) => {
      if (current.estimated_total === quote.total) return current;
      return { ...current, estimated_total: quote.total };
    });
  }, [quote]);

  const chosen = new Map(
    (data.extras || []).map((extra) => [extra.extra_id, extra])
  );

  function toggleExtra(extra: AvailableExtra) {
    const exists = chosen.has(extra.id);

    if (exists) {
      setData((current) => ({
        ...current,
        extras: current.extras.filter(
          (selected) => selected.extra_id !== extra.id
        ),
      }));
      return;
    }

    setData((current) => ({
      ...current,
      extras: [
        ...current.extras,
        {
          extra_id: extra.id,
          price_at_booking: extra.price,
          days: 1,
          qty: 1,
          charge_type: extra.charge_type === "once" ? "once" : "daily",
        },
      ],
    }));
  }

  function setQuantity(extra: AvailableExtra, quantity: number) {
    const safeQuantity = clampExtraQuantity(extra, quantity);

    setData((current) => ({
      ...current,
      extras: current.extras.map((selected) =>
        selected.extra_id === extra.id
          ? { ...selected, qty: safeQuantity }
          : selected
      ),
    }));
  }

  function confirmReservation() {
    if (!quote || quoteLoading || quoteError) return;

    const linesById = new Map(
      quote.extras.map((line) => [line.extra_id, line])
    );

    onConfirm({
      ...data,
      estimated_total: quote.total,
      extras: data.extras.map((extra) => {
        const line = linesById.get(extra.extra_id);
        return {
          ...extra,
          qty: line?.quantity || extra.qty || 1,
          days: line?.charged_days || 1,
          price_at_booking: line
            ? line.unit_price * line.quantity
            : extra.price_at_booking,
          charge_type: line?.charge_type || extra.charge_type,
        };
      }),
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {mode === "edit" ? "Edit Reservation" : "Review & Confirm"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section className="border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Vehicle</h4>
              {lockCar && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 rounded">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
            <label className="text-xs text-gray-500">Model</label>
            <input
              value={data.car_model || ""}
              onChange={(event) =>
                setData({ ...data, car_model: event.target.value })
              }
              readOnly={lockCar}
              className={`w-full ${
                lockCar ? "bg-gray-100" : "bg-gray-50"
              } rounded-lg py-2 px-3 outline-none`}
            />
          </section>

          <section className="border rounded-xl p-4">
            <h4 className="font-semibold mb-3">Trip details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledInput
                label="Start date"
                type="date"
                value={data.start_date}
                onChange={(value) => setData({ ...data, start_date: value })}
              />
              <LabeledInput
                label="Start time"
                type="time"
                value={data.start_time}
                onChange={(value) => setData({ ...data, start_time: value })}
              />
              <LabeledInput
                label="End date"
                type="date"
                value={data.end_date}
                onChange={(value) => setData({ ...data, end_date: value })}
              />
              <LabeledInput
                label="End time"
                type="time"
                value={data.end_time}
                onChange={(value) => setData({ ...data, end_time: value })}
              />
              <LabeledInput
                label="Pick-up location"
                value={data.pickup_location || ""}
                onChange={(value) =>
                  setData({ ...data, pickup_location: value })
                }
              />
              <LabeledInput
                label="Drop-off location"
                value={data.dropoff_location || ""}
                onChange={(value) =>
                  setData({ ...data, dropoff_location: value })
                }
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {quote ? `${quote.day_count} charged day(s)` : "Calculating charged days…"}
            </p>
          </section>

          <section className="border rounded-xl p-4">
            <h4 className="font-semibold mb-3">Customer</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabeledInput
                label="First name"
                value={data.firstName}
                onChange={(value) => setData({ ...data, firstName: value })}
              />
              <LabeledInput
                label="Last name"
                value={data.lastName}
                onChange={(value) => setData({ ...data, lastName: value })}
              />
              <LabeledInput
                label="E-mail"
                type="email"
                value={data.email}
                onChange={(value) => setData({ ...data, email: value })}
              />
              <LabeledInput
                label="Phone"
                value={data.phone}
                onChange={(value) => setData({ ...data, phone: value })}
              />
              <LabeledInput
                label="Flight number"
                value={data.flight_number || ""}
                onChange={(value) =>
                  setData({ ...data, flight_number: value })
                }
              />
              <div className="sm:col-span-2">
                <LabeledTextarea
                  label="Notes"
                  value={data.notes || ""}
                  onChange={(value) => setData({ ...data, notes: value })}
                />
              </div>
            </div>
          </section>

          <section className="border rounded-xl p-4">
            <h4 className="font-semibold mb-3">Extras</h4>
            {availableExtras.length === 0 ? (
              <p className="text-sm text-gray-500">No extras available.</p>
            ) : (
              <div className="space-y-2">
                {availableExtras.map((extra) => {
                  const selected = chosen.get(extra.id);
                  const maxQuantity = getExtraMaxQuantity(extra);

                  return (
                    <div
                      key={extra.id}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 border ${
                        selected
                          ? "bg-blue-50 border-blue-300"
                          : "bg-gray-50"
                      }`}
                    >
                      <label className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(selected)}
                          onChange={() => toggleExtra(extra)}
                        />
                        <span className="text-sm truncate">{extra.name}</span>
                      </label>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm">
                          €{extra.price.toFixed(2)}{" "}
                          {extra.charge_type === "once" ? "one-time" : "/day"}
                        </span>
                        {selected && maxQuantity > 1 && (
                          <input
                            type="number"
                            min={1}
                            max={maxQuantity}
                            className="w-16 bg-white border rounded px-2 py-1 text-sm"
                            value={selected.qty || 1}
                            onChange={(event) =>
                              setQuantity(extra, Number(event.target.value))
                            }
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="border rounded-xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="block text-sm text-gray-500">
                  Backend-calculated total
                </span>
                {quoteLoading && (
                  <span className="text-xs text-gray-500">Calculating…</span>
                )}
                {quoteError && (
                  <span className="block text-xs text-red-600 mt-1">
                    {quoteError}
                  </span>
                )}
              </div>
              <span className="text-xl font-extrabold">
                {quote ? `€${quote.total.toFixed(2)}` : "—"}
              </span>
            </div>

            {quote && (
              <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Vehicle</span>
                  <span>€{quote.vehicle.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extras</span>
                  <span>€{quote.extras_total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </section>

          {loading && (
            <div className="text-sm text-gray-500">Loading reservation…</div>
          )}
        </div>

        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-200"
          >
            Back
          </button>
          <button
            onClick={confirmReservation}
            disabled={!quote || quoteLoading || Boolean(quoteError)}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {quoteLoading
              ? "Calculating…"
              : mode === "edit"
                ? "Save Changes"
                : "Confirm Reservation"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-gray-100 rounded-lg py-2 px-3 outline-none"
      />
    </div>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-gray-100 rounded-lg py-2 px-3 outline-none min-h-[84px]"
      />
    </div>
  );
}
