'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import quoteImg from '@/public/Assets/ico_quote.svg';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

const AboutAndCom = () => {
  const comments = [
    {
      com: 'Everything was perfect... from the first contact through Whatsapp to organize the meeting, the arrival with the car delivered (by Lakee who gave us some recommendations) just in front of the Arrival Terminal, the car was in perfect state and clean. We ran about 200 kms without any problem. Returning the car was as easy as the arrival, with Lakee waiting for us at 6AM in front of the terminal again. I highly recommend if you want an easy and great car rental!! :)',
      name: 'Sky Cielsky',
      place: 'Trustpilot',
    },
    {
      com: 'Fast and clear communication. Easy pick up and drop off. No hidden fees or any dodgy techniques. Car was amazing in terms of engine and reliability. We got almost new car in perfect condition and clean. It was fun to drive ?? Thank you guys.',
      name: 'Vlado',
      place: 'Google Review',
    },
    {
      com: 'Staff was super friendly with emphasis to Deen. He was waiting for us on time after our arrival and he was flexible and punctual for the drop off of the car. He reaches you in advance via WhatsApp. The car pick up and return was very fast. Car was in excellent condition. We were lucky to get an upgrade during our rental. The entire process, from beginning to end, was very smooth.',
      name: 'Bruno Q',
      place: 'Tripadvisor',
    },
    {
      com: 'A very good rental company. Car was as good as new. Easy to drive automatic gear. No issues and brought us anywhere on the island. Staff was very helpful and overall a great experience.',
      name: 'Goran Pismestrovic',
      place: 'Google review',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-[15px] md:px-0 py-16 overflow-hidden md:overflow-visible">
      <div className="flex flex-col md:flex-row md:justify-between w-full">
        <div className='flex md:gap-2 w-full -ml-8 md:w-[40%]'>
          <div className='flex flex-col items-center'>
            <p className='text-[180px] font-bold text-[#1c7fec] rotate-[-25deg] leading-[150px] mb-0'>?</p>
            <div className="w-[2px] mb-[22px] flex-1 h-full bg-[#1c7fec] ml-[15px]"></div>
          </div>
          <div className="w-full pt-[50px]">
            <h1 className="text-[30px] md:text-[36px] md:mb-[45px] font-bold mb-6 text-left">Why Choose Us?</h1>
            <h3 className="text-lg font-bold mb-[7px]">About Us</h3>
            <p className="text-[13px] mb-[25px]">
              We provide reliable car rental services across Mahé and Praslin, with a varied fleet designed to suit different travel needs and budgets. Our goal is to make every rental straightforward, comfortable, and stress-free from booking to return.
              <br />
              <br />
              Our team offers friendly support, flexible rental options, and competitive pricing so you can explore Seychelles at your own pace. Choose the right vehicle, plan your journey, and enjoy the islands with confidence.
            </p>
            <button className="p-[13px_25px_13px_35px] bg-[#f8f8f8] text-[13px] font-bold text-[#17191c] rounded hover:bg-[#1c7fec] hover:text-white transition relative cursor-pointer">
              <div className="absolute p-1.5 bg-white text-[#1c7fec] rounded-full -left-3 top-[7px]">
                <ChevronRight size={18} />
              </div>
              Read more
            </button>
          </div>
        </div>

        <div className="max-w-[610px] relative mt-[50px]">
          <h1 className="text-[18px] font-bold mb-5 text-center">What Others Are Saying</h1>
          <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] h-[232px] w-[232px] absolute z-[-10] rounded-full top-[35%] -left-[35%] md:-left-[22%]" />
          <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] h-[130px] w-[130px] absolute z-[0] rounded-full left-[30%] md:left-[40%] -bottom-10 md:-bottom-12" />
          <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] h-[87px] w-[87px] absolute z-[-10] rounded-full -top-2 md:-top-4 -right-[6%] md:right-6" />
          <Swiper
            modules={[Navigation]}
            navigation={{
              prevEl: '.swiper-prev',
              nextEl: '.swiper-next',
            }}
            spaceBetween={0}
            slidesPerView={1}
            loop={true}
            className="relative mx-auto w-full overflow-visible"
          >
            {comments.map((comment, index) => (
              <SwiperSlide key={index} className='py-10 px-5'>
                <div className="bg-[#f8f8f8] p-[55px_50px_30px] rounded-[16px] relative">
                  <Image src={quoteImg} alt='quote image' className='left-[25px] top-[-20px] h-[60px] w-[80px] absolute z-[10]' />
                  <p className="italic text-gray-700 mb-4">{comment.com}</p>
                  <div className="text-[13px] text-[#1c7fec] flex gap-1">
                    <p className="font-bold">{comment.name},</p>
                    <p>{comment.place}</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
            <button
              className="swiper-prev flex items-center justify-center absolute left-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-[#fff] to-[#fff] text-[#1c7fec] hover:text-white hover:from-[#1cb4ec] hover:to-[#1c7fec] w-[45px] h-[45px] rounded-full transition z-50"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="swiper-next flex items-center justify-center absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-[#fff] to-[#fff] text-[#1c7fec] hover:text-white hover:from-[#1cb4ec] hover:to-[#1c7fec] w-[45px] h-[45px] rounded-full transition z-50"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </Swiper>
        </div>
      </div>
    </div>
  );
};

export default AboutAndCom;
