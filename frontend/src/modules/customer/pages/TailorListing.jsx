import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal, Star, MapPin, BadgeCheck, ChevronRight, Sparkles, X, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../utils/api';
import useLocationStore from '../../../store/locationStore';
import SafeImage from '../../../components/Common/SafeImage';
import TailorFilterDrawer from '../components/TailorFilterDrawer';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { tailorFiltersFromQuery, tailorFiltersToQuery } from '../utils/tailorFilters';

const SANS = "'Plus Jakarta Sans', sans-serif";

// Quick sort chips under the search bar; they set the same `sortBy` the filter drawer uses.
const SORT_CHIPS = [
    { value: 'priority', label: 'Recommended' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'price_low', label: 'Price: Low' },
    { value: 'price_high', label: 'Price: High' },
];

// Tailor-entered tags arrive as "kurta" or "SUITS" — show them consistently.
const titleCase = (str) => String(str).trim().toLowerCase().replace(/(^|[\s/&(-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

const CardSkeleton = () => (
    <div className="rounded-[20px] bg-white p-4 ring-1 ring-[#F1ECF4]">
        <div className="flex gap-3.5">
            <span className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-2xl bg-[#F3EEF6]" />
            <div className="flex-1 space-y-2 pt-1">
                <span className="block h-4 w-2/3 animate-pulse rounded-full bg-[#F3EEF6]" />
                <span className="block h-3 w-1/2 animate-pulse rounded-full bg-[#F3EEF6]" />
                <span className="block h-3 w-1/3 animate-pulse rounded-full bg-[#F3EEF6]" />
            </div>
        </div>
        <span className="mt-4 block h-9 w-full animate-pulse rounded-full bg-[#F3EEF6]" />
    </div>
);

/** One tailor: photo, name + verified, real rating (or "New"), specialities, distance and price. */
const TailorCard = ({ tailor, index, onOpen }) => {
    const name = tailor.shopName || tailor.user?.name || 'Tailor Partner';
    const rating = Number(tailor.rating) || 0;
    const reviews = Number(tailor.totalReviews) || 0;
    const hasReviews = rating > 0 && reviews > 0;
    const basePrice = Number(tailor.basePrice) || 0;
    const tags = (tailor.specializations || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3);
    const distance = tailor.distance ? String(tailor.distance).replace(/\s*away/i, '') : '';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.35 }}
        >
            <Link
                to={`/user/tailor/${tailor._id}`}
                onClick={(e) => onOpen(e, tailor._id)}
                className="group block h-full rounded-[20px] bg-white p-4 shadow-[0_10px_26px_-20px_rgba(42,15,56,0.6)] ring-1 ring-[#F1ECF4] transition-all hover:-translate-y-0.5 hover:ring-[#E2D2EC] active:scale-[0.99]"
            >
                <div className="flex gap-3.5">
                    <div className="relative shrink-0">
                        <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl bg-[#F6EEFA] ring-1 ring-[#EFE6F4]">
                            <SafeImage src={tailor.user?.profileImage} alt={name} className="h-full w-full object-cover" />
                        </div>
                        {tailor.isAvailable && (
                            <span
                                title="Accepting orders"
                                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"
                            />
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="flex min-w-0 items-center gap-1 text-[15.5px] font-semibold leading-tight text-[#1A1523]" style={{ fontFamily: SANS }}>
                                <span className="truncate">{name}</span>
                                <BadgeCheck size={15} className="shrink-0 fill-[#6A2385] text-white" />
                            </h3>
                            {hasReviews ? (
                                <span className="flex shrink-0 items-center gap-0.5 rounded-lg bg-emerald-600 px-1.5 py-0.5 text-[11.5px] font-bold text-white">
                                    {rating.toFixed(1)} <Star size={10} className="fill-white" />
                                </span>
                            ) : (
                                <span className="flex shrink-0 items-center gap-0.5 rounded-lg bg-[#F3E9F8] px-1.5 py-0.5 text-[10.5px] font-bold text-[#6A2385]">
                                    <Sparkles size={10} /> New
                                </span>
                            )}
                        </div>

                        <p className="mt-1 flex items-center gap-1 text-[12px] text-gray-500">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">
                                {distance || 'Near you'}
                                {hasReviews ? ` · ${reviews} review${reviews > 1 ? 's' : ''}` : ''}
                                {tailor.isAvailable ? ' · ' : ''}
                            </span>
                            {tailor.isAvailable && <span className="shrink-0 font-medium text-emerald-600">Available</span>}
                        </p>

                        {tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                    <span key={tag} className="rounded-full bg-[#F6EEFA] px-2.5 py-0.5 text-[11px] font-medium text-[#6A2385]">
                                        {titleCase(tag)}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-dashed border-[#EEE6F3] pt-3">
                    {basePrice > 0 ? (
                        <span className="text-[12px] text-gray-500">
                            Starts at <span className="text-[14px] font-semibold text-[#1A1523]">₹{basePrice.toLocaleString('en-IN')}</span>
                        </span>
                    ) : (
                        <span className="text-[12px] text-gray-500">Custom stitching &amp; alterations</span>
                    )}
                    <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] py-1.5 pl-3.5 pr-2.5 text-[12px] font-semibold text-white">
                        View Shop <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>
            </Link>
        </motion.div>
    );
};

const TailorListing = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { requireAuth } = useRequireAuth();

    const handleTailorClick = (e, tailorId) => {
        e.preventDefault();
        if (!requireAuth('Please login to view tailor shop details')) return;
        navigate(`/user/tailor/${tailorId}`);
    };

    const [search, setSearch] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('search') || params.get('service') || '';
    });

    // Filters come from the URL so the home-screen filter button can open this page pre-filtered.
    const [filters, setFiltersState] = useState(() => tailorFiltersFromQuery(location.search));
    const setFilters = (next) => {
        setFiltersState(next);
        const params = new URLSearchParams(location.search);
        ['sortBy', 'rating', 'maxPrice'].forEach((k) => params.delete(k));
        new URLSearchParams(tailorFiltersToQuery(next)).forEach((v, k) => params.set(k, v));
        const query = params.toString();
        navigate(`${location.pathname}${query ? `?${query}` : ''}`, { replace: true });
    };

    // Re-read when the URL changes while this page is open (e.g. browser back/forward).
    useEffect(() => {
        const fromUrl = tailorFiltersFromQuery(location.search);
        setFiltersState((prev) => (tailorFiltersToQuery(prev) === tailorFiltersToQuery(fromUrl) ? prev : fromUrl));
    }, [location.search]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [tailors, setTailors] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const { coordinates } = useLocationStore();

    useEffect(() => {
        const fetchTailors = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/customers/tailors', {
                    params: {
                        lat: coordinates?.lat,
                        lng: coordinates?.lng,
                        sortBy: filters.sortBy,
                        rating: filters.rating,
                        maxPrice: filters.maxPrice
                    }
                });
                if (response.data.success) {
                    setTailors(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching tailors:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTailors();
    }, [coordinates, filters]);

    const searchTerm = search.trim().toLowerCase();
    const filteredTailors = tailors.filter(t =>
        (t.shopName || "").toLowerCase().includes(searchTerm) ||
        (t.specializations || []).some(s => s.toLowerCase().includes(searchTerm))
    );

    const hasExtraFilters = Boolean(filters.rating) || Number(filters.maxPrice) < 10000;
    const showSkeleton = isLoading && tailors.length === 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FBF7FD] to-[#F8F2FB] pb-24 font-sans selection:bg-[#843D9B] selection:text-white">
            <TailorFilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                setFilters={setFilters}
            />

            {/* Header: back, title, filter button, search, quick sort chips */}
            <div className="sticky top-0 z-50 bg-gradient-to-b from-[#F1E4F8] to-[#FBF7FD]/95 px-4 pb-3 pt-4 backdrop-blur-md md:px-6">
                <div className="mx-auto max-w-5xl">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            aria-label="Back"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1A1523] shadow-[0_6px_14px_-10px_rgba(90,31,110,0.5)] ring-1 ring-[#EFE6F4] active:scale-95"
                        >
                            <ArrowLeft size={19} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-[19px] font-semibold leading-tight text-[#1A1523]" style={{ fontFamily: SANS }}>
                                Find Tailors
                            </h1>
                            <p className="text-[11.5px] text-gray-500">Verified tailors near you</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(true)}
                            aria-label="Filters"
                            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#6A2385] shadow-[0_6px_14px_-10px_rgba(90,31,110,0.5)] ring-1 ring-[#EFE6F4] active:scale-95"
                        >
                            <SlidersHorizontal size={18} />
                            {(hasExtraFilters || filters.sortBy !== 'priority') && (
                                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#E5243B]" />
                            )}
                        </button>
                    </div>

                    <div className="mt-3 flex h-12 items-center gap-2 rounded-full bg-white px-4 shadow-[0_10px_24px_-18px_rgba(74,21,96,0.5)] ring-1 ring-[#EEE4F3] focus-within:ring-[#C9A8D8]">
                        <Search size={17} className="shrink-0 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by shop name or speciality…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-[#1A1523] placeholder:text-gray-400 focus:outline-none"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="text-gray-400">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:-mx-6 md:px-6">
                        {SORT_CHIPS.map((chip) => {
                            const active = filters.sortBy === chip.value;
                            return (
                                <button
                                    key={chip.value}
                                    type="button"
                                    onClick={() => setFilters({ ...filters, sortBy: chip.value })}
                                    className={`h-8 shrink-0 rounded-full px-3.5 text-[12px] font-medium transition-colors ${
                                        active
                                            ? 'bg-[#5A1A78] text-white'
                                            : 'bg-white text-[#2A1F33] ring-1 ring-[#EADFF0] hover:ring-[#C9A8D8]'
                                    }`}
                                >
                                    {chip.label}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setFilters({ ...filters, rating: filters.rating === '4' ? '' : '4' })}
                            className={`flex h-8 shrink-0 items-center gap-1 rounded-full px-3.5 text-[12px] font-medium transition-colors ${
                                filters.rating === '4'
                                    ? 'bg-[#5A1A78] text-white'
                                    : 'bg-white text-[#2A1F33] ring-1 ring-[#EADFF0] hover:ring-[#C9A8D8]'
                            }`}
                        >
                            4.0+ <Star size={11} className={filters.rating === '4' ? 'fill-white' : 'fill-[#F5A623] text-[#F5A623]'} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-4 md:px-6">
                {/* Count */}
                <p className="mb-3 mt-2 text-[12.5px] text-gray-500">
                    {showSkeleton ? 'Finding tailors near you…' : (
                        <>
                            <span className="font-semibold text-[#1A1523]">{filteredTailors.length}</span>{' '}
                            tailor{filteredTailors.length === 1 ? '' : 's'} found{searchTerm ? ` for "${search.trim()}"` : ''}
                        </>
                    )}
                </p>

                {/* List */}
                {showSkeleton ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
                    </div>
                ) : filteredTailors.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <AnimatePresence>
                            {filteredTailors.map((tailor, index) => (
                                <TailorCard key={tailor._id} tailor={tailor} index={index} onOpen={handleTailorClick} />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center rounded-[20px] bg-white px-6 py-10 text-center ring-1 ring-[#F1ECF4]">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E9F8] text-[#6A2385]">
                            {searchTerm ? <Search size={24} /> : <Store size={24} />}
                        </span>
                        <h3 className="mt-3 text-[15px] font-semibold text-[#1A1523]">No tailors found</h3>
                        <p className="mt-1 max-w-xs text-[12.5px] leading-relaxed text-gray-500">
                            {searchTerm
                                ? `Nothing matches "${search.trim()}". Try "Bridal", "Suits" or "Blouse".`
                                : 'Try removing a filter or changing your location.'}
                        </p>
                        {(searchTerm || hasExtraFilters) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    setFilters({ ...filters, rating: '', maxPrice: 10000 });
                                }}
                                className="mt-4 rounded-full bg-[#5A1A78] px-5 py-2 text-[12.5px] font-semibold text-white"
                            >
                                Clear search &amp; filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TailorListing;
