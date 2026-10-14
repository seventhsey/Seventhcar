"use client";
import AboutAndCom from "./components/AboutAndCom";
import ContactUs from "./components/ContactUs";
import Exta from "./components/Exta";
import LocationMap from "./components/LocationMap";
import ReservationForm from "./components/ReservationForm";
import { SupportCenter } from "./components/Suppot";

export default function Home() {

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
