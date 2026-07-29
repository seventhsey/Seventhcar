'use client'
import React from 'react';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

import img1 from '@/public/Assets/ico_key.svg';
import img2 from '@/public/Assets/ico_time-clock.svg';
import img3 from '@/public/Assets/ico_return-car.svg';

interface SupportCard {
  title: string;
  img: string;
}

export const SupportCenter: React.FC = () => {
  const supportCards: SupportCard[] = [
    {
      title: 'Before Rental',
      img: img1,
    },
    {
      title: 'During Rental',
      img: img2,
    },
    {
      title: 'After Rental',
      img: img3,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <h1 className="text-[30px] md:text-[36px] pl-2 md:pl-20 font-bold text-gray-900">Support Center</h1>
        <a href="#faq" className="flex items-center text-xs md:text-sm font-bold text-black hover:text-[#1c7fec]">
          View FAQ <ChevronRight className="ml-1 w-4 h-4 text-[#1c7fec]" />
        </a>
      </div>

      <div className="hidden md:flex gap-6">
        {supportCards.map((card, index) => (
          <div
            key={index}
            className="rounded-[16px] p-[13px_20px] flex flex-col items-start justify-between bg-gradient-to-r from-[#f8f8f8] to-[#f8f8f8] hover:from-[#1cb4ec] hover:to-[#1c7fec] hover:text-white transition-shadow h-[155px] w-[210px] relative overflow-hidden"
          >
            <Image src={card.img} alt={card.title} className="w-[50px] h-[50px]" />
            <span className="text-base font-bold">{card.title}</span>
            <div className="absolute p-1.5 bg-white text-gray-400 rounded-full -right-2 top-[60px]">
              <ChevronRight size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="md:hidden">
        <Swiper
          modules={[Pagination]}
          spaceBetween={16}
          slidesPerView={2}
          pagination={{ clickable: true }}
          className="mySwiper"
        >
          {supportCards.map((card, index) => (
            <SwiperSlide key={index}>
              <div
                className="rounded-[16px] p-[13px_20px] flex flex-col items-start justify-between bg-gradient-to-r from-[#f8f8f8] to-[#f8f8f8] hover:from-[#1cb4ec] hover:to-[#1c7fec] hover:text-white transition-shadow h-[155px] max-w-[210px] relative overflow-hidden"
              >
                <Image src={card.img} alt={card.title} className="w-[50px] h-[50px]" />
                <span className="text-base font-bold">{card.title}</span>
                <div className="absolute p-1.5 bg-white text-gray-400 rounded-full -right-2 top-[60px]">
                  <ChevronRight size={24} />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};

export default SupportCenter;
