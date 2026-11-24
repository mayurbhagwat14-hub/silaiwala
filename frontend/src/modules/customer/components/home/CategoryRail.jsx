import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DressFormIcon, AlterationIcon, LehengaIcon, FlowerIcon, FabricIcon, ScissorsIcon } from './ServiceIcons';

/** Quick service shortcuts under the hero. */
const ITEMS = [
    { label: 'Stitching', icon: DressFormIcon, to: '/user/services' },
    { label: 'Alteration', icon: AlterationIcon, to: '/user/alteration' },
    { label: 'Bridal\nWear', icon: LehengaIcon, to: '/user/tailors?service=bridal' },
    { label: 'Embroidery', icon: FlowerIcon, to: '/user/embroidery' },
    { label: 'Fabric\nStore', icon: FabricIcon, to: '/user/store' },
    { label: 'Custom\nDesigns', icon: ScissorsIcon, to: '/user/custom-design' },
];

/** Swipeable row: exactly five items fit the width (basis-1/5); the rest swipe in. */
const CategoryRail = () => {
    const navigate = useNavigate();

    return (
        <section className="mt-5 px-2.5 md:px-6">
            <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto pb-1 pt-1">
                {ITEMS.map(({ label, icon: ItemIcon, to }) => (
                    <motion.button
                        key={label}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => navigate(to)}
                        className="flex shrink-0 basis-1/5 snap-start flex-col items-center gap-1.5 px-0.5"
                    >
                        <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white text-[#6A2385] shadow-[0_8px_18px_-8px_rgba(90,31,110,0.35)] ring-1 ring-[#F3ECF7] sm:h-[68px] sm:w-[68px]">
                            <ItemIcon size={34} />
                        </span>
                        <span className="whitespace-pre-line text-center text-[11px] font-medium leading-tight text-[#1A1523] sm:text-[12px]">
                            {label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </section>
    );
};

export default CategoryRail;
