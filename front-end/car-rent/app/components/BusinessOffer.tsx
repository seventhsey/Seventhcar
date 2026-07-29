import React from 'react';
import Image from 'next/image';
import { ChevronRight, IndentDecrease } from 'lucide-react';

const BusinessOffer = () => {
  return (
    <div className="w-full max-w-6xl mx-auto relative overflow-hidden px-4 md:px-0">
      <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] h-[232px] w-[232px] absolute z-[-10] rounded-full top-[27%] md:top-10 -left-[45%] md:left-[40%]" />
      <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] h-[130px] w-[130px] absolute z-[0] rounded-full -right-[18%] md:right-[25%] bottom-12 md:-bottom-12" />
      <div className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] h-[87px] w-[87px] absolute z-[-10] rounded-full top-28 md:top-16 -right-[8%] md:right-0" />

      <div className="mt-6 flex flex-col lg:flex-row w-full md:pl-12 md:pr-6 z-10 relative">
        <div className="w-full md:w-[400px] z-10 px-1 md:px-0">
          <div>
            <p className="text-[#1c7fec] font-bold text-[13px]">Business Offer</p>
            <h2 className="text-[30px] sm:text-[34px] font-bold leading-tight break-words">
              We ensure top quality <br className="hidden sm:block" />
              <span>premium business vehicles</span>
            </h2>
          </div>
        </div>

        <div className="hidden md:flex flex-1 relative z-50 mt-2">
          <div className="relative w-full">
            <Image
              src="/Assets/bmw.png"
              alt="Business Car"
              width={800}
              height={400}
              className="w-full max-w-[800px] h-auto rounded-xl relative z-30 object-contain"
            />
            <div className="absolute bottom-16 right-10 z-40">
              <button className="bg-gradient-to-l to-[#1cb4ec] from-[#1c78ec] text-white px-10 md:py-5 rounded-md hover:to-[#1cea88] hover:from-[#17a932] transition-colors font-bold cursor-pointer">
                Business Offer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#17191c] text-white mx-auto rounded-2xl hidden relative md:block z-0">
        <div className="relative pl-8 mt-[-160px] pt-8 pb-12 z-10">
          <div className="px-4 w-[400px] flex flex-col items-center">
            <div>
              <p className="text-[13px]">
                It is time to reduce costs of your business fleet, increase productivity and protect your investment in your establishment.
              </p>
            </div>
            <div className="absolute left-0 -bottom-5 translate-y-1/2 flex gap-6 z-10 w-1/3 pl-4 items-center justify-center">
              <Feature icon={<IndentDecrease />} title="Flexibility" />
              <Feature icon={<IndentDecrease />} title="Efficiency" />
              <Feature icon={<IndentDecrease />} title="Reliability" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#17191c] relative text-white mt-4 rounded-2xl md:hidden flex flex-col items-center p-4 z-10 w-full">
        <p className="text-[13px] w-full">
          It is time to reduce costs of your business fleet, increase productivity and protect your investment in your establishment.
        </p>
        <div className="relative w-full h-[150px] mt-2 mb-10">
          <Image
            src="/Assets/bmw.png"
            alt="Business Car"
            fill
            sizes="calc(100vw - 64px)"
            className="object-contain rounded-xl relative z-30"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 z-10 items-start justify-center absolute -bottom-[62px] w-full px-2">
          <Feature icon={<IndentDecrease />} title="Flexibility" />
          <Feature icon={<IndentDecrease />} title="Efficiency" />
          <Feature icon={<IndentDecrease />} title="Reliability" />
        </div>
      </div>

      <button className="hover:text-[#1c7fec] text-[12px] font-bold flex md:hidden items-center gap-1 justify-center mt-24 w-full z-10">
        View business offer <ChevronRight size={16} className="text-[#1c7fec]" />
      </button>
    </div>
  );
};

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center z-10 min-w-0 text-center">
      <div className="bg-white rounded-full w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 flex items-center justify-center text-blue-500 text-3xl md:text-4xl">
        {icon}
      </div>
      <p className="text-black mt-2 font-bold md:font-medium text-[11px] sm:text-[13px] md:text-base break-words w-full">{title}</p>
    </div>
  );
}

export default BusinessOffer;
