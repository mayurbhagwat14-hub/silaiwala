import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { HomeSection, SectionTitle } from './homeUi';
import { SERIF, EASE } from './homeTokens';

const pop = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: (i = 0) => ({ opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, delay: i * 0.07, ease: EASE } }),
};

/** Large photo tile with a soft dark fade for legible text. */
const PhotoTile = ({ title, accent, caption, image, imagePos = 'center', onClick, className = '', index }) => (
  <motion.button
    type="button"
    variants={pop}
    custom={index}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={`group relative overflow-hidden rounded-[24px] bg-[#EFE6F3] text-left shadow-[0_18px_36px_-24px_rgba(42,15,56,0.75)] ${className}`}
  >
    <img
      src={image}
      alt=""
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.1s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
      style={{ objectPosition: imagePos }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#1F0B2B]/85 via-[#1F0B2B]/15 to-transparent" />
    <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-[#843D9B] backdrop-blur transition-transform duration-300 group-hover:rotate-45">
      <ArrowUpRight size={15} />
    </span>
    <span className="absolute inset-x-0 bottom-0 p-3.5">
      {caption && <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">{caption}</span>}
      <span className="mt-0.5 block text-[19px] font-semibold leading-[1.1] text-white" style={{ fontFamily: SERIF }}>
        {title} {accent && <em className="font-medium italic text-[#F1D6FA]">{accent}</em>}
      </span>
    </span>
  </motion.button>
);

const ExploreBento = () => {
  const navigate = useNavigate();
  const go = (path) => () => navigate(path);

  return (
    <HomeSection>
      <SectionTitle title="Explore" accent="Sewzella" subtitle="Everything you need, made to measure" to="/user/what-we-offer" linkLabel="View all" />
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        className="grid grid-cols-2 gap-3"
      >
        <PhotoTile
          index={0}
          className="row-span-2 min-h-[260px] sm:min-h-[320px]"
          caption="Made for you"
          title="Custom"
          accent="stitching"
          image="/landing/opt/womens-wear.jpg"
          imagePos="50% 15%"
          onClick={go('/user/services')}
        />
        <PhotoTile
          index={1}
          className="min-h-[124px] sm:min-h-[154px]"
          caption="Near you"
          title="Find"
          accent="tailors"
          image="/landing/opt/mens-wear.jpg"
          imagePos="50% 20%"
          onClick={go('/user/tailors')}
        />
        <PhotoTile
          index={2}
          className="min-h-[124px] sm:min-h-[154px]"
          caption="Big day"
          title="Bridal"
          accent="studio"
          image="/landing/opt/bridal-wear.jpg"
          imagePos="50% 20%"
          onClick={go('/user/tailors?service=bridal')}
        />
      </motion.div>
    </HomeSection>
  );
};

export default ExploreBento;
