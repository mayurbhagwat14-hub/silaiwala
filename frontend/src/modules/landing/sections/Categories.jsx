import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, LayoutGrid } from 'lucide-react';
import api from '../../../utils/api';
import { SOCKET_URL } from '../../../config/constants';
import { Reveal, SectionHeading, Shine } from '../components/landingShared';
import { SANS, fadeUp, optimizedImg } from '../components/landingTokens';

/* Shown when the CMS list can't be loaded. Admin → CMS → Landing Categories overrides it. */
const DEFAULT_CATEGORIES = [
  { title: "Women's Wear", desc: 'Lehengas, suits, blouses & kurtis', img: '/landing/category_womens_wear.png', link: '/user/services' },
  { title: "Men's Wear", desc: 'Bandhgalas, kurtas, shirts & suits', img: '/landing/category_mens_wear.png', link: '/user/services' },
  { title: 'Kids Wear', desc: 'Festive outfits for little ones', img: '/landing/category_kids_wear.png', link: '/user/services' },
  { title: 'Fabrics', desc: 'Premium fabrics, delivered to your tailor', img: '/landing/opt/fabrics.jpg', link: '/user/store' },
];

const resolveCatImg = (img) => {
  if (!img) return '';
  if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('/landing/')) return optimizedImg(img);
  const separator = img.startsWith('/') ? '' : '/';
  return `${SOCKET_URL}${separator}${img}`;
};

/** Compact category card (the scatter motion lives on its wrapper). */
const CategoryCard = ({ cat, index, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group relative block aspect-[3/4] w-full overflow-hidden rounded-[22px] bg-[#EFE6F3] text-left shadow-[0_24px_50px_-28px_rgba(42,15,56,0.55)] ring-1 ring-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#843D9B]"
  >
    <img
      src={resolveCatImg(cat.img)}
      alt={cat.title}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
      onError={(e) => {
        const fallback = DEFAULT_CATEGORIES[index % DEFAULT_CATEGORIES.length].img;
        if (!e.currentTarget.dataset.fallback) {
          e.currentTarget.dataset.fallback = '1';
          e.currentTarget.src = optimizedImg(fallback);
        }
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#1F0B2B]/80 via-[#1F0B2B]/10 to-transparent" />

    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 sm:p-4">
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-semibold leading-tight text-white sm:text-[18px]" style={{ fontFamily: SANS }}>
          {cat.title}
        </h3>
        {cat.desc && (
          <p className="mt-0.5 line-clamp-1 text-[10.5px] text-white/75 sm:text-[12px]">{cat.desc}</p>
        )}
      </div>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#843D9B] transition-transform duration-300 group-hover:rotate-45 sm:h-9 sm:w-9">
        <ArrowUpRight size={16} />
      </span>
    </div>
  </button>
);

/* Each card starts gathered in a loose deck at the grid's centre and scatters to its own
   slot as the section scrolls into view (progress 0 → 1). */
const DECK_TILT = [-9, 7, -4, 10, -7, 4, -10, 6];

const ScatterItem = ({ progress, offset, index, total, children }) => {
  const tilt = DECK_TILT[index % DECK_TILT.length];
  const x = useTransform(progress, [0, 1], [offset.x, 0]);
  const y = useTransform(progress, [0, 1], [offset.y + index * -4, 0]);
  const rotate = useTransform(progress, [0, 1], [tilt, 0]);
  const scale = useTransform(progress, [0, 1], [0.9, 1]);
  return (
    <motion.div style={{ x, y, rotate, scale, zIndex: total - index }} className="relative will-change-transform">
      {children}
    </motion.div>
  );
};

const Categories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    let alive = true;
    api
      .get('/cms/landing-categories')
      .then((res) => {
        if (alive && res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setCategories(res.data.data);
        }
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      alive = false;
    };
  }, []);

  const count = categories.length;
  // 3/6/9 → rows of 3; otherwise rows of 4 (2 per row on phones)
  const threeUp = count % 3 === 0 && count !== 12;
  const cols = threeUp ? 'sm:grid-cols-3' : 'sm:grid-cols-4';
  const maxW = threeUp ? 'max-w-[780px]' : 'max-w-[1000px]';

  // Scroll progress for the deck → scatter motion
  const reduceMotion = useReducedMotion();
  const gridRef = useRef(null);
  const itemRefs = useRef([]);
  const [offsets, setOffsets] = useState([]);
  const { scrollYProgress } = useScroll({ target: gridRef, offset: ['start 0.95', 'start 0.3'] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  // Distance from each card's slot to the grid centre = where it sits while stacked
  useLayoutEffect(() => {
    const measure = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const g = grid.getBoundingClientRect();
      const cx = g.left + g.width / 2;
      const cy = g.top + g.height / 2;
      setOffsets(
        itemRefs.current.slice(0, count).map((el) => {
          if (!el) return { x: 0, y: 0 };
          // offsetLeft/Top ignore the current transform, so the slot is measured, not the animated card
          const left = g.left + el.offsetLeft;
          const top = g.top + el.offsetTop;
          return { x: cx - (left + el.offsetWidth / 2), y: cy - (top + el.offsetHeight / 2) };
        })
      );
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [count]);

  return (
    <section id="categories" className="relative scroll-mt-24 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            align="left"
            eyebrow="Explore categories"
            icon={LayoutGrid}
            title="Find your"
            accent="perfect style"
            lede="From timeless traditional wear to modern silhouettes, tailored for every occasion."
          />
          <motion.div variants={fadeUp} custom={1} className="shrink-0">
            <Link
              to="/user/services"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#843D9B] px-6 py-3 text-[14px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(132,61,155,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#74338a]"
            >
              <Shine />
              Explore all
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </Reveal>

        <div ref={gridRef} className={`relative mx-auto mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-5 ${cols} ${maxW}`}>
          {categories.map((cat, i) => {
            const card = (
              <CategoryCard cat={cat} index={i} onOpen={() => navigate(cat.link || '/user/services')} />
            );
            return (
              <div key={cat._id || cat.title || i} ref={(el) => { itemRefs.current[i] = el; }}>
                {reduceMotion ? (
                  card
                ) : (
                  <ScatterItem progress={progress} offset={offsets[i] || { x: 0, y: 0 }} index={i} total={count}>
                    {card}
                  </ScatterItem>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
