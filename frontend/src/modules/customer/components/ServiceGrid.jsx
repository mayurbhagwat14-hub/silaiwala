import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SectionTitle } from './home/homeUi';

const ServiceGrid = () => {
    const navigate = useNavigate();

    const services = [
        { title: 'Tailors', subtitle: 'Expert pros', imgSrc: '/icons/service_icon_0.png', path: '/user/tailors' },
        { title: 'Stitching', subtitle: 'Perfectly crafted', imgSrc: '/icons/service_icon_1.png', path: '/user/services' },
        { title: 'Add-ons', subtitle: 'Elevate your look', imgSrc: '/icons/service_icon_2.png', path: '/user/embellishments' },
        { title: 'Bridal', subtitle: 'For your big day', imgSrc: '/icons/service_icon_3.png', path: '/user/tailors?service=bridal' },
    ];

    return (
        <div className="px-4 md:px-6 lg:px-8 mb-2">
            <SectionTitle title="What we" accent="offer" to="/user/what-we-offer" />

            <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {services.map((service) => (
                    <motion.button
                        key={service.title}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => navigate(service.path)}
                        className="group flex min-w-0 flex-col items-center gap-1.5"
                    >
                        <span className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] bg-[#F7F6F9] ring-1 ring-[#ECEAEF] transition-transform duration-300 group-hover:-translate-y-0.5 sm:h-[80px] sm:w-[80px]">
                            <img
                                src={service.imgSrc}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                width="56"
                                height="56"
                                className="h-[56px] w-[56px] object-contain sm:h-[70px] sm:w-[70px]"
                            />
                        </span>
                        <span className="flex max-w-full flex-col items-center text-center">
                            <span className="truncate text-[12px] font-semibold leading-tight text-[#1A1523]">{service.title}</span>
                            <span className="truncate text-[9.5px] font-medium leading-tight text-[#8C8794]">{service.subtitle}</span>
                        </span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default ServiceGrid;
