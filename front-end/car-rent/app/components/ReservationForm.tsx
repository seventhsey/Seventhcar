/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import Image from "next/image"
import locationIcon from "@/public/Assets/ico_location.svg"
import calendarIcon1 from "@/public/Assets/ico_date1.svg"
import calendarIcon2 from "@/public/Assets/ico_date2.svg"
import ageDr from "@/public/Assets/age_driver.svg"
import editIcon from "@/public/Assets/ico_edit.svg"
import { useRouter } from "next/navigation"
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ReservationForm = () => {
  const [island, setIsland] = useState("")
  const [dropOff, setDropOff] = useState("")
  const [pickupDate, setPickupDate] = useState("")
  const [pickupTime, setPickupTime] = useState("")
  const [returnDate, setReturnDate] = useState("")
  const [returnTime, setReturnTime] = useState("")
  const [driverAge, setDriverAge] = useState("")
  const images = ["/Assets/Mo-vew.jpg", "/Assets/black-car.webp", "/Assets/lsland-vew.webp"]
  const [bgIndex, setBgIndex] = useState(0)
  const router = useRouter();
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);

  // Helper: for react-datepicker to string and back
  const parseDate = (val: string) => val ? new Date(val) : null;
  const formatDate = (date: Date | null) =>
    date ? date.toISOString().split("T")[0] : "";

  const handleBackgroundClick = () => {
    setBgIndex((prev) => (prev + 1) % images.length)
  }

  const handleFormClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }

  useEffect(() => {
    let newExtras: number[] = [...selectedExtras];
    // Remove IDs 9, 10, 11 if they exist
    newExtras = newExtras.filter(id => ![9, 10, 11].includes(id));
    const pickupOther = island === "Other +25 Euro";
    const dropoffOther = dropOff === "Other +25 Euro";
    if (pickupOther && dropoffOther) {
      newExtras.push(11);
    } else {
      if (pickupOther) newExtras.push(9);
      if (dropoffOther) newExtras.push(10);
    }
    setSelectedExtras(newExtras);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [island, dropOff]);

  const handleSubmit = () => {
    if (!island || !dropOff || !pickupDate || !pickupTime || !returnDate || !returnTime || !driverAge) {
      alert("Please fill in all fields.")
      return
    }
    // Validate date order
    const pickup = new Date(`${pickupDate}T${pickupTime}`)
    const dropoff = new Date(`${returnDate}T${returnTime}`)
    if (pickup >= dropoff) {
      alert("Return date/time must be after pickup date/time.")
      return
    }
    // Save reservation locally (for payment step later)
    const reservation = { island, dropOff, pickupDate, pickupTime, returnDate, returnTime, driverAge, extras: selectedExtras }
    localStorage.setItem("pendingReservation", JSON.stringify(reservation))
    router.push("/vehicles");
  }

  // 30-min step times as array
  const timeOptions = Array.from({ length: 48 }).map((_, i) => {
    const hour = String(Math.floor(i / 2)).padStart(2, '0');
    const min = i % 2 === 0 ? "00" : "30";
    return `${hour}:${min}`;
  });

  return (
    <div
      className="w-full max-w-full overflow-x-hidden bg-cover bg-center flex flex-col items-center justify-center transition-all duration-500 px-4 md:px-0 py-24 md:py-28"
      style={{ backgroundImage: `url(${images[bgIndex]})` }}
      onClick={handleBackgroundClick}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h3 className="text-[34px] leading-tight md:text-[50px] text-white font-bold md:mt-20 mb-24 md:mb-0 max-w-full break-words">
          Rent A Car in Seychelles
        </h3>
      </div>
      <div
        className="w-full max-w-[calc(100vw-2rem)] md:max-w-7xl mx-auto bg-white py-4 md:py-8 md:px-10 px-6 rounded-t-xl rounded-br-xl md:rounded-br-none backdrop-blur-md bg-opacity-90 flex flex-col"
        onClick={handleFormClick}
      >
        {/* Island Selection */}
        <div className="mb-6">
          <label className="block text-sm font-bold mb-1">Island</label>
          <div className="flex flex-col md:flex-row md:gap-4">
            {/* Pickup location */}
            <div className="relative w-full md:w-1/2">
              <select
                value={island}
                onChange={(e) => setIsland(e.target.value)}
                className="w-full h-[65px] p-3 px-6 border border-[#1c7fec] rounded-md focus:outline-none appearance-none bg-[#f8f8f8]"
              >
                <option value="" disabled>Select location...</option>
                <option value="Mahe Airport">Mahe Airport</option>
                <option value="Cat Coco's Jetty">Cat Coco's Jetty</option>
                <option value="Other +25 Euro">Other +25 Euro</option>
              </select>
              <div className="absolute inset-y-0 -left-4 flex items-center pointer-events-none">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                  <Image src={locationIcon} alt="location icon" />
                </div>
              </div>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-[#1c7fec]" />
              </div>
            </div>
            {/* Drop-off location */}
            <div className="relative w-full md:w-1/2 mt-4 md:mt-0">
              <select
                value={dropOff}
                onChange={(e) => setDropOff(e.target.value)}
                className="w-full h-[65px] p-3 px-6 border border-[#1c7fec] rounded-md focus:outline-none appearance-none bg-[#f8f8f8]"
              >
                <option value="" disabled>Select location...</option>
                <option value="Mahe Airport">Mahe Airport</option>
                <option value="Cat Coco's Jetty">Cat Coco's Jetty</option>
                <option value="Other +25 Euro">Other +25 Euro</option>
              </select>
              <div className="absolute inset-y-0 -left-4 flex items-center pointer-events-none">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                  <Image src={locationIcon} alt="location icon" />
                </div>
              </div>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-[#1c7fec]" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Row */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:mb-6">
          {/* Pickup Date/Time */}
          <div className="w-full">
            <label className="block text-sm font-bold mb-1">Pickup Date/Time</label>
            <div className="grid grid-cols-2 gap-1">
              <div className="relative">
                <DatePicker
                  selected={parseDate(pickupDate)}
                  onChange={date => setPickupDate(formatDate(date))}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select date"
                  className="w-full p-3 pl-6 h-[65px] rounded-md focus:outline-none bg-[#f8f8f8]"
                  calendarClassName="!z-50"
                  minDate={new Date()}
                  // Show icon
                  customInput={
                    <input
                      className="w-full p-3 pl-6 h-[65px] rounded-md focus:outline-none bg-[#f8f8f8]"
                      value={pickupDate}
                      onChange={() => { }}
                    />
                  }
                />
                <div className="absolute inset-y-0 -left-4 flex items-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                    <Image src={calendarIcon1} alt="calendar icon" />
                  </div>
                </div>
              </div>
              <div className="relative">
                <select
                  className="w-full p-3 h-[65px] rounded-md focus:outline-none bg-[#f8f8f8] appearance-none"
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                >
                  <option value="" disabled>Select time</option>
                  {timeOptions.map(timeStr =>
                    <option key={timeStr} value={timeStr}>{timeStr}</option>
                  )}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Return Date/Time */}
          <div className="w-full">
            <label className="block text-sm font-bold mb-1">Return Date/Time</label>
            <div className="grid grid-cols-2 gap-1">
              <div className="relative">
                <DatePicker
                  selected={parseDate(returnDate)}
                  onChange={date => setReturnDate(formatDate(date))}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select date"
                  className="w-full p-3 pl-10 h-[65px] rounded-md focus:outline-none bg-[#f8f8f8]"
                  calendarClassName="!z-50"
                  minDate={parseDate(pickupDate) || new Date()}
                  customInput={
                    <input
                      className="w-full p-3 pl-10 h-[65px] rounded-md focus:outline-none bg-[#f8f8f8]"
                      value={returnDate}
                      onChange={() => { }}
                    />
                  }
                />
                <div className="absolute inset-y-0 -left-4 flex items-center pointer-events-none">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                    <Image src={calendarIcon2} alt="calendar icon" />
                  </div>
                </div>
              </div>
              <div className="relative">
                <select
                  className="w-full p-3 h-[65px] rounded-md focus:outline-none bg-[#f8f8f8] appearance-none"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                >
                  <option value="" disabled>Select time</option>
                  {timeOptions.map(timeStr =>
                    <option key={timeStr} value={timeStr}>{timeStr}</option>
                  )}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Driver's Age */}
          <div className="w-full">
            <label className="block text-sm font-bold mb-1">Driver&apos;s Age</label>
            <div className="relative">
              <select
                value={driverAge}
                onChange={(e) => setDriverAge(e.target.value)}
                className="w-full appearance-none h-[65px] p-3 px-6 rounded-md focus:outline-none bg-[#f8f8f8]"
              >
                <option value="" disabled>Select driver&apos;s age</option>
                <option value="18-21">18-21</option>
                <option value="22-70">22-70</option>
                <option value="70 and Above">70+</option>
              </select>
              <div className="absolute inset-y-0 -left-4 flex items-center pointer-events-none">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                  <Image src={ageDr} alt="calendar icon" />
                </div>
              </div>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronDown className="h-4 w-4 text-[#1c7fec]" />
              </div>
            </div>
          </div>

          {/* START Button */}
          <div>
            <button
              onClick={handleSubmit}
              className="w-full px-16 h-[65px] bg-gradient-to-r hover:from-[#17a932] hover:to-[#1cea88] from-[#1cea88] to-[#17a932] text-white font-bold rounded-lg transition"
            >
              START
            </button>
          </div>
        </div>

        <div
          onClick={() => router.push("/manage-reservation")}
          className="bg-white rounded-b-2xl flex items-center gap-2 cursor-pointer md:hidden text-[13px]"
        >
          <Image src={editIcon} alt="edit icon" />
          <span>Edit reservation</span>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="w-full max-w-[calc(100vw-2rem)] md:max-w-7xl mx-auto text-[13px]">
        <div className="flex justify-between items-center w-full">
          <div
            onClick={() => router.push("/manage-reservation")}
            className="bg-white px-4 py-2 rounded-b-2xl md:flex items-center gap-2 cursor-pointer hidden"
          >
            <Image src={editIcon} alt="edit icon" />
            <span>Edit reservation</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReservationForm
