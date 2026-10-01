'use client'
import { Mail, PhoneCall, Home, Clock } from "lucide-react";

export default function ContactUs() {
  return (
    <section id="contact" className="w-full bg-white py-12 md:py-24 scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 md:px-0">
        <h2 className="text-start md:text-center text-[30px] md:text-4xl font-bold text-gray-800 mb-[50px] pl-6 md:pl-0">
          Contact us
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6 pl-6 md:pl-8">
          {/* Headquarters */}
          <div className="flex flex-col items-start">
            <div className="flex items-center mb-2 gap-4">
              <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] rounded-full p-2 flex items-center justify-center">
                <Home className="text-white h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Headquarters</h3>
            </div>
            <div className="px-5">
              <div className="relative w-full h-[100px] md:h-[150px]">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 h-full bg-blue-500 -translate-x-1/2"></div>
                <div className="ml-9 pt-2 text-[13px]">
                  <p className="text-gray-700 mb-1">Head Office</p>
                  <p className="text-gray-700 mb-1">
                    Unique building, 1st floor, Providence, 
                  </p>
                  <p className="text-gray-700">
                    Mahe, Victoria, Seychelles
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Email contacts */}
          <div className="flex flex-col items-start">
            <div className="flex items-center mb-2 gap-4">
              <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] rounded-full p-2 flex items-center justify-center">
                <Mail className="text-white h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Email contacts</h3>
            </div>
            <div className="px-5">
              <div className="relative w-full h-[100px] md:h-[150px]">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 h-full bg-blue-500 -translate-x-1/2"></div>
                <div className="ml-9 pt-2 text-[13px]">
                  <p className="text-gray-700 mb-1">
                    Info & Reservations{" "}
                    <a
                      href="mailto:seventhseychelles@gmail.com"
                      className="text-blue-500"
                    >
                      seventhseychelles@gmail.com
                    </a>
                  </p>
                  <p className="text-gray-700">
                    Support Center{" "}
                    <a
                      href="mailto:seventhseychelles@gmail.com"
                      className="text-blue-500"
                    >
                      seventhseychelles@gmail.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Phone contacts */}
          <div className="flex flex-col items-start">
            <div className="flex items-center mb-2 gap-4">
              <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] rounded-full p-2 flex items-center justify-center">
                <PhoneCall className="text-white h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Phone contacts</h3>
            </div>
            <div className="px-5">
              <div className="relative w-full h-[100px] md:h-[150px]">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 h-full bg-blue-500 -translate-x-1/2"></div>
                <div className="ml-9 pt-2 text-[13px]">
                  <p className="text-gray-700">
                    Info & Reservations{" "}
                  </p>
                  <p className="mb-1">
                    <a className="text-blue-500" href="tel:+2482502815">+248 2502815</a>
                  </p>
                  <p className="text-gray-700">
                    Support Center{" "}
                    <a className="text-blue-500" href="tel:+2482502815">+248 2502815</a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Working hours */}
          <div className="flex flex-col items-start">
            <div className="flex items-center mb-2 gap-4">
              <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] rounded-full p-2 flex items-center justify-center">
                <Clock className="text-white h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Working hours</h3>
            </div>
            <div className="px-5">
              <div className="relative w-full h-[100px] md:h-[150px]">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 h-full bg-[#1c7fec] -translate-x-1/2"></div>
                <div className="ml-9 pt-2 text-[13px]">
                  <p className="text-gray-700 mb-1">
                    Working hours <span className="text-[#1c7fec]">24 / 7</span>
                  </p>
                  <p className="text-gray-700">Season <span className="text-[#1c7fec]">All year</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
