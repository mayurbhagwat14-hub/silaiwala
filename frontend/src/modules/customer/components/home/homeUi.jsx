import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { SERIF, EASE } from './homeTokens';

/** Wrapper that reveals a home section once it scrolls into view. */
export const HomeSection = ({ children, className = '', delay = 0 }) => (
  <motion.section
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.6, delay, ease: EASE }}
    className={`px-4 md:px-6 ${className}`}
  >
    {children}
  </motion.section>
);

/** Serif section title with an optional "see all" link. */
export const SectionTitle = ({ title, accent, subtitle, to, linkLabel = 'See all' }) => (
  <div className="mb-3.5 flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className="text-[20px] font-semibold leading-tight text-[#1A1523] sm:text-[22px]" style={{ fontFamily: SERIF }}>
        {title} {accent && <em className="font-medium italic text-[#843D9B]">{accent}</em>}
      </h2>
      {subtitle && <p className="mt-0.5 text-[12px] font-medium text-[#8A8293]">{subtitle}</p>}
    </div>
    {to && (
      <Link
        to={to}
        className="group inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F4F3F6] px-3 py-1.5 text-[11.5px] font-semibold text-[#1A1523] ring-1 ring-[#ECEAEF] transition-colors hover:bg-[#ECEAEF]"
      >
        {linkLabel}
        <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    )}
  </div>
);
