"use client"
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import fuelIcon from "@/public/Assets/ico_fuel.svg";
import doorIcon from "@/public/Assets/ico_doors.svg";
import bagIcon from "@/public/Assets/ico_bags.svg";
import { useRouter } from "next/navigation";

const Vehicles = () => {
  const [cars, setCars] = useState([]);
    const router = useRouter();

      const handleBookNow = (car) => {
    const reservation = localStorage.getItem("pendingReservation");
    if (!reservation) {
      // No reservation, redirect to home
      router.push("/");
      return;
    }
    // Save selected car details (plate number, price) for insurance step
    localStorage.setItem("selectedCar", JSON.stringify({
      plate_number: car.plate_number,
      price_per_day_eur: car.price_per_day_eur,
      model: car.model, // (optional)
    }));
    router.push("/insurance");
  };
  useEffect(() => {
  let fetchUrl = `${process.env.NEXT_PUBLIC_API_URL}/cars`;

  // Check for reservation info in localStorage
  const resStr = localStorage.getItem("pendingReservation");
  if (resStr) {
    try {
      const reservation = JSON.parse(resStr);
      if (reservation.pickupDate && reservation.returnDate) {
        fetchUrl = `${process.env.NEXT_PUBLIC_API_URL}/cars/available?startDate=${reservation.pickupDate}&endDate=${reservation.returnDate}`;
      }
    } catch (e) {
      // fallback to all cars
    }
  }

  console.log("Fetching from:", fetchUrl);

  fetch(fetchUrl)
  .then(async (res) => {
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Response was not valid JSON: ${text}`);
    }
  })
  .then((data) => {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, "");

  const mappedCars = data.map((car: any) => ({
    model: car.car_name,
    category: "",
    image: car.car_image_url
      ? `${apiBaseUrl}/uploads/${car.car_image_url}`
      : "/no-image.png",
    fuel: car.fuel_type,
    doors: car.door_count,
    price_per_day_eur: car.price,
    plate_number: car.plate_number,
  }));

  setCars(mappedCars);
}).then((data) => {
    const mappedCars = data.map((car: any) => ({
      model: car.car_name,
      category: "",
      image: car.car_image_url
        ? `http://localhost:3001/uploads/${car.car_image_url}`
        : "/no-image.png",
      fuel: car.fuel_type,
      doors: car.door_count,
      price_per_day_eur: car.price,
      plate_number: car.plate_number,
    }));
    setCars(mappedCars);
  })
  .catch((err) => {
    console.error("Failed to fetch cars:", err);
  });
    

}, []);


  return (
    <div className="max-w-7xl mx-auto py-10 mt-14">
      <h2 className="text-[30px] md:text-[36px] font-bold text-center mb-5">
        Our Vehicles
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {cars.map((car, index) => (
          <div
            key={index}
            className="relative group overflow-hidden rounded-3xl bg-white transition"
          >
            {/* Hover background layer using Tailwind */}
            <div className="absolute top-0 left-0 w-full h-[230px] z-0 rounded-3xl bg-gradient-to-br from-[#f8f8f8] to-[#f8f8f8] group-hover:from-[#59ace3] group-hover:to-[#0066ff] transition-all duration-400 ease-in-out"></div>
            
            {/* Card content */}
            <div className="relative z-10 flex flex-col h-full">
              <div className="px-6 py-4 rounded-t-3xl transition-colors duration-300">
                <p className="font-bold text-xs md:text-[13px] text-[#1c7fec] group-hover:text-black">
                  {car.category}
                </p>
                <h2 className="text-[18px] md:text-[22px] font-bold text-black group-hover:text-white">
                  {car.model}
                </h2>
                <p className="text-xs md:text-[13px] group-hover:text-white mt-1">
                  or similar...
                </p>
              </div>

              {/* Car image */}
              <div className="flex justify-center">
                <Image
                  width={300}
                  height={200}
                  src={car.image}
                  alt={car.model}
                  className="object-contain relative top-6"
                />
              </div>

              {/* Features */}
              <div className="flex justify-around text-sm text-black py-2 z-10 relative">
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

              {/* Footer */}
              <div className="flex justify-between items-center px-6 py-4 bg-white">
                <div>
                  <p className="text-[17px] font-bold">
                    {Number(car.price_per_day_eur) === 0
                      ? "0.00"
                      : Number(car.price_per_day_eur).toFixed(2)}{" "}
                    <span className="text-xs">EUR / day</span>
                  </p>
                  {car.total && (
                    <p className="text-xs font-bold">
                      Total: {car.total} <span>EUR / day</span>
                    </p>
                  )}
                </div>

                <button
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
    </div>
  );
};

export default Vehicles;
