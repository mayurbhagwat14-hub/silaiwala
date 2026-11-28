import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, LayoutGrid } from 'lucide-react';
import { DressFormIcon, AlterationIcon, LehengaIcon, FlowerIcon, FabricIcon } from './ServiceIcons';

const BagIcon = ({ size }) => <ShoppingBag size={size} strokeWidth={1.4} />;
const MoreIcon = ({ size }) => <LayoutGrid size={size} strokeWidth={1.4} />;

/** Quick shortcuts under the hero — seven fit in one row on a phone. */
const ITEMS = [
    { label: 'Stitching', icon: DressFormIcon, to: '/user/services' },
    { label: 'Alteration', icon: AlterationIcon, to: '/user/alteration' },
    { label: 'Bridal\nWear', icon: LehengaIcon, to: '/user/tailors?service=bridal' },
    { label: 'Embroidery', icon: FlowerIcon, to: '/user/embroidery' },
    { label: 'Readymade', icon: BagIcon, to: '/user/store', badge: 'New' },
    { label: 'Fabric', icon: FabricIcon, to: '/user/store?type=fabric' },
    { label: 'More', icon: MoreIcon, to: '/user/what-we-offer' },
];

const CategoryRail = () => {
    const navigate = useNavigate();

    return (
        <section className="mt-5 px-2 md:px-6">
            <div className="grid grid-cols-7 gap-0.5">
                {ITEMS.map(({ label, icon: ItemIcon, to, badge }) => (
                    <motion.button
                        key={label}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => navigate(to)}
                        className="flex min-w-0 flex-col items-center gap-1.5"
                    >
                        <span className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full bg-white text-[#6A2385] shadow-[0_8px_18px_-8px_rgba(90,31,110,0.35)] ring-1 ring-[#F3ECF7] sm:h-[64px] sm:w-[64px]">
                            <ItemIcon size={28} />
                            {badge && (
                                <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#E5243B] px-1.5 py-px text-[8.5px] font-bold text-white shadow">
                                    {badge}
                                </span>
                            )}
                        </span>
                        <span className="w-full whitespace-pre-line break-words text-center text-[9.5px] font-semibold leading-tight tracking-[-0.01em] text-[#1A1523] sm:text-[12px]">
                            {label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </section>
    );
};

export default CategoryRail;
