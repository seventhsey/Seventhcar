import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import Image from "next/image";
import trustLogo from "@/public/Assets/trustpilot-1.svg";
import tripaLogo from "@/public/Assets/tripadvisor.svg";
import googleLogo from "@/public/Assets/google.png";

const Footer = () => {
  return (
    <footer className="bg-[#17191c] text-white pt-12 pb-6">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-center gap-x-4 md:gap-16 text-sm">
          <a href="#cookies" className="hover:text-[#1c7fec]">Cookies</a>
          <a href="#privacy-policy" className="hover:text-[#1c7fec]">Privacy policy</a>
          <a href="#payment-methods" className="hover:text-[#1c7fec]">Payment methods</a>
          <a href="#terms-conditions" className="hover:text-[#1c7fec]">Terms and conditions</a>
          <a href="#offices" className="hover:text-[#1c7fec]">Offices</a>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold">Car Rental</h1>
        </div>

        <div className="text-center text-[13px] max-w-2xl mx-auto">
          <p>
            Explore Seychelles with a wide range of vehicles, flexible rental
            options, and friendly support across Mahé and Praslin. Book the
            right car for your journey and discover the islands at your own pace.
          </p>
        </div>

        <div className="flex flex-wrap gap-10 justify-center items-center my-12">
          <Image src={trustLogo} alt="Trustpilot" className="h-8 md:h-12 w-auto" />
          <Image src={tripaLogo} alt="Tripadvisor" className="h-8 md:h-12 w-auto" />
          <Image src={googleLogo} alt="Google reviews" className="h-8 md:h-12 w-auto" />
        </div>

        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="text-sm order-2 md:order-1">
            © 2026 Seventh Seychelles Car Rental | All Rights Reserved
          </div>
          <div className="flex flex-col md:flex-row justify-center w-full md:w-fit mb-4 md:mb-0 gap-4 items-center order-1 md:order-2">
            <h3 className="text-sm font-bold">Follow Us</h3>
            <div className="flex justify-center gap-3">
              <a href="#instagram" aria-label="Instagram" className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"><Instagram size={24} /></a>
              <a href="#linkedin" aria-label="LinkedIn" className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"><Linkedin size={24} /></a>
              <a href="#youtube" aria-label="YouTube" className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"><Youtube size={24} /></a>
              <a href="#facebook" aria-label="Facebook" className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"><Facebook size={24} /></a>
              <a href="#twitter" aria-label="Twitter" className="text-[#17191c] bg-stone-400 hover:bg-[#1c7fec] rounded-full p-1.5"><Twitter size={24} /></a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
