import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../../../../utils/api';
import { getImageUrl } from '../../../../utils/imageUrl';

// Admin names arrive as "blouse" or "SUIT WITH SALWAR" — show them in Title Case.
const titleCase = (str) => String(str).toLowerCase().replace(/(^|[\s/&(-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

export const SectionHeader = ({ title, to }) => (
    <div className="mb-3 flex items-center justify-between px-4 md:px-6">
        <h2
            className="text-[18px] font-semibold tracking-[-0.01em] text-[#1A1523] sm:text-[20px]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
            {title}
        </h2>
        {to && (
            <Link to={to} className="flex items-center gap-1 text-[13px] font-semibold text-[#6A2385]">
                View All <ArrowRight size={14} />
            </Link>
        )}
    </div>
);

/**
 * "Popular Services": one photo card per active service category from Admin → Services.
 * Only admin data is shown — no built-in photos. Hidden when the admin has no active categories.
 */
const PopularServices = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        api.get('/products/categories', { params: { type: 'service' } })
            .then((res) => {
                const list = (res.data?.data || []).filter((c) => c?.name && c.isActive !== false);
                if (active) setCategories(list);
            })
            .catch(() => {})
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    if (loading) {
        return (
            <section className="mt-6">
                <SectionHeader title="Popular Services" />
                <div className="no-scrollbar flex gap-2.5 overflow-hidden px-4 pb-2 md:px-6">
                    {[0, 1, 2].map((i) => (
                        <span key={i} className="h-[150px] w-[124px] shrink-0 animate-pulse rounded-[14px] bg-[#EFE6F4] sm:h-[180px] sm:w-[150px]" />
                    ))}
                </div>
            </section>
        );
    }

    if (!categories.length) return null;

    const items = categories.map((c) => ({
        _id: c._id,
        name: titleCase(c.name.trim()),
        image: c.image ? getImageUrl(c.image) : '',
        to: `/user/services/category/${c._id}`,
    }));

    return (
        <section className="mt-6">
            <SectionHeader title="Popular Services" to="/user/services" />
            <div className="no-scrollbar flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 md:px-6">
                {items.map((c) => (
                    <Link
                        key={c._id}
                        to={c.to}
                        aria-label={c.name}
                        title={c.name}
                        className="group flex w-[124px] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] bg-[#4A1560] shadow-[0_10px_20px_-14px_rgba(42,15,56,0.8)] sm:w-[150px]"
                    >
                        <span className="relative block h-[150px] overflow-hidden bg-gradient-to-br from-[#843D9B] to-[#4A1560] sm:h-[180px]">
                            {c.image ? (
                                <img
                                    src={c.image}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <span className="flex h-full items-center justify-center text-4xl font-semibold text-white/30">
                                    {c.name.charAt(0)}
                                </span>
                            )}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default PopularServices;
