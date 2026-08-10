"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import fuelIcon from "@/public/Assets/ico_fuel.svg";
import doorIcon from "@/public/Assets/ico_doors.svg";
import bagIcon from "@/public/Assets/ico_bags.svg";

type Car = {
  model: string;
  category: string;
  image: string;
  fuel: string;
  doors: number | string;
  price_per_day_eur: number;
  plate_number: string;
};

type ApiCar = {
  car_name?: string;
  car_image_url?: string;
  fuel_type?: string;
  door_count?: number | string;
  price?: number | string;
  plate_number?: string;
};

type PendingReservation = {
  pickupDate?: string;
  returnDate?: string;
};

export default function Vehicles() {
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  function handleBookNow(car: Car) {
    const reservation = localStorage.getItem("pendingReservation");
    if (!reservation) {
      router.push("/");
      return;
    }

    localStorage.setItem(
      "selectedCar",
      JSON.stringify({
        plate_number: car.plate_number,
        price_per_day_eur: car.price_per_day_eur,
        model: car.model,
      })
    );

    router.push("/insurance");
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadCars() {
      setLoading(true);
      setError("");

      const apiUrl = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
      if (!apiUrl) {
        setCars([]);
        setError(
          "The frontend API URL is not configured. Set NEXT_PUBLIC_API_URL and restart the frontend."
        );
        setLoading(false);
        return;
      }

      let fetchUrl = `${apiUrl}/cars`;

      const storedReservation = localStorage.getItem("pendingReservation");
      if (storedReservation) {
        try {
          const reservation = JSON.parse(storedReservation) as PendingReservation;
          if (reservation.pickupDate && reservation.returnDate) {
            const params = new URLSearchParams({
              startDate: reservation.pickupDate,
              endDate: reservation.returnDate,
            });
            fetchUrl = `${apiUrl}/cars/available?${params.toString()}`;
          }
        } catch {
          // Invalid stale localStorage should not prevent showing the fleet.
        }
      }

      console.log("Fetching vehicles from:", fetchUrl);

      try {
        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          cache: "no-store",
        });

        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }

        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          throw new Error("The vehicle API returned invalid JSON.");
        }

        if (!Array.isArray(raw)) {
          throw new Error("The vehicle API returned an unexpected response.");
        }

        const apiBaseUrl = apiUrl.replace(/\/api\/?$/, "");
        const mappedCars: Car[] = raw.map((item) => {
          const car = item as ApiCar;
          return {
            model: String(car.car_name || "Vehicle"),
            category: "",
            image: car.car_image_url
              ? `${apiBaseUrl}/uploads/${car.car_image_url}`
              : "/no-image.png",
            fuel: String(car.fuel_type || "—"),
            doors: car.door_count ?? "—",
            price_per_day_eur: Number(car.price || 0),
            plate_number: String(car.plate_number || ""),
          };
        });

        setCars(mappedCars);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }

        console.error("Failed to fetch cars:", requestError);
        setCars([]);
        setError(
          requestError instanceof TypeError
            ? `Could not connect to the backend at ${apiUrl}. Make sure the backend is running and CORS allows this frontend address.`
            : requestError instanceof Error
              ? requestError.message
              : "Could not load available vehicles."
        );
      } finally {
        setLoading(false);
      }
    }

    loadCars();
    return () => controller.abort();
  }, [reloadKey]);

  return (
    <div className="max-w-7xl mx-auto py-10 mt-14 min-h-[420px]">
      <h2 className="text-[30px] md:text-[36px] font-bold text-center mb-5">
        Our Vehicles
      </h2>

      {loading && (
        <div className="flex justify-center items-center py-20 text-gray-500">
          <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
          Checking vehicle availability…
        </div>
      )}

      {!loading && error && (
        <div className="max-w-2xl mx-auto mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h3 className="font-bold text-red-700 text-lg mb-2">Could not load vehicles</h3>
          <p className="text-sm text-red-700 break-words">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-5 py-2.5 font-semibold hover:bg-blue-700"
          >
            <RefreshCw size={17} /> Retry
          </button>
        </div>
      )}

      {!loading && !error && cars.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          No vehicles are available for the selected dates.
        </div>
      )}

      {!loading && !error && cars.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {cars.map((car) => (
            <div
              key={car.plate_number}
              className="relative group overflow-hidden rounded-3xl bg-white transition h-[430px] flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-[260px] z-0 rounded-3xl bg-gradient-to-br from-[#f8f8f8] to-[#f8f8f8] group-hover:from-[#59ace3] group-hover:to-[#0066ff] transition-all duration-300 ease-in-out" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="px-6 py-4 rounded-t-3xl transition-colors duration-300">
                  {car.category && (
                    <p className="font-bold text-xs md:text-[13px] text-[#1c7fec] group-hover:text-black">
                      {car.category}
                    </p>
                  )}
                  <h2 className="text-[18px] md:text-[22px] font-bold text-black group-hover:text-white">
                    {car.model}
                  </h2>
                  <p className="text-xs md:text-[13px] group-hover:text-white mt-1">
                    or similar...
                  </p>
                </div>

                <div className="relative h-[190px] w-full px-6">
                  <Image
                    fill
                    src={car.image}
                    alt={car.model}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-contain p-3"
                  />
                </div>

                <div className="flex justify-around text-sm text-black py-2 z-10 relative mt-auto">
                  <div className="flex flex-col items-center">
                    <Image src={fuelIcon} alt="fuel icon" />
                    <span>{car.fuel}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Image src={doorIcon} alt="car door icon" />
                    <span>{car.doors} Doors</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Image src={bagIcon} alt="bag icon" />
                    <span>-</span>
                  </div>
                </div>

                <div className="flex justify-between items-center px-6 py-4 bg-white min-h-[78px]">
                  <p className="text-[17px] font-bold">
                    {car.price_per_day_eur.toFixed(2)}{" "}
                    <span className="text-xs">EUR / day</span>
                  </p>

                  <button
                    type="button"
                    className="bg-gradient-to-br from-[#f8f8f8] to-[#f8f8f8] group-hover:from-[#59ace3] group-hover:to-[#0066ff] px-4 py-2 text-sm rounded transition-all duration-300 flex items-center gap-2 font-semibold cursor-pointer"
                    onClick={() => handleBookNow(car)}
                  >
                    <div className="bg-white w-7 h-7 flex items-center justify-center rounded-full text-[#1c7fec] relative right-7">
                      <ChevronRight size={14} />
                    </div>
                    <span className="group-hover:text-white">Book now</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
