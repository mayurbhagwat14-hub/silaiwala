import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { BANNER_LOCATIONS, isUploadedBannerImage, resolveBannerImageUrl } from '../../../utils/bannerImage';
import { getPageCache, setPageCache } from '../utils/pageCache';

const CACHE_KEY = 'partner-banners';
const DEFAULT_GRADIENT = 'bg-gradient-to-br from-[#843D9B] to-[#ff85a2]';

/**
 * Promotional banners for the partner dashboard, managed by admin in
 * CMS → Banners with placement "Partner App - Dashboard Banner".
 * Renders nothing when admin has no active banner for this placement.
 */
const PartnerBanners = () => {
    const [banners, setBanners] = useState(() => getPageCache('public', CACHE_KEY) || []);

    useEffect(() => {
        let cancelled = false;
        api.get('/cms/banners/active', { params: { location: BANNER_LOCATIONS.PARTNER_DASHBOARD } })
            .then((res) => {
                if (cancelled || !res.data?.success || !Array.isArray(res.data.data)) return;
                const list = res.data.data.filter((b) => isUploadedBannerImage(b.image));
                setBanners(list);
                setPageCache('public', CACHE_KEY, list);
            })
            .catch((error) => {
                if (error?.name !== 'CanceledError') console.error('Failed to fetch partner banners:', error);
            });
        return () => { cancelled = true; };
    }, []);

    if (banners.length === 0) return null;

    return (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
            {banners.map((banner) => (
                <div
                    key={banner._id}
                    className={`${banner.color || DEFAULT_GRADIENT} snap-center shrink-0 w-full rounded-2xl overflow-hidden relative flex items-stretch min-h-[120px] md:min-h-[150px] shadow-sm`}
                >
                    <div className="relative z-10 flex-1 min-w-0 p-4 md:p-6 flex flex-col justify-center">
                        {banner.badge && (
                            <span className="self-start text-[9px] font-semibold uppercase tracking-wider text-white bg-white/20 px-2 py-0.5 rounded-full mb-2">
                                {banner.badge}
                            </span>
                        )}
                        <h3 className="text-lg md:text-2xl font-bold text-white leading-tight">{banner.title}</h3>
                        {banner.subtitle && (
                            <p className="text-xs md:text-sm text-white/85 mt-1 leading-snug line-clamp-2">{banner.subtitle}</p>
                        )}
                    </div>
                    <div className="w-[40%] shrink-0 relative">
                        <img
                            src={resolveBannerImageUrl(banner.image)}
                            alt={banner.title}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PartnerBanners;
