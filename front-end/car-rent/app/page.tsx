"use client";
import { useEffect } from "react";
import AboutAndCom from "./components/AboutAndCom";
import ContactUs from "./components/ContactUs";
import Exta from "./components/Exta";
import LocationMap from "./components/LocationMap";
import ReservationForm from "./components/ReservationForm";
import { SupportCenter } from "./components/Suppot";

export default function Home() {
  useEffect(() => {
    localStorage.removeItem("pendingReservation");
    localStorage.removeItem("selectedCar");
  }, []);

  return (
    <div className="overflow-x-hidden">
      <ReservationForm />
      <Exta />
      <AboutAndCom />
      <SupportCenter />
      <LocationMap />
      <ContactUs />
    </div>
  );
}
