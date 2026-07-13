"use client";

import React, { useEffect, useState } from "react";
import { ChevronRight, Minus, Plus } from "lucide-react";

const ignoreIds = [1, 2, 3, 9, 10, 11];

const Extras = () => {
  const [extras, setExtras] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});

  // Fetch all extras except the ignored IDs
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/extras`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((extra: any) => !ignoreIds.includes(Number(extra.id)));
        setExtras(filtered);

        // Initialize quantities for all extras as 0
        const initialQuantities: { [key: number]: number } = {};
        filtered.forEach((extra: any) => {
          initialQuantities[extra.id] = 0;
        });
        setQuantities(initialQuantities);
      });
  }, []);

  // Handle plus/minus
  const handleQuantityChange = (id: number, delta: number) => {
    setQuantities((prev) => {
      const newVal = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: newVal };
    });
  };

  // When user presses "Select", update reservation and go to /contact
  const handleSelect = () => {
    // Load reservation from localStorage
    const reservation = JSON.parse(localStorage.getItem("pendingReservation") || "{}");
    // Get previous extras array (already has protection from insurance)
    let prevExtras: any[] = Array.isArray(reservation.extras) ? reservation.extras : [];

    // Remove any previously selected extra IDs that are in the displayed extras
    prevExtras = prevExtras.filter((item: any) => {
  const existingId = typeof item === "number" ? item : Number(item?.id);
  return !extras.some((e) => Number(e.id) === existingId);
});

    // Add the newly selected extras (with quantity > 0)
    Object.entries(quantities).forEach(([idStr, qty]) => {
      const id = Number(idStr);
      if (qty > 0) {
        // You can store as { id, qty } or just ID if you don't need quantity later
        prevExtras.push({ id, qty });
      }
    });

    reservation.extras = prevExtras;
    localStorage.setItem("pendingReservation", JSON.stringify(reservation));
    window.location.href = "/contact"; // Navigate to client info page
  };

  return (
    <div className="max-w-7xl mx-auto py-10">
      <h3 className="text-[30px] md:text-[36px] font-bold text-center mb-2 mt-14">
        Extras
      </h3>
      <div className="px-3 md:px-10 py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {extras.map((extra) => (
          <div key={extra.id} className="max-w-sm py-10 px-6 rounded-2xl bg-gray-100 shadow-md relative">
            {/* Optional: icon or image could go here */}
            <p className="text-xs font-bold text-[#1c7fec] mb-1">
              {extra.short_desc || ""}
            </p>
            <h2 className="md:text-lg text-base font-bold mb-2">{extra.name}</h2>
            <p className="text-xs mb-4 leading-relaxed">
              {extra.description || ""}
            </p>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">
                {extra.price}{" "}
<span className="text-sm font-normal">
  EUR {extra.charge_type === "once" ? "one-time" : "/ day"}
</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-lg font-bold px-2"
                  onClick={() => handleQuantityChange(extra.id, -1)}
                  type="button"
                >
                  <Minus />
                </button>
                <span className="font-semibold">{quantities[extra.id] || 0}</span>
                <button
                  className="text-lg font-bold px-2"
                  onClick={() => handleQuantityChange(extra.id, 1)}
                  type="button"
                >
                  <Plus />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Single select button at the end */}
      <div className="flex justify-end mt-8">
        <button
          className="px-6 py-3 bg-gradient-to-br from-[#f8f8f8] to-[#f8f8f8] hover:from-[#1cb4ec] hover:to-[#1c78ec] hover:text-white cursor-pointer text-sm font-extrabold rounded-lg group flex items-center gap-1"
          onClick={handleSelect}
        >
          <ChevronRight className="w-4 h-4 text-[#1c7fec] group-hover:text-white" />
          Select
        </button>
      </div>
    </div>
  );
};

export default Extras;
