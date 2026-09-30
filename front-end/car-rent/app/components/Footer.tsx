import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-[#17191c] text-white pt-12 pb-6">
      <div className="p-6 max-w-7xl mx-auto space-y-7">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
          <Link href="/" className="hover:text-[#1c7fec]">Home</Link>
          <Link href="/vehicles" className="hover:text-[#1c7fec]">Vehicles</Link>
          <Link href="/faq" className="hover:text-[#1c7fec]">FAQ</Link>
          <Link href="/manage-reservation" className="hover:text-[#1c7fec]">Manage reservation</Link>
          <Link href="/#contact" className="hover:text-[#1c7fec]">Contact</Link>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold">Seventh Seychelles Car Rental</h2>
        </div>

        <div className="text-center text-[13px] max-w-2xl mx-auto">
          <p>
            Explore Seychelles with transparent pricing, flexible rental options,
            and friendly local support. Choose the right car for your journey and
            discover the islands at your own pace.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-3 border-t border-white/15 pt-6 text-sm">
          <div>© 2026 Seventh Seychelles Car Rental | All Rights Reserved</div>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="mailto:seventhseychelles@gmail.com" className="hover:text-[#1c7fec]">
              seventhseychelles@gmail.com
            </a>
            <a href="tel:+2482502815" className="hover:text-[#1c7fec]">
              +248 2502815
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
