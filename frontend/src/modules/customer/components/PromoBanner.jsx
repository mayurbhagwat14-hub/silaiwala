import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const SERIF = "'Playfair Display', Georgia, serif";

/**
 * Home hero slides, designed in code so they always fit the 1.9:1 frame exactly
 * (no stretched or cropped artwork). Each slide: text on the left, photo on the right
 * fading into the slide colour.
 */
const SLIDES = [
    {
        id: 'doorstep',
        kicker: 'Doorstep tailoring',
        title: ['Stitched to fit,', 'delivered home'],
        sub: 'Pickup · Measurement · Delivery',
        cta: 'Book now',
        to: '/user/services',
        image: '/landing/opt/womens-wear.jpg',
        bg: '#18141D',
        glow: 'rgba(160,110,190,0.30)',
    },
    {
        id: 'bridal',
        kicker: 'Bridal studio',
        title: ['Your bridal look,', 'made to measure'],
        sub: 'Lehenga · Blouse · Sherwani',
        cta: 'Explore bridal',
        to: '/user/tailors?service=bridal',
        image: '/landing/opt/bridal-wear.jpg',
        bg: '#5E1620',
        glow: 'rgba(245,190,120,0.30)',
    },
    {
        id: 'tailors',
        kicker: 'Master tailors',
        title: ['Expert tailors,', 'right near you'],
        sub: 'Verified · Rated · Trusted',
        cta: 'Find a tailor',
        to: '/user/tailors',
        image: '/landing/opt/artisan.jpg',
        bg: '#1F2B26',
        glow: 'rgba(230,190,110,0.28)',
    },
];

const Slide = ({ slide, onOpen }) => (
    <button
        type="button"
        onClick={() => onOpen(slide.to)}
        aria-label={`${slide.title.join(' ')} — ${slide.cta}`}
        className="relative block h-full w-full overflow-hidden text-left"
        style={{ backgroundColor: slide.bg }}
    >
        {/* Photo on the right, fading into the slide colour */}
        <img
            src={slide.image}
            alt=""
            draggable={false}
            loading="eager"
            decoding="async"
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-[60%] select-none object-cover object-[50%_18%]"
            style={{
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 28%, #000 62%)',
                maskImage: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 28%, #000 62%)',
            }}
        />
        <div
            className="absolute -left-10 -top-16 h-48 w-48 rounded-full blur-2xl"
            style={{ background: slide.glow }}
        />

        {/* Copy */}
        <div className="relative flex h-full w-[64%] flex-col justify-center px-4 sm:px-7">
            <span className="mb-1.5 inline-flex w-fit items-center rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/90 ring-1 ring-white/20 sm:text-[11px]">
                {slide.kicker}
            </span>
            <h2
                className="text-[19px] font-semibold leading-[1.12] text-white sm:text-[30px]"
                style={{ fontFamily: SERIF }}
            >
                {slide.title[0]}
                <br />
                <span className="italic text-[#F6D9A8]">{slide.title[1]}</span>
            </h2>
            <p className="mt-1.5 text-[10.5px] font-medium text-white/75 sm:text-[13px]">{slide.sub}</p>
            <span className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11.5px] font-bold text-[#2A1636] shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)] sm:text-[13px]">
                {slide.cta} <ArrowRight size={13} />
            </span>
        </div>
    </button>
);

const PromoBanner = () => {
    const navigate = useNavigate();
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    useEffect(() => {
        const timer = setInterval(() => {
            setDirection(1);
            setIndex((prev) => (prev + 1) % SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [index]);

    const goTo = (i) => {
        setDirection(i > index ? 1 : -1);
        setIndex(i);
    };

    const slide = SLIDES[index];

    return (
        <div className="px-4 pt-3 pb-2 relative z-40">
            <div className="relative w-full aspect-[1.9/1] overflow-hidden rounded-2xl sm:rounded-3xl shadow-[0_14px_30px_-18px_rgba(20,16,26,0.55)] bg-[#18141D]">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={slide.id}
                        custom={direction}
                        initial={{ x: direction > 0 ? '100%' : '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: direction > 0 ? '-100%' : '100%' }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -50) goTo((index + 1) % SLIDES.length);
                            else if (info.offset.x > 50) goTo((index - 1 + SLIDES.length) % SLIDES.length);
                        }}
                        className="absolute inset-0"
                    >
                        <Slide slide={slide} onOpen={navigate} />
                    </motion.div>
                </AnimatePresence>

                <div className="absolute bottom-2.5 left-4 z-20 flex gap-1.5 sm:left-7">
                    {SLIDES.map((s, i) => (
                        <button
                            key={s.id}
                            type="button"
                            aria-label={`Go to banner ${i + 1}`}
                            onClick={() => goTo(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PromoBanner;
