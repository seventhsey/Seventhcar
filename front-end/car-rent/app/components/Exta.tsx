import React from 'react';
import img1 from '@/public/Assets/percent.svg'
import img2 from '@/public/Assets/support.svg'
import img3 from '@/public/Assets/earphone.svg'
import img4 from '@/public/Assets/cancel.svg'
import Image from 'next/image';

const features = [
  {
    img: img1,
    title: 'Transparent Pricing',
    description: 'See your total before submitting',
  },
  {
    img: img2,
    title: '24/7 Support',
    description: 'We’re always here to help',
  },
  {
    img: img3,
    title: 'Flexible Booking',
    description: 'Book your car on your schedule',
  },
  {
    img: img4,
    title: 'Flexible Locations',
    description: 'Airport, jetty, and custom pickup',
  },
];

const Exta = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-4 py-10 md:py-6 md:px-6">
      {features.map((item, index) => (
        <div
          key={index}
          className="flex items-start md:items-center md:p-4 transition"
        >
          <div className="mr-4"><Image src={item.img} alt={item.title} /></div>
          <div className="flex-1">
            <h2 className="text-base font-bold">{item.title}</h2>
            <p className="text-[13px]">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Exta;
