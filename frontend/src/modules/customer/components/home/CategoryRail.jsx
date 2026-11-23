import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tag } from 'lucide-react';
import api from '../../../../utils/api';
import { getImageUrl } from '../../../../utils/imageUrl';

// Shown until (or if) the admin-managed service categories load.
const FALLBACK = [
    { _id: 'women', name: "Women's Wear", image: '/landing/opt/womens-wear.jpg', to: '/user/services' },
    { _id: 'men', name: "Men's Wear", image: '/landing/opt/mens-wear.jpg', to: '/user/services' },
    { _id: 'bridal', name: 'Bridal', image: '/landing/opt/bridal-wear.jpg', to: '/user/tailors?service=bridal' },
    { _id: 'kids', name: 'Kids Wear', image: '/landing/opt/kids-wear.jpg', to: '/user/services' },
    { _id: 'fabric', name: 'Fabrics', image: '/landing/opt/fabrics.jpg', to: '/user/store' },
];

// Admin names arrive as "blouse" or "SUIT WITH SALWAR" — show them consistently in Title Case.
const titleCase = (str) => String(str).toLowerCase().replace(/(^|[\s/&(-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

const Tile = ({ label, onClick, children, dot }) => (
    <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={onClick}
        className="flex w-[76px] shrink-0 flex-col items-center gap-1.5"
    >
        <span className="relative flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-[20px] bg-white shadow-[0_8px_18px_-12px_rgba(74,21,96,0.5)] ring-1 ring-[#EADFF1]">
            {children}
            {dot && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#843D9B]" />}
        </span>
        <span className="line-clamp-2 w-full text-center text-[11.5px] font-medium leading-tight text-gray-700">{label}</span>
    </motion.button>
);

const CategoryRail = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        let active = true;
        api.get('/products/categories', { params: { type: 'service' } })
            .then((res) => {
                const list = (res.data?.data || []).filter((c) => c?.name && c.isActive !== false);
                if (active && list.length) setCategories(list);
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    const items = categories.length
        ? categories.map((c) => ({ _id: c._id, name: titleCase(c.name.trim()), image: c.image ? getImageUrl(c.image) : '', to: `/user/services/category/${c._id}` }))
        : FALLBACK;

    return (
        <section className="mt-4 bg-gradient-to-b from-[#F7EFFA] to-white pt-3.5">
            <div className="mb-2.5 flex items-center justify-between px-4 md:px-6">
                <h2 className="text-[17px] font-semibold text-gray-900">What would you like stitched?</h2>
            </div>
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 md:px-6">
                <Tile label="Offers" onClick={() => navigate('/user/coupons')} dot>
                    <Tag size={26} className="text-[#843D9B]" />
                </Tile>
                {items.map((c) => (
                    <Tile key={c._id} label={c.name} onClick={() => navigate(c.to)}>
                        {c.image ? (
                            <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-xl font-bold text-[#843D9B]">{c.name.charAt(0)}</span>
                        )}
                    </Tile>
                ))}
            </div>
        </section>
    );
};

export default CategoryRail;
