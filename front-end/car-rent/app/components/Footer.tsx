import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import Image from "next/image";
import React from "react";
import trustLogo from "@/public/Assets/trustpilot-1.svg";
import tripaLogo from "@/public/Assets/tripadvisor.svg";
import googleLogo from "@/public/Assets/google.png";
import elatusLogo from "@/public/Assets/elatus_logo.svg";
import renteonLogo from "@/public/Assets/renteon_logo.svg";

const Footer: React.FC = () => {
  return (
    <div className="bg-[#17191c] text-white pt-12 pb-6">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Links */}
        <div className="flex flex-wrap justify-center gap-x-4 md:gap-16 text-sm">
          <a href="#cookies" className="hover:text-[#1c7fec]">
            Cookies
          </a>
          <a href="#privacy-policy" className="hover:text-[#1c7fec]">
            Privacy policy
          </a>
          <a href="#payment-methods" className="hover:text-[#1c7fec]">
            Payment methods
          </a>
          <a href="#terms-conditions" className="hover:text-[#1c7fec]">
            Terms and conditions
          </a>
          <a href="#offices" className="hover:text-[#1c7fec]">
            Offices
          </a>
        </div>

        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">Car Rental</h1>
        </div>

        {/* Description */}
        <div className="text-center text-[13px] max-w-2xl mx-auto">
          <p>
            Explore Seychelles with ease by choosing the best car rental service
            on Mahe and Praslin Island. We offer a wide range of vehicles at
            affordable rates, exceptional customer service, and flexible rental
            options to suit your travel needs. Whether you&apos;re visiting for
            leisure or business, our reliable and convenient car hire solutions
            will ensure a smooth journey across the islands. Book with us today
            and experience the beauty of Seychelles at your own pace.
          </p>
        </div>

        {/* Review Logos */}
        <div className="flex flex-wrap gap-10 justify-center items-center my-12">
          <Image
            src={trustLogo}
            alt="trust pilot logo"
            className="h-8 md:h-12 w-auto"
          />
          <Image
            src={tripaLogo}
            alt="trust pilot logo"
            className="h-8 md:h-12 w-auto"
          />
          <Image
            src={googleLogo}
            alt="trust pilot logo"
            className="h-8 md:h-12 w-auto"
          />
        </div>

        {/* Follow Us Section */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="text-sm order-2 md:order-1">
            © 2023 SeventhSeychelles Car Rental | All Rights Reserved
          </div>
          <div className="flex flex-col md:flex-row justify-center w-full md:w-fit mb-4 md:mb-0 gap-4 items-center order-1 md:order-2">
            <h3 className="text-sm font-bold">Follow Us</h3>
            <div className="flex justify-center gap-3">
              <a
                href="#instagram"
                className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"
              >
                <Instagram size={24} />
              </a>
              <a
                href="#linkedin"
                className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"
              >
                <Linkedin size={24} />
              </a>
              <a
                href="#youtube"
                className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"
              >
                <Youtube size={24} />
              </a>
              <a
                href="#facebook"
                className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"
              >
                <Facebook size={24} />
              </a>
              <a
                href="#twitter"
                className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"
              >
                <Twitter size={24} />
              </a>
            </div>
          </div>  
        </div>
      </div>
    </div>
  );
};

export default Footer;
