import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Truck, Crown, BadgeCheck } from 'lucide-react';

/** Rotating hero cards: bold headline left, photo right, round badge in the corner. */
const SLIDES = [
    {
        id: 'doorstep',
        tag: 'Doorstep pickup',
        tagIcon: Truck,
        title: ['Perfect fit?', 'We stitch it!'],
        sub: 'Pick a style, share measurements and get it stitched by a verified tailor.',
        cta: 'Book Now',
        to: '/user/services',
        image: '/landing/opt/womens-wear.jpg',
        badge: ['7-DAY', 'FREE FIX'],
        from: '#843D9B',
        to_: '#5A1F6E',
    },
    {
        id: 'bridal',
        tag: 'Bridal studio',
        tagIcon: Crown,
        title: ['Your big day,', 'made to measure'],
        sub: 'Lehengas, blouses and sherwanis crafted by bridal specialists.',
        cta: 'Explore Bridal',
        to: '/user/tailors?service=bridal',
        image: '/landing/opt/bridal-wear.jpg',
        badge: ['BRIDAL', 'EXPERTS'],
        from: '#9C2C58',
        to_: '#5E1634',
    },
    {
        id: 'tailors',
        tag: 'Verified tailors',
        tagIcon: BadgeCheck,
        title: ['Master tailors,', 'right near you'],
        sub: 'Compare ratings, prices and work before you book.',
        cta: 'Find a Tailor',
        to: '/user/tailors',
        image: '/landing/opt/artisan.jpg',
        badge: ['100%', 'VERIFIED'],
        from: '#3E2A78',
        to_: '#241650',
    },
];

const HomeHero = () => {
    const navigate = useNavigate();
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5500);
        return () => clearInterval(t);
    }, [index]);

    const slide = SLIDES[index];
    const TagIcon = slide.tagIcon;

    return (
        <div className="px-4 pt-1 md:px-6">
            <div className="relative h-[210px] overflow-hidden rounded-[26px] shadow-[0_18px_34px_-20px_rgba(74,21,96,0.7)] sm:h-[250px]">
                <AnimatePresence initial={false} mode="popLayout">
                    <motion.button
                        key={slide.id}
                        type="button"
                        onClick={() => navigate(slide.to)}
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -50) setIndex((index + 1) % SLIDES.length);
                            else if (info.offset.x > 50) setIndex((index - 1 + SLIDES.length) % SLIDES.length);
                        }}
                        className="absolute inset-0 text-left"
                        style={{ background: `linear-gradient(135deg, ${slide.from}, ${slide.to_})` }}
                        aria-label={`${slide.title.join(' ')} - ${slide.cta}`}
                    >
                        {/* faint rings for depth */}
                        <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-white/10" />
                        <span className="pointer-events-none absolute -bottom-20 left-24 h-44 w-44 rounded-full bg-white/5" />

                        {/* Photo */}
                        <span className="absolute bottom-0 right-0 top-0 w-[44%] overflow-hidden">
                            <img
                                src={slide.image}
                                alt=""
                                draggable={false}
                                className="h-full w-full select-none object-cover object-[50%_20%]"
                                style={{
                                    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 35%)',
                                    maskImage: 'linear-gradient(90deg, transparent 0%, #000 35%)',
                                }}
                            />
                        </span>

                        {/* Round badge */}
                        <span className="absolute bottom-4 right-4 flex h-[62px] w-[62px] flex-col items-center justify-center rounded-full bg-white text-center shadow-lg ring-4 ring-white/30">
                            <span className="text-[13px] font-extrabold leading-none text-[#843D9B]">{slide.badge[0]}</span>
                            <span className="mt-0.5 text-[7.5px] font-bold leading-none tracking-wide text-gray-500">{slide.badge[1]}</span>
                        </span>

                        {/* Copy */}
                        <span className="relative flex h-full w-[62%] flex-col justify-center pl-5 pr-2">
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white ring-1 ring-white/20">
                                <TagIcon size={11} /> {slide.tag}
                            </span>
                            <span className="mt-2 block text-[24px] font-extrabold leading-[1.1] text-white sm:text-[30px]">
                                {slide.title[0]}
                                <br />
                                {slide.title[1]}
                            </span>
                            <span className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-white/80">{slide.sub}</span>
                            <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-2 text-[12.5px] font-bold text-[#5A1F6E] shadow-md">
                                {slide.cta} <ChevronRight size={15} />
                            </span>
                        </span>
                    </motion.button>
                </AnimatePresence>

                <div className="absolute bottom-3 left-5 z-10 flex gap-1.5">
                    {SLIDES.map((s, i) => (
                        <button
                            key={s.id}
                            type="button"
                            aria-label={`Go to banner ${i + 1}`}
                            onClick={() => setIndex(i)}
                            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/45'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HomeHero;
