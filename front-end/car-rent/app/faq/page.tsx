"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What types of cars do you offer for rent?",
    answer: `Our current fleet is shown on the Vehicles page. Availability depends on your selected pickup and return dates.`,
  },
  {
    question: "What is the minimum age requirement for renting a car?",
    answer:
      "Minimum age is 21 years with at least 1 year of driving experience.",
  },
  {
    question: "What documents are required for renting a car?",
    answer:
      "You need a valid driver’s license along with a valid ID or passport.",
  },
  {
    question: "What are your rental rates and payment options?",
    answer:
      "Rates depend on the selected vehicle, rental length, protection plan, and extras. The full calculated total is shown before you submit the reservation. Payment is currently made on arrival.",
  },
  {
    question: "Is insurance included in the rental price?",
    answer:
      "Yes, all rentals include third-party insurance coverage for your peace of mind.",
  },
  {
    question: "Are there any additional or hidden fees?",
    answer:
      "No, our pricing is fully transparent with no hidden charges.",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "Contact us as early as possible if your plans change. Our team will confirm the applicable cancellation conditions for your reservation.",
  },
  {
    question: "Do you offer airport or hotel delivery?",
    answer:
      "Yes, we provide delivery to both airports and hotels, as well as flexible return locations.",
  },
  {
    question: "Where can I drive the rental car?",
    answer:
      "You can drive anywhere on Mahe island where there is road access.",
  },
  {
    question: "What is the fuel policy?",
    answer:
      "Return the vehicle with the same fuel level as received.",
  },
  {
    question: "Can I extend my rental period?",
    answer:
      "Yes, extensions are possible anytime — just contact us.",
  },
  {
    question: "What happens if I return the car late?",
    answer:
      "Up to 1–2 hours delay is acceptable. Please inform us in advance if you expect delays.",
  },
  {
    question: "Can I add an additional driver?",
    answer:
      "Additional drivers may be permitted if they meet the licence and age requirements. Please include the request in your reservation notes so our team can confirm it.",
  },
  {
    question: "Do you provide child seats?",
    answer:
      "Yes. Available baby and child seats can be selected as paid extras during booking, subject to availability.",
  },
  {
    question: "What should I do in case of a breakdown?",
    answer:
      "Contact us immediately — we provide 24/7 support.",
  },
  {
    question: "Are there driving rules in Seychelles?",
    answer:
      "Drive on the left side. Average speed is 25–30 km/h. Seat belts are mandatory.",
  },
  {
    question: "What are speed limits in Seychelles?",
    answer:
      "Speed limits vary by road and location. Always follow the posted signs and local traffic rules.",
  },
  {
    question: "Which islands do you operate in?",
    answer:
      "Our online booking locations currently focus on Mahé. Contact us before booking if you need arrangements elsewhere.",
  },
  {
    question: "Can I rent a car for 1 day?",
    answer:
      "The booking system accepts one-day rentals. The displayed daily rate is adjusted according to the rental length.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white py-20 px-6">
      <div className="max-w-4xl mx-auto">
        
        <h1 className="text-4xl font-semibold mb-6">
          Frequently Asked Questions
        </h1>

        <p className="text-gray-400 mb-10">
          Please reach out if you need more information about our car hire services.
        </p>

        <div className="divide-y divide-gray-800">
          {faqs.map((faq, index) => (
            <div key={index} className="py-5">
              <button
                className="w-full flex justify-between items-center text-left text-lg font-medium hover:text-blue-400 transition"
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              >
                {faq.question}
                <span className="text-2xl">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96 mt-4" : "max-h-0"
                }`}
              >
                <p className="text-gray-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
