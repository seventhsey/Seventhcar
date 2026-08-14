"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get("id");
  const totalParam = searchParams.get("total");
  const total = totalParam === null ? null : Number(totalParam);
  const hasValidTotal = total !== null && Number.isFinite(total) && total >= 0;
  const isUpdated = searchParams.get("mode") === "updated";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          {isUpdated ? "Reservation Updated" : "Reservation Request Received"}
        </h1>

        <p className="text-gray-700 mb-6">
          {isUpdated
            ? "Your reservation changes have been successfully submitted."
            : "Thank you. Your reservation request has been successfully submitted."}
        </p>

        <div className="bg-gray-100 rounded-xl p-5 mb-6 text-left space-y-2">
          <p>
            <strong>Reference number:</strong> #{reservationId || "-"}
          </p>
          <p>
            <strong>Payment:</strong> Pay on arrival
          </p>
          {hasValidTotal && total !== null && (
            <p>
              <strong>Total:</strong> €{total.toFixed(2)}
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
