"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reservationId = searchParams.get("id");
  const total = searchParams.get("total");

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
          {total && (
            <p>
              <strong>Total:</strong> €{Number(total).toFixed(2)}
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