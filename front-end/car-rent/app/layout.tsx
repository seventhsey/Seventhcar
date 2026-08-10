import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import FeedbackProvider from "./components/FeedbackProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Seventh Seychelles Car Rental",
  description: "Car rental services across Mahé and Praslin, Seychelles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={poppins.variable}>
        <FeedbackProvider />
        <div className="fixed top-0 right-0 left-0 z-50 flex justify-center">
          <NavBar />
        </div>
        {children}
        <Footer />
      </body>
    </html>
  );
}
