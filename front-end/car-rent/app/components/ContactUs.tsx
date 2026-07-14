'use client'
import { Mail, PhoneCall, Home, Clock, Check } from "lucide-react";
import { useState } from "react";

export default function ContactUs() {
  const [isChecked, setIsChecked] = useState(false)

  return (
    <div className="w-full bg-white pt-12 md:pt-32 -mb-8">
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
                    Po Box 5044, Providence
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
                  <p className="text-blue-500 mb-1">+248 2502815</p>
                  <p className="text-gray-700">
                    Support Center{" "}
                    <span className="text-blue-500">+248 2502815</span>
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

        {/* Newsletter subscription */}
        <div className="bg-white shadow-[0_0_25px_5px_rgba(0,0,0,0.05)] z-40 relative py-8 md:py-10 px-8 md:px-16 rounded-2xl">
          <h3 className="text-[24px] font-bold text-gray-800 mb-6 md:mb-10">
            Subscribe to our newsletter
          </h3>

          <div className="flex flex-col md:flex-row gap-6 md:gap-4">
            <input
              type="email"
              className="flex-1 border border-gray-300 rounded-md p-3 focus:outline-none focus:border-[#1c7fec]"
            />
            <button className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] text-white px-6 py-3 md:py-2 rounded-md hover:to-[#1cea88] hover:from-[#17a932] transition-colors font-bold cursor-pointer">
              Unsubscribe
            </button>
          </div>

          <div className="mt-4 md:mt-8 md:mb-6 flex items-start gap-4">
            <div
              className={`flex-shrink-0 w-6 h-6 rounded cursor-pointer flex items-center justify-center ${
                isChecked
                  ? "bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec]"
                  : "bg-gray-200 border border-gray-300"
              }`}
              onClick={() => setIsChecked(!isChecked)}
            >
              {isChecked && <Check className="h-4 w-4 text-white" />}
            </div>
            <p className="text-xs">
              We need your consent to be able to use your personal information
              which we obtained when subscribing to the newsletter, read the
              full
              <a href="#" className="text-[#1c7fec] ml-1">
                privacy policy
              </a>{" "}
              for more information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
