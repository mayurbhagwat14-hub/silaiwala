import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, Award } from 'lucide-react';
import api from '../../../../utils/api';
import { BANNER_LOCATIONS, resolveBannerImageUrl } from '../../../../utils/bannerImage';
import { getImageUrl } from '../../../../utils/imageUrl';

const SERIF = "'Playfair Display', Georgia, serif";

// Shown until (or if) the admin has no active home banners.
// Banner fields: badge → italic line, title → bold line, subtitle → small service line.
const FALLBACK = [
    {
        _id: 'fallback',
        badge: 'Your Perfect Fit',
        title: 'Just a Tap Away',
        subtitle: 'Online Stitching • Bridal Wear • Embroidery & More',
        image: '/images/home/banner-perfect-fit.jpg',
        local: true, // served by the frontend, not the API
    },
];

const FEATURES = [
    { icon: ShieldCheck, label: 'Verified\nTailors' },
    { icon: Truck, label: 'Doorstep\nPickup & Delivery' },
    { icon: Award, label: 'Premium\nQuality' },
];

const bannerImage = ({ image, local }) => {
    if (!image) return '';
    if (local) return image;
    return /^(https?:|data:image\/)/.test(image) ? resolveBannerImageUrl(image) : getImageUrl(image);
};

/** Banner card: copy, CTA and trust features on the left over a soft fade, photo filling the right. */
const HomeHero = () => {
    const navigate = useNavigate();
    const [slides, setSlides] = useState(FALLBACK);
    const [index, setIndex] = useState(0);

    useEffect(() => {
        let active = true;
        api.get('/cms/banners/active', { params: { location: BANNER_LOCATIONS.HOME } })
            .then((res) => {
                const list = (res.data?.data || []).filter((b) => b?.image && b?.title);
                if (active && list.length) {
                    setSlides(list);
                    setIndex(0);
                }
            })
            .catch(() => {});
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (slides.length < 2) return undefined;
        const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500);
        return () => clearInterval(t);
    }, [index, slides.length]);

    const slide = slides[index % slides.length];

    return (
        <div className="px-4 pt-1 md:px-6">
            <div className="relative h-[238px] overflow-hidden rounded-[22px] bg-gradient-to-br from-[#F8EEFC] via-[#EEDDF7] to-[#E2C9F0] shadow-[0_16px_32px_-22px_rgba(74,21,96,0.7)] ring-1 ring-white/70 sm:h-[290px]">
                <AnimatePresence initial={false} mode="popLayout">
                    <motion.div
                        key={slide._id}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        drag={slides.length > 1 ? 'x' : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -50) setIndex((index + 1) % slides.length);
                            else if (info.offset.x > 50) setIndex((index - 1 + slides.length) % slides.length);
                        }}
                        className="absolute inset-0"
                    >
                        {/* Photo fills the right side and fades into the lavender on the left */}
                        <img
                            src={bannerImage(slide)}
                            alt=""
                            draggable={false}
                            className="absolute inset-y-0 right-0 h-full w-[62%] select-none object-cover object-[50%_18%]"
                            style={{
                                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 22%, #000 45%)',
                                maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.6) 22%, #000 45%)',
                            }}
                        />

                        {/* Copy */}
                        <div className="relative flex h-full w-[60%] flex-col justify-center pl-4 pr-1 sm:w-[55%] sm:pl-7">
                            {slide.badge && (
                                <p
                                    className="line-clamp-1 text-[21px] font-medium italic leading-tight text-[#1A1523] sm:text-[28px]"
                                    style={{ fontFamily: SERIF }}
                                >
                                    {slide.badge}
                                </p>
                            )}
                            <h2 className="line-clamp-2 text-[22px] font-extrabold italic leading-[1.1] text-[#1A1523] sm:text-[30px]">
                                {slide.title}
                            </h2>
                            {slide.subtitle && (
                                <p className="mt-1.5 line-clamp-2 text-[10px] font-semibold leading-snug text-[#2A1F33] sm:text-[12px]">
                                    {slide.subtitle}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={() => navigate('/user/services')}
                                className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(90,26,120,0.9)] transition-transform active:scale-95 sm:px-5 sm:py-2.5 sm:text-[13.5px]"
                            >
                                Book a Service <ArrowRight size={15} />
                            </button>

                            <div className="mt-3.5 flex items-start">
                                {FEATURES.map(({ icon: FeatureIcon, label }, i) => (
                                    <div
                                        key={label}
                                        className={`flex flex-col items-center px-2 text-center first:pl-0 ${i > 0 ? 'border-l border-[#D3BDE0]' : ''}`}
                                    >
                                        <FeatureIcon size={16} strokeWidth={1.8} className="text-[#5A1A78]" />
                                        <span className="mt-1 whitespace-pre-line text-[7.5px] font-semibold leading-tight text-[#2A1F33] sm:text-[9.5px]">
                                            {label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Dots */}
                {slides.length > 1 && (
                    <div className="absolute bottom-3 right-4 z-10 flex gap-1.5">
                        {slides.map((s, i) => (
                            <button
                                key={s._id}
                                type="button"
                                aria-label={`Go to banner ${i + 1}`}
                                onClick={() => setIndex(i)}
                                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HomeHero;
