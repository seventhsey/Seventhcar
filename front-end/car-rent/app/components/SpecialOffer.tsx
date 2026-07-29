'use client'
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination } from 'swiper/modules';

const offers = [
  {
    discount: 'up to -30%',
    label: 'Off',
    image: '/Assets/lsland-vew.webp',
    title: 'Long Term Rental',
    description:
      'Long-term car rental is ideal and extremely practical for all business and individual users...',
  },
  {
    discount: '10%',
    label: 'Off',
    image: '/Assets/car-park.webp',
    title: 'Flexible Pick-Up & Drop-Off',
    description: 'Enjoy the freedom to collect your car when and where it suits you—and return it wherever is most convenient.',
  }
];

export default function SpecialOffers() {
  return (
    <div className="px-4 sm:px-6 py-10 max-w-6xl mx-auto overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 max-w-5xl mx-auto">
        <h2 className="text-[30px] md:text-[36px] font-bold text-gray-900">Special Offers</h2>
      </div>

      <Swiper
        spaceBetween={20}
        slidesPerView={1}
        navigation={{
          prevEl: '.swiper-prev',
          nextEl: '.swiper-next',
        }}
        pagination={{ clickable: true }}
        modules={[Navigation, Pagination]}
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
      >
        {offers.map((offer, index) => (
          <SwiperSlide key={index} className="py-4">
            <div className="relative w-full min-w-0">
              <div className="relative h-52 w-full overflow-hidden rounded-[16px]">
                <Image
                  src={offer.image}
                  alt="Offer background"
                  fill
                  sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute top-0 left-4 -translate-y-1/4 bg-gradient-to-r from-[#1cb4ec] to-[#1c7fec] text-white px-4 py-2 rounded-xl text-center max-w-[80%]">
                  <div className="text-[22px] font-bold leading-tight">{offer.discount}</div>
                  <div className="text-base">{offer.label}</div>
                </div>
              </div>
              <div className="px-2 py-4">
                <h3 className="font-bold text-lg">{offer.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{offer.description}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
        <button
          className="swiper-prev flex items-center justify-center absolute left-0 top-[30%] -translate-y-1/2 bg-white text-[#1c7fec] hover:text-white hover:bg-gradient-to-r hover:from-[#1cb4ec] hover:to-[#1c7fec] w-[45px] h-[45px] rounded-full transition z-50 cursor-pointer"
          aria-label="Previous"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="swiper-next flex items-center justify-center absolute right-0 top-[30%] -translate-y-1/2 bg-white text-[#1c7fec] hover:text-white hover:bg-gradient-to-r hover:from-[#1cb4ec] hover:to-[#1c7fec] w-[45px] h-[45px] rounded-full transition z-50 cursor-pointer"
          aria-label="Next"
        >
          <ChevronRight size={20} />
        </button>
      </Swiper>
    </div>
  );
}
