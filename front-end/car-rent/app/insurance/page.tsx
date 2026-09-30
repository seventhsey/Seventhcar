"use client";

import React, { useEffect, useState } from "react";
import { Check, Info, X } from "lucide-react";
import Image from "next/image";
import infoIcon from "@/public/Assets/ico_tooltip.svg";
import { useRouter } from "next/navigation";





// Define the structure for insurance plan details
interface InsurancePlanDetails {
  title?: string;
  price?: string;
  unit?: string;
  daily_price?: string;
  tag?: string;
}

// Define the interface for insurance items
interface IInsuranceItem {
  title?: string;
  basic?: InsurancePlanDetails | boolean;
  medium?: InsurancePlanDetails | boolean;
  full?: InsurancePlanDetails | boolean;
}

// Define valid plan keys
type PlanKey = "basic" | "medium" | "full";

type ExtraRecord = {
  id: number;
  price: number | string;
};

type StoredExtra = number | { id?: number };

type PendingReservation = {
  pickupDate?: string;
  pickupTime?: string;
  returnDate?: string;
  returnTime?: string;
  extras?: StoredExtra[];
};

const insuranceData: IInsuranceItem[] = [
  {
    title: "Step 2. - Choosing insurance",
    basic: { title: "Basic Protect" },
    medium: { title: "Medium Protect", tag: "Most popular option" },
    full: { title: "Full Protect" },
  },
  {
    title: "Responsibility (Excess)",
    basic: { price: "950,00", unit: "EUR", daily_price: "0,00" },
    medium: { price: "475,00", unit: "EUR", daily_price: "20,00" },
    full: { price: "0,00", unit: "EUR", daily_price: "30,00" },
  },
  { title: "TPL", basic: true, medium: true, full: true },
  { title: "Additional", basic: true, medium: true, full: true },
  { title: "Unlimited Mileage", basic: true, medium: true, full: true },
  { title: "CDW", basic: true, medium: true, full: true },
  { title: "TP", basic: false, medium: true, full: true },
  { title: "Road Assistance 24/7", basic: false, medium: false, full: true },
  { title: "WUG", basic: false, medium: false, full: true },
  { title: "PAI", basic: false, medium: false, full: true },
];

// === Dynamic Pricing Logic ===

// Plan key to extra ID mapping (from your IDs above)
const protectionExtraIds = { basic: 1, medium: 2, full: 3 };

function getPendingReservation(): PendingReservation | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("pendingReservation") || "{}");
  } catch {
    return null;
  }
}

// Get extra price by ID
function getExtraPrice(id: number, allExtras: ExtraRecord[]) {
  const found = allExtras.find((extra) => Number(extra.id) === id);
  return found ? Number(found.price) : 0;
}

// Keep this aligned with the authoritative backend pricing calculation.
function getBookingDays(reservation: PendingReservation | null) {
  if (
    !reservation?.pickupDate ||
    !reservation?.returnDate ||
    !reservation?.pickupTime ||
    !reservation?.returnTime
  ) return 1;

  const start = new Date(`${reservation.pickupDate}T00:00:00`);
  const end = new Date(`${reservation.returnDate}T00:00:00`);
  let days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

  if (reservation.returnTime > reservation.pickupTime) days += 1;
  return Math.max(1, days);
}

const Insurance = () => {
  const [hoveredCol, setHoveredCol] = useState<PlanKey | null>(null);
  const [activeTab, setActiveTab] = useState<PlanKey>("basic");
  
  const getHoverClass = (col: PlanKey): string =>
    hoveredCol === col ? "bg-white cursor-pointer" : "";

  const plans: PlanKey[] = ["basic", "medium", "full"];
  const router = useRouter();

  const handleSelectProtection = (protectionId: number) => {
    const reservation = JSON.parse(localStorage.getItem("pendingReservation") || "{}");
    const currentExtras: StoredExtra[] = Array.isArray(reservation.extras) ? reservation.extras : [];

// remove only old insurance IDs: 1, 2, 3
const withoutOldInsurance = currentExtras.filter((ex) => {
  const id = typeof ex === "number" ? ex : Number(ex?.id);
  return ![1, 2, 3].includes(id);
});

reservation.extras = [...withoutOldInsurance, protectionId];
    localStorage.setItem("pendingReservation", JSON.stringify(reservation));
    router.push("/extras");
  };
  // -- Calculate dynamic prices --
  const [allExtras, setAllExtras] = useState<ExtraRecord[]>([]);
  const reservation = getPendingReservation();
  const bookingDays = getBookingDays(reservation);

  useEffect(() => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/extras`)
    .then((res) => res.json())
    .then((data: unknown) => setAllExtras(Array.isArray(data) ? data as ExtraRecord[] : []))
    .catch(() => {
      setAllExtras([]); // fallback to empty array if error
    });
}, []);

  const protectionPrices = {
    basic: getExtraPrice(protectionExtraIds.basic, allExtras),
    medium: getExtraPrice(protectionExtraIds.medium, allExtras),
    full: getExtraPrice(protectionExtraIds.full, allExtras),
  }; 

  return (
    <div className="max-w-5xl mx-auto py-10 mt-12">
      <h3 className="text-[30px] md:text-[36px] font-bold text-center">
        Insurance
      </h3>
      <div className="p-6 bg-white text-black font-montserrat">
        {/* Top Title */}
        <h2 className="block md:hidden text-center text-2xl font-bold mb-6">
          {insuranceData[0].title}
        </h2>

        {/* Desktop Table */}
        <div className="overflow-x-auto">
          {/* Mobile Tabs */}
          <div className="flex md:hidden px-2 justify-around mb-0">
            {plans.map((plan) => (
              <button
                key={plan}
                onClick={() => setActiveTab(plan)}
                className={`w-56 px-4 py-2 font-extrabold border-t-2 border-l-2 border-r-2 border-b-0 border-blue-400 rounded-t-lg transition flex items-center justify-center gap-2 ${
                  activeTab === plan
                    ? "bg-white text-blue-500"
                    : "bg-gradient-to-br from-[#59ace3] to-[#0066ff] text-white"
                }`}
              >
                {activeTab === plan && (
                  <Check className="w-5 h-5 bg-gradient-to-br from-[#59ace3] to-[#0066ff] text-white rounded-full p-1" />
                )}
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </button>
            ))}
          </div>

          {/* Mobile Table */}
          <div className="block md:hidden">
            <div className="border-b-2 border-l-2 border-r-2 border-t-0 border-blue-400 rounded-b-lg hover:bg-blue-50 transition p-4 mx-2">
              {insuranceData.slice(1).map((item) => {
                const currentData = item[activeTab];

                return (
                  <div
                    className="flex w-full justify-between items-center mb-4"
                    key={item.title}
                  >
                    <h3 className="w-1/2 flex gap-2">
                      <Info className="bg-black opacity-20 text-white rounded-full" />
                      {item.title}
                    </h3>
                    <div className="w-1/2 flex justify-end">
                      {typeof currentData === "object" &&
                      "price" in currentData ? (
                        <span className="font-semibold">
                          {(currentData as InsurancePlanDetails).price}{" "}
                          {(currentData as InsurancePlanDetails).unit}
                        </span>
                      ) : currentData === true ? (
                        <Check className="bg-blue-600 p-1 text-white rounded-full" />
                      ) : (
                        <X className="bg-gray-50 text-gray-500 p-1 rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Mobile protection price (Bottom) */}
              <div className="flex justify-end items-end mt-10 gap-1 leading-none">
                <span className="text-4xl font-bold">
                  {protectionPrices[activeTab] * bookingDays}
                </span>
                <span className="text-sm pb-[2px]">EUR protection total</span>
              </div>
              <div className="flex justify-end mt-4">
  <button
    className="px-6 py-3 bg-gradient-to-br from-[#f8f8f8] to-[#f8f8f8] hover:from-[#59ace3] hover:to-[#0066ff] hover:text-white rounded-lg hover:brightness-110 font-bold"
    onClick={() => handleSelectProtection(protectionExtraIds[activeTab])}
  >
    Select
  </button>
</div>
            </div>
          </div>

          {/* Desktop Table */}
          <table className="w-full text-center border-collapse hidden md:table">
            <thead>
              <tr>
                <th className="p-3">{insuranceData[0].title}</th>
                {plans.map((planKey) => (
                  <th
                    key={planKey}
                    className={`p-3 cursor-pointer transition duration-200 w-60 ${getHoverClass(
                      planKey
                    )}`}
                    onMouseEnter={() => setHoveredCol(planKey)}
                    onMouseLeave={() => setHoveredCol(null)}
                  >
                    {(insuranceData[0][planKey] as InsurancePlanDetails)?.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {insuranceData.slice(1).map((item, index) => {
                const rowClass = index % 2 === 0 ? "bg-gray-100" : "";

                return (
                  <tr key={index} className={rowClass}>
                    <td className="p-3 flex items-center gap-3">
                      <Image src={infoIcon} alt="info icon" />
                      {item.title}
                    </td>
                    {plans.map((planKey) => {
                      return (
                        <td
                          key={planKey}
                          className={`p-3 transition duration-200 text-lg font-bold ${getHoverClass(
                            planKey
                          )}`}
                          onMouseEnter={() => setHoveredCol(planKey)}
                          onMouseLeave={() => setHoveredCol(null)}
                        >
                          {typeof item[planKey] === "object" &&
                          "price" in item[planKey] ? (
                            <>
                              {(item[planKey] as InsurancePlanDetails).price}{" "}
                              {(item[planKey] as InsurancePlanDetails).unit}
                            </>
                          ) : item[planKey] === true ? (
                            <div className="flex justify-center">
                              <Check className="bg-gradient-to-br from-[#59ace3] to-[#0066ff] p-1 rounded-full text-white" />
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <X className="bg-gray-50 text-gray-500 rounded-full p-1" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Protection price for the selected rental length */}
              <tr>
                <td className="p-3 font-bold">Protection total ({bookingDays} day(s))</td>
                {plans.map((planKey) => (
                  <td key={planKey} className="font-bold text-2xl">
                    {protectionPrices[planKey] * bookingDays} EUR
                  </td>
                ))}
              </tr>

              {/* Select button row */}
              <tr>
  <td></td>
  {plans.map((planKey) => (
    <td
      key={planKey}
      className={`p-3 transition duration-200 ${getHoverClass(planKey)}`}
      onMouseEnter={() => setHoveredCol(planKey)}
      onMouseLeave={() => setHoveredCol(null)}
    >
      <button
        className="px-4 py-2 bg-gradient-to-br from-[#f8f8f8] to-[#f8f8f8] hover:from-[#59ace3] hover:to-[#0066ff] hover:text-white rounded-lg hover:brightness-110 w-full"
        onClick={() => handleSelectProtection(protectionExtraIds[planKey])}
      >
        Select
      </button>
    </td>
  ))}
</tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Insurance;
