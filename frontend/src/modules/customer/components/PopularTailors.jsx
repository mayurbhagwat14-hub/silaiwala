import React from 'react';
import { Star, MapPin, ChevronRight, BadgeCheck, Sparkles, Store, Scissors, SlidersHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useTailorStore from '../../../store/tailorStore';
import useLocationStore from '../../../store/locationStore';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { HomeSection } from './home/homeUi';
import { SERIF, rise } from './home/homeTokens';

const TailorSkeleton = () => (
  <div className="overflow-hidden rounded-[24px] bg-white ring-1 ring-[#EFE8F4]">
    <div className="h-44 animate-pulse bg-[#F3EEF6]" />
    <div className="space-y-2 p-4">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#F3EEF6]" />
      <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#F3EEF6]" />
    </div>
  </div>
);

/**
 * Shows exactly the photo the tailor uploaded — never a stock/placeholder photo.
 * A blurred copy fills the frame so logos and portrait shots both look intentional.
 */
const ShopPhoto = ({ src, name }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  const initial = (name || 'T').trim().charAt(0).toUpperCase();
  if (!src || failed) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#843D9B] to-[#4A1560]">
        <Scissors size={90} className="absolute -bottom-4 -right-3 rotate-12 text-white/10" />
        <span className="text-[54px] font-semibold text-white/90" style={{ fontFamily: SERIF }}>{initial}</span>
      </div>
    );
  }
  return (
    <>
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl" />
      <img
        src={src}
        alt={name || 'Tailor shop'}
        loading="lazy"
        onError={() => setFailed(true)}
        className="relative h-full w-full object-contain"
      />
    </>
  );
};

/** Big listing card: photo on top, details below — only real data, no placeholder ratings or prices. */
const TailorCard = ({ tailor, index, onOpen }) => {
  const rating = Number(tailor.rating) || 0;
  const reviews = Number(tailor.totalReviews) || 0;
  const hasReviews = reviews > 0 && rating > 0;
  const basePrice = Number(tailor.basePrice) || 0;
  const isVerified = tailor.registrationStatus === 'verified' || tailor.isVerified === true;
  const specialities = (Array.isArray(tailor.specializations) ? tailor.specializations : [])
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 3);
  const place = tailor.location?.city || tailor.location?.address?.split(',')[0] || '';
  const distance = tailor.distance ? String(tailor.distance).replace(' away', '') : '';
  const distanceNum = distance.replace(/\s*km/i, '');
  const name = tailor.shopName || tailor.user?.name || 'Tailor';

  return (
    <motion.div
      layout
      variants={rise}
      custom={index}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ layout: { type: 'spring', stiffness: 380, damping: 34 } }}
    >
      <Link
        to={`/user/tailor/${tailor._id}`}
        onClick={(e) => onOpen(e, tailor._id)}
        className="group block overflow-hidden rounded-[24px] bg-white ring-1 ring-[#EEECF1] shadow-[0_14px_30px_-22px_rgba(20,16,26,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.99]"
      >
        <div className="relative h-44 overflow-hidden bg-[#F4EEF8] sm:h-48">
          <ShopPhoto src={tailor.user?.profileImage} name={name} />
          {specialities[0] && (
            <span className="absolute left-3 top-3 max-w-[60%] truncate rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {specialities[0]}
            </span>
          )}
          {distance && (
            <span className="absolute right-3 top-3 flex flex-col items-center rounded-xl bg-white/95 px-2.5 py-1 leading-none shadow-sm">
              <span className="text-[13px] font-extrabold text-gray-900">{distanceNum}</span>
              <span className="mt-0.5 text-[8px] font-bold uppercase text-gray-500">km</span>
            </span>
          )}
          {isVerified && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-[#843D9B] shadow-sm">
              <BadgeCheck size={13} className="fill-[#843D9B] text-white" /> Verified
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 truncate text-[16px] font-semibold leading-tight text-gray-900">{name}</h3>
            {hasReviews ? (
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-[12px] font-bold text-white">
                {rating.toFixed(1)} <Star size={11} className="fill-white" />
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#843D9B]/10 px-2 py-0.5 text-[11px] font-bold text-[#843D9B]">
                <Sparkles size={11} /> New
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-[13px] text-gray-500">
            {specialities.length ? specialities.join(' · ') : 'Custom stitching & alterations'}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-gray-200 pt-3 text-[12px]">
            <span className="flex min-w-0 items-center gap-1 truncate text-gray-500">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{place || 'Near you'}{hasReviews ? ` · ${reviews} review${reviews > 1 ? 's' : ''}` : ''}</span>
            </span>
            {basePrice > 0 ? (
              <span className="shrink-0 font-semibold text-gray-900">from ₹{basePrice.toLocaleString('en-IN')}</span>
            ) : (
              <span className="flex shrink-0 items-center gap-0.5 font-semibold text-[#843D9B]">
                View shop <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const PopularTailors = () => {
  const { tailors, fetchTailors, isLoading } = useTailorStore();
  const { coordinates } = useLocationStore();
  const { requireAuth } = useRequireAuth();
  const navigate = useNavigate();

  const handleTailorClick = (e, tailorId) => {
    e.preventDefault();
    if (!requireAuth('Please login to view tailor shop details')) return;
    navigate(`/user/tailor/${tailorId}`);
  };

  const lat = coordinates?.lat;
  const lng = coordinates?.lng;

  React.useEffect(() => {
    const params = { strictRadius: true };
    if (lat && lng) {
      params.lat = lat;
      params.lng = lng;
    }
    fetchTailors(params);
  }, [fetchTailors, lat, lng]);

  const [filter, setFilter] = React.useState('all');

  const safeTailors = Array.isArray(tailors) ? tailors : [];
  const loading = isLoading && safeTailors.length === 0;

  // Every filter has a real, distinct meaning on the real list (no invented data):
  //   all     → everyone, in the order the API returns (nearest first)
  //   nearby  → only tailors within NEARBY_KM, closest first
  //   top     → only tailors that actually have reviews, best rated first
  //   bridal  → bridal / lehenga / wedding specialists
  const NEARBY_KM = 5;
  const kmOf = (t) => {
    const km = Number(t.distanceKm);
    if (Number.isFinite(km)) return km;
    const parsed = parseFloat(String(t.distance || '')); // "2.6 km away"
    return Number.isFinite(parsed) ? parsed : Infinity;
  };
  const isBridal = (t) =>
    (Array.isArray(t.specializations) ? t.specializations : []).some((s) => /bridal|lehenga|wedding/i.test(String(s)));
  const hasReviews = (t) => Number(t.totalReviews) > 0 && Number(t.rating) > 0;

  const filtered = React.useMemo(() => {
    const byFilter = {
      all: [...safeTailors],
      nearby: safeTailors.filter((t) => kmOf(t) <= NEARBY_KM).sort((a, b) => kmOf(a) - kmOf(b)),
      top: safeTailors
        .filter(hasReviews)
        .sort((a, b) => Number(b.rating) - Number(a.rating) || Number(b.totalReviews) - Number(a.totalReviews)),
      bridal: safeTailors.filter(isBridal),
    };
    return byFilter;
  }, [safeTailors]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayTailors = (filtered[filter] || filtered.all).slice(0, 5);

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'nearby', label: `Within ${NEARBY_KM} km` },
    { id: 'top', label: 'Top rated' },
    { id: 'bridal', label: 'Bridal' },
  ];

  const EMPTY = {
    nearby: `No tailors within ${NEARBY_KM} km yet`,
    top: 'No rated tailors yet — be the first to review!',
    bridal: 'No bridal specialists nearby yet',
  };

  return (
    <HomeSection>
      {safeTailors.length > 0 && (
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 md:-mx-6 md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            to="/user/tailors"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-gray-800 ring-1 ring-[#E6E3EA]"
          >
            <SlidersHorizontal size={15} /> Filters
          </Link>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`relative isolate shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                filter === f.id ? 'text-white' : 'bg-white text-gray-700 ring-1 ring-[#E6E3EA]'
              }`}
            >
              {filter === f.id && (
                <motion.span
                  layoutId="tailor-filter"
                  className="absolute inset-0 -z-10 rounded-full bg-[#843D9B]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            {safeTailors.length > 0 ? `${safeTailors.length} tailor${safeTailors.length > 1 ? 's' : ''} near you` : 'Tailors near you'}
          </p>
          <h2 className="mt-0.5 text-[18px] font-semibold leading-tight text-gray-900">Featured Tailors</h2>
        </div>
        <Link to="/user/tailors" className="flex shrink-0 items-center gap-0.5 text-[12.5px] font-semibold text-[#843D9B]">
          See all <ChevronRight size={15} />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[0, 1].map((i) => <TailorSkeleton key={i} />)}
        </div>
      ) : safeTailors.length > 0 && displayTailors.length === 0 ? (
        <div className="rounded-[22px] bg-white px-5 py-6 text-center ring-1 ring-[#EFE8F4]">
          <p className="text-[13.5px] font-semibold text-[#1A1523]">{EMPTY[filter] || 'No tailors match this filter'}</p>
          <button type="button" onClick={() => setFilter('all')} className="mt-2 text-[12px] font-semibold text-[#843D9B]">
            Show all tailors
          </button>
        </div>
      ) : displayTailors.length === 0 ? (
        <div className="flex flex-col items-center rounded-[22px] bg-white px-6 py-8 text-center ring-1 ring-[#EFE8F4]">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E9F8] text-[#843D9B]">
            <Store size={22} />
          </span>
          <p className="mt-3 text-[14px] font-semibold text-[#1A1523]">No tailors in this area yet</p>
          <p className="mt-1 text-[12px] text-[#6B6575]">Try changing your location, or browse all tailors.</p>
          <Link to="/user/tailors" className="mt-4 rounded-full bg-[#843D9B] px-5 py-2 text-[12px] font-bold text-white">
            Browse tailors
          </Link>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AnimatePresence mode="sync" initial={false}>
            {displayTailors.map((tailor, index) => (
              <TailorCard key={tailor._id} tailor={tailor} index={index} onOpen={handleTailorClick} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </HomeSection>
  );
};

export default PopularTailors;
