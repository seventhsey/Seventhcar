"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get("id");

  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reservationId) {
      setLoading(false);
      setError("Reservation reference is missing.");
      return;
    }

    const controller = new AbortController();

    async function loadReservation() {
      try {
        setLoading(true);
        setError("");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await fetch(
          `${apiUrl}/reservations/${encodeURIComponent(reservationId)}`,
          { signal: controller.signal }
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.error || "Could not load the saved reservation.");
        }

        setTotal(Number(result.total_price || 0));
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load the saved reservation."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadReservation();
    return () => controller.abort();
  }, [reservationId]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          Reservation Confirmed
        </h1>

        <p className="text-gray-700 mb-6">
          Thank you. Your reservation has been successfully submitted.
        </p>

        <div className="bg-gray-100 rounded-xl p-5 mb-6 text-left space-y-2">
          <p>
            <strong>Reference number:</strong> #{reservationId || "-"}
          </p>
          <p>
            <strong>Payment:</strong> Pay on arrival
          </p>
          {loading ? (
            <p className="text-gray-500">Loading final total…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <p>
              <strong>Total:</strong> €{Number(total || 0).toFixed(2)}
            </p>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-6">
          We will contact you shortly to confirm the booking details.
        </p>

        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmationContent />
    </Suspense>
  );
}
