import { Suspense } from "react";
import ConfirmationContent from "./ConfirmationContent";

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center px-4 py-20">
          <p className="text-gray-500">Loading reservation details…</p>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
