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
      "Rates depend on the vehicle, rental length, protection and extras. Your total appears before submission. Payment is due on arrival. Cash and bank transfer are accepted; card payments carry a 3% commission and PayPal a 5% commission. Contact us to arrange payment. Online card checkout is not currently available.",
  },
  {
    question: "Is insurance included in the rental price?",
    answer:
      "Yes, all rentals include third-party insurance coverage for your peace of mind.",
  },
  {
    question: "Are there any additional or hidden fees?",
    answer:
      "The booking summary itemises your rental, protection and selected extras, including applicable pickup and drop-off charges. Payment-method commissions and charges for issues such as extensive cleaning are separate; contact us if you need clarification before booking.",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "Cancellation is free of charge. Call or WhatsApp us to let us know your plans have changed.",
  },
  {
    question: "Do you offer airport or hotel delivery?",
    answer:
      "Choose Mahé Airport, Cat Coco’s Jetty or Other for pickup and return. For a hotel or another location, select Other and provide the address in your reservation notes. Applicable location charges appear in your booking summary.",
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
      "Contact us to request an extension. We will confirm vehicle availability and the revised rental total before extending your booking.",
  },
  {
    question: "What happens if I return the car late?",
    answer:
      "Call or message us if you expect to be late. A delay of up to 1–2 hours can be accommodated without extra rental charges when arranged with our team.",
  },
  {
    question: "Can I add an additional driver?",
    answer:
      "A second driver costs €5 per day and must be at least 21 with one year of driving experience. Bring their valid driving licence and ID or passport. Request this in your booking notes.",
  },
  {
    question: "Do you provide child seats?",
    answer:
      "Yes. Available baby and child seats can be selected as paid extras during booking, subject to availability.",
  },
  {
    question: "What should I do in case of a breakdown?",
    answer:
      "Call or WhatsApp +248 2502815 for assistance. Our team is available 24/7.",
  },
  {
    question: "Are there driving rules in Seychelles?",
    answer:
      "Drive on the left, wear seat belts and avoid using your phone while driving. Allow extra time for narrow roads, bends and hills, and follow posted road signs.",
  },
  {
    question: "What are speed limits in Seychelles?",
    answer:
      "Speed limits vary by road and location. Always follow the posted signs and local traffic rules.",
  },
  {
    question: "Which islands do you operate in?",
    answer:
      "Our fleet and online bookings are for Mahé Island. Contact us before making plans for another island.",
  },
  {
    question: "Can I rent a car for 1 day?",
    answer:
      "The booking system accepts one-day rentals. The displayed daily rate is adjusted according to the rental length.",
  },
  {
    question: "Is there a mileage limit?",
    answer: "Unlimited mileage is included.",
  },
  {
    question: "What happens if I return the car with sand inside?",
    answer: "A little sand on the mats is fine. Extensive interior cleaning costs €40.",
  },
  {
    question: "Can I change my booking or return the car earlier?",
    answer: "There is no booking-amendment fee. Use Manage Reservation to request changes before your rental, or contact us for extensions and early returns. Changes to dates, vehicle, protection or extras may change the rental total and require our approval.",
  },
  {
    question: "Why is the daily rate higher for a short rental?",
    answer: "The rental-length pricing tiers apply higher daily rates to short bookings and lower rates to longer bookings. Enter your dates to see the calculated quote.",
  },
  {
    question: "Do you offer weekly or monthly rental discounts?",
    answer: "Longer rentals benefit from lower pricing tiers. The booking system applies the appropriate rental-length rate automatically. Contact us for a custom quotation.",
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
                type="button"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
                id={`faq-question-${index}`}
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
                id={`faq-answer-${index}`}
                role="region"
                aria-labelledby={`faq-question-${index}`}
                aria-hidden={openIndex !== index}
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
