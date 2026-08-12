'use client'
import { Menu } from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";

const links = [
  { label: "Home", path: "/" },
  { label: "Vehicles", path: "/vehicles" },
  { label: "FAQ", path: "/faq" },
];

const NavBar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen((current) => !current);
  };

  return (
    <nav className="bg-white shadow-xl border-b-4 border-[#1c7fec] w-full rounded-b-xl font-bold max-w-[1230px] md:mx-auto mx-3">
      <div className="px-4 py-4 flex justify-between items-center">
        <div className="text-xl">Car Rental</div>

        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            className="text-gray-800 focus:outline-none cursor-pointer"
            aria-label="Toggle Menu"
            aria-expanded={menuOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="hidden md:flex md:flex-row md:items-center">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.path}
              className="px-4 py-2 hover:text-[#1c7fec] block md:inline-block"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col md:hidden top-[66px] rounded-xl mx-3 overflow-y-auto">
          <div className="flex-1 flex flex-col items-center gap-2 m-6">
            {links.map((item) => (
              <Link
                key={item.label}
                href={item.path}
                className="px-4 py-3 text-xl font-bold"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
