import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DressFormIcon, LehengaIcon, FlowerIcon, FabricIcon, ScissorsIcon } from './ServiceIcons';

/** Quick service shortcuts under the hero: one white card, five icons split by thin dividers. */
const ITEMS = [
    { label: 'Stitching &\nAlterations', icon: DressFormIcon, to: '/user/alteration' },
    { label: 'Bridal Wear', icon: LehengaIcon, to: '/user/tailors?service=bridal' },
    { label: 'Embroidery\nServices', icon: FlowerIcon, to: '/user/embroidery' },
    { label: 'Fabric\nStore', icon: FabricIcon, to: '/user/store' },
    { label: 'Custom\nDesigns', icon: ScissorsIcon, to: '/user/custom-design' },
];

const CategoryRail = () => {
    const navigate = useNavigate();

    return (
        <section className="mt-4 px-4 md:px-6">
            <div className="flex items-stretch rounded-[20px] bg-white py-3 shadow-[0_10px_26px_-18px_rgba(42,15,56,0.55)] ring-1 ring-[#F1ECF4]">
                {ITEMS.map(({ label, icon: ItemIcon, to }, i) => (
                    <motion.button
                        key={label}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => navigate(to)}
                        className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 px-0.5 ${i > 0 ? 'border-l border-[#EFE6F4]' : ''}`}
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6EEFA] text-[#6A2385] sm:h-12 sm:w-12">
                            <ItemIcon size={26} />
                        </span>
                        <span className="whitespace-pre-line text-center text-[9.5px] font-medium leading-tight text-[#1A1523] sm:text-[11.5px]">
                            {label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </section>
    );
};

export default CategoryRail;
