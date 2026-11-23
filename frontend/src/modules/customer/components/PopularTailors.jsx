import React from 'react';
import { Star, MapPin, ChevronRight, BadgeCheck, Sparkles, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useTailorStore from '../../../store/tailorStore';
import useLocationStore from '../../../store/locationStore';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { HomeSection, SectionTitle } from './home/homeUi';
import { SERIF, rise } from './home/homeTokens';

const TailorSkeleton = () => (
  <div className="flex gap-3 rounded-[22px] bg-white p-3 ring-1 ring-[#EFE8F4]">
    <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-2xl bg-[#F3EEF6]" />
    <div className="flex-1 space-y-2 py-1">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#F3EEF6]" />
      <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#F3EEF6]" />
      <div className="h-3 w-1/3 animate-pulse rounded-full bg-[#F3EEF6]" />
    </div>
  </div>
);

/** Shows exactly the photo the tailor uploaded — never a stock/placeholder photo. */
const ShopPhoto = ({ src, name }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  const initial = (name || 'T').trim().charAt(0).toUpperCase();
  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#F4F3F6] to-[#E8E5EC]">
        <span className="text-[34px] font-semibold text-[#1A1523]" style={{ fontFamily: SERIF }}>{initial}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name || 'Tailor shop'}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain"
    />
  );
};

/** Only real data is shown — no placeholder ratings, distances or prices. */
const TailorCard = ({ tailor, index, onOpen }) => {
  const rating = Number(tailor.rating) || 0;
  const reviews = Number(tailor.totalReviews) || 0;
  const hasReviews = reviews > 0 && rating > 0;
  const basePrice = Number(tailor.basePrice) || 0;
  const isVerified = tailor.registrationStatus === 'verified' || tailor.isVerified === true;
  const topRated = hasReviews && rating >= 4.5 && reviews >= 5;
  const specialities = (Array.isArray(tailor.specializations) ? tailor.specializations : []).filter(Boolean).slice(0, 2);

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
        className="group block rounded-[24px] bg-white p-3.5 ring-1 ring-[#ECEAEF] shadow-[0_14px_30px_-24px_rgba(20,16,26,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-24px_rgba(20,16,26,0.5)] active:scale-[0.99]"
      >
       <div className="flex gap-3.5">
        <div className="relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded-[18px] bg-white ring-1 ring-[#ECEAEF]">
          <ShopPhoto src={tailor.user?.profileImage} name={tailor.shopName || tailor.user?.name} />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[17px] font-semibold text-[#1A1523]" style={{ fontFamily: SERIF }}>
              {tailor.shopName || tailor.user?.name || 'Tailor'}
            </h3>
            {isVerified && <BadgeCheck size={16} className="shrink-0 fill-[#843D9B] text-white" aria-label="Verified" />}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-[#6B6575]">
            {hasReviews ? (
              <span className="flex items-center gap-1">
                <Star size={12} className="fill-[#F5A524] text-[#F5A524]" />
                <span className="font-bold text-[#1A1523]">{rating.toFixed(1)}</span>
                <span>({reviews})</span>
              </span>
            ) : null}
            {topRated && (
              <span className="rounded-full bg-[#F3E9F8] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#843D9B]">Top rated</span>
            )}
            {hasReviews ? null : (
              <span className="flex items-center gap-1 font-semibold text-[#843D9B]">
                <Sparkles size={11} /> New on SewZella
              </span>
            )}
            {tailor.distance && (
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {tailor.distance.replace(' away', '')}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {basePrice > 0 && (
              <span className="rounded-lg bg-[#1A1523] px-2 py-1 text-[10.5px] font-bold text-white">From ₹{basePrice}</span>
            )}
            {specialities.map((s) => (
              <span key={s} className="max-w-[140px] truncate rounded-lg bg-[#F6F4F8] px-2 py-1 text-[10.5px] font-medium text-[#5E5768]">
                {s}
              </span>
            ))}
          </div>

          {tailor.bio && (
            <p className="mt-2 line-clamp-2 text-[11.5px] leading-snug text-[#8A8293]">{tailor.bio}</p>
          )}
        </div>
       </div>

        <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#ECEAEF] pt-3">
          <span className="text-[11.5px] font-medium text-[#8A8293]">
            {isVerified ? 'Verified tailor · ' : ''}Custom stitching
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F3F6] px-3.5 py-1.5 text-[11.5px] font-bold text-[#1A1523] ring-1 ring-[#E6E3EA] transition-colors group-hover:bg-[#1A1523] group-hover:text-white">
            View shop <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </span>
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
      <SectionTitle
        title="Tailors"
        accent="near you"
        subtitle={safeTailors.length > 0 ? `${safeTailors.length} tailor${safeTailors.length > 1 ? 's' : ''} around you` : 'Skilled experts in your area'}
        to="/user/tailors"
      />

      {safeTailors.length > 0 && (
        <div className="mb-3.5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`relative isolate shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                filter === f.id ? 'text-white' : 'bg-white text-[#5E5768] ring-1 ring-[#E6E3EA]'
              }`}
            >
              {filter === f.id && (
                <motion.span
                  layoutId="tailor-filter"
                  className="absolute inset-0 -z-10 rounded-full bg-[#1A1523]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[0, 1, 2].map((i) => <TailorSkeleton key={i} />)}
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
        <motion.div layout className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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
