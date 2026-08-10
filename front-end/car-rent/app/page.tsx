"use client";
import { useEffect } from "react";
import Image from "next/image";
import AboutAndCom from "./components/AboutAndCom";
import ContactUs from "./components/ContactUs";
import Exta from "./components/Exta";
import LocationMap from "./components/LocationMap";
import ReservationForm from "./components/ReservationForm";
import { SupportCenter } from "./components/Suppot";
import carImg from "@/public/Assets/hero-cars.png";

export default function Home() {
  useEffect(() => {
    localStorage.removeItem("pendingReservation");
    localStorage.removeItem("selectedCar");
  }, []);

  return (
    <div className="overflow-x-hidden">
      <ReservationForm />
      <Image
        src={carImg}
        alt="cars image"
        className="mx-auto -mt-32 hidden md:block"
      />
      <Exta />
      <AboutAndCom />
      <SupportCenter />
      <LocationMap />
      <ContactUs />
    </div>
  );
}
