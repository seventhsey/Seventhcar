'use client'
import { Ellipsis, Menu } from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";

const NavBar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <nav className="bg-white shadow-xl border-b-4 border-[#1c7fec] w-full rounded-b-xl font-bold max-w-[1230px] md:mx-auto mx-3">
      <div className="px-4 py-4 flex justify-between items-center">
        {/* Brand */}
        <div className="text-xl">Car Rental</div>

        {/* Hamburger Button - Mobile Only */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            className="text-gray-800 focus:outline-none cursor-pointer"
            aria-label="Toggle Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Links and Language Selector - Desktop */}
        <div className="hidden md:flex md:flex-row md:items-center">
          {/* Menu Links */}
          <div className="flex flex-row">
            {[
              { label: "Home", path: "/" },
              { label: "Vehicles", path: "/vehicles" },
              { label: "FAQ", path: "/faq" }
            ].map((item) => (
              <Link
                key={item.label}
                href={item.path}
                className="px-4 py-2 hover:text-[#1c7fec] block md:inline-block"
              >
                {item.label}
              </Link>
            ))}
          </div>
          {/* Ellipsis with Dropdown */}
          <div className="relative">
            <button
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
              className="w-10 h-10 rounded-full bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] text-white flex items-center justify-center"
            >
              <Ellipsis />
            </button>
            {dropdownOpen && (
              <div
                className="absolute left-0 mt-0 w-52 bg-[#f8f8f8] rounded-md z-20 font-normal py-2"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                {["Book Now", "About us", "Offices", "Terms and Conditions", "Contact"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                    className="block px-6 py-3 hover:text-[#1c7fec]"
                  >
                    {item}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu - Full Screen */}
      {menuOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col md:hidden top-[66px] rounded-xl mx-3 overflow-y-auto">
         

          {/* Mobile Menu Links */}
          <div className="flex-1 flex flex-col items-center gap-2 m-6">
            {[
              { label: "Home", path: "/" },
              { label: "Vehicles", path: "/vehicles" },
              { label: "FAQ", path: "/faq" }
            ].map((item) => (
              <Link
                key={item.label}
                href={item.path}
                className="px-4 py-3 text-xl font-bold"
                onClick={toggleMenu}
              >
                {item.label}
              </Link>
            ))}
            <div className="w-full text-center flex flex-col items-center justify-center">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-10 h-10 rounded-full bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] text-white flex items-center justify-center"
              >
                <Ellipsis />
              </button>
              {dropdownOpen && (
                <div
                  className="bg-[#f8f8f8] rounded-md font-normal py-2 w-full"
                  onClick={() => setDropdownOpen(false)}
                >
                  {[
                    // You can update these with real paths later if you make pages
                    { label: "Book Now", path: "/book" },
                    { label: "About us", path: "/about" },
                    { label: "Contact", path: "/contact" }
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.path}
                      className="block px-6 py-3 hover:text-[#1c7fec]"
                      onClick={() => setDropdownOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;