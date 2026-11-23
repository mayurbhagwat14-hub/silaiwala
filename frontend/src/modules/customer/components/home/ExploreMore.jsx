import React from 'react';
import { Link } from 'react-router-dom';

// Icons in /icons/explore are pre-cropped to the same round size so every tile matches.
const TILES = [
    { label: 'Tailors', image: '/icons/explore/tailors.png', to: '/user/tailors' },
    { label: 'Stitching', image: '/icons/explore/stitching.png', to: '/user/services' },
    { label: 'Add-ons', image: '/icons/explore/addons.png', to: '/user/embellishments' },
    { label: 'Bridal', image: '/icons/explore/bridal.png', to: '/user/tailors?service=bridal' },
    { label: 'Alterations', image: '/icons/explore/alterations.png', to: '/user/alteration' },
    { label: 'Custom Design', image: '/icons/explore/custom-design.png', to: '/user/custom-design' },
    { label: 'Bulk Orders', image: '/icons/explore/bulk-orders.png', to: '/user/bulk-order' },
];

/** "Explore more" shortcuts: a scrollable row of round icons, each a real link. */
const ExploreMore = () => (
    <section>
        <div className="mb-3 flex items-center justify-between px-4 md:px-6">
            <h2 className="text-[17px] font-semibold text-gray-900">Explore more</h2>
            <span className="text-[11.5px] text-gray-400">Swipe for more</span>
        </div>
        <div className="no-scrollbar flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 pt-1 md:scroll-px-6 md:px-6">
            {TILES.map((t) => (
                <Link
                    key={t.label}
                    to={t.to}
                    className="group flex w-[66px] shrink-0 snap-start flex-col items-center gap-2"
                >
                    <span className="block h-[62px] w-[62px] rounded-full shadow-[0_8px_18px_-10px_rgba(90,31,110,0.55)] ring-2 ring-white transition-transform duration-200 group-active:scale-90 group-hover:-translate-y-0.5">
                        <img src={t.image} alt="" loading="lazy" width="62" height="62" className="h-full w-full rounded-full" />
                    </span>
                    <span className="line-clamp-2 text-center text-[11.5px] font-medium leading-tight text-gray-700 group-hover:text-[#843D9B]">
                        {t.label}
                    </span>
                </Link>
            ))}
        </div>
    </section>
);

export default ExploreMore;
