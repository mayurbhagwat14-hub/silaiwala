import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search, SlidersHorizontal, Star, MapPin, MapPinned, BadgeCheck, ArrowRight, ArrowDown, ArrowUp, Sparkles, X, Store, Heart, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../utils/api';
import useLocationStore from '../../../store/locationStore';
import SafeImage from '../../../components/Common/SafeImage';
import TailorFilterDrawer from '../components/TailorFilterDrawer';
import LocationModal from '../components/LocationModal';
import BottomNav from '../components/BottomNav';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import { tailorFiltersFromQuery, tailorFiltersToQuery } from '../utils/tailorFilters';

const SANS = "'Plus Jakarta Sans', sans-serif";

// Quick sort chips under the search bar; they set the same `sortBy` the filter drawer uses.
const SORT_CHIPS = [
    { value: 'priority', label: 'Recommended' },
    { value: 'rating', label: 'Top Rated', icon: Star },
    { value: 'distance', label: 'Nearby', icon: MapPin },
    { value: 'price_low', label: 'Price: Low', icon: ArrowDown },
    { value: 'price_high', label: 'Price: High', icon: ArrowUp },
];

// Browser speech recognition (Chrome / Edge / Safari); the mic is hidden where it isn't available.
const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// Tailor-entered tags arrive as "kurta" or "SUITS" — show them consistently.
const titleCase = (str) => String(str).trim().toLowerCase().replace(/(^|[\s/&(-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

const CardSkeleton = () => (
    <div className="flex gap-3 rounded-[18px] bg-white p-2.5 shadow-[0_6px_20px_-14px_rgba(42,15,56,0.35)] ring-1 ring-[#EFE8F4]">
        <span className="h-[104px] w-[112px] shrink-0 animate-pulse rounded-[14px] bg-[#F3EEF6]" />
        <div className="flex-1 space-y-2 py-1.5">
            <span className="block h-4 w-2/3 animate-pulse rounded-full bg-[#F3EEF6]" />
            <span className="block h-3 w-1/2 animate-pulse rounded-full bg-[#F3EEF6]" />
            <span className="block h-3 w-3/4 animate-pulse rounded-full bg-[#F3EEF6]" />
            <span className="block h-6 w-full animate-pulse rounded-full bg-[#F3EEF6]" />
        </div>
    </div>
);

/** One tailor, list style: shop photo with rating on it, name + verified, distance / city / availability,
 *  a one-line about, speciality tags and a "View Shop" button. All values come from the tailor's profile. */
const TailorCard = ({ tailor, index, onOpen }) => {
    const name = tailor.shopName || tailor.user?.name || 'Tailor Partner';
    const rating = Number(tailor.rating) || 0;
    const reviews = Number(tailor.totalReviews) || 0;
    const hasReviews = rating > 0 && reviews > 0;
    const tags = (tailor.specializations || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3);
    const distance = tailor.distance ? String(tailor.distance).replace(/\s*away/i, '') : '';
    const city = tailor.location?.city ? titleCase(tailor.location.city) : '';
    const about = String(tailor.bio || '').trim() || 'Custom stitching & alterations';

    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.32 }}
        >
            <Link
                to={`/user/tailor/${tailor._id}`}
                onClick={(e) => onOpen(e, tailor._id)}
                className="group flex h-full gap-3 rounded-[18px] bg-white p-2.5 shadow-[0_6px_20px_-14px_rgba(42,15,56,0.35)] ring-1 ring-[#EFE8F4] transition-all hover:ring-[#DCC8E8] active:scale-[0.99]"
            >
                {/* Photo + rating */}
                <div className="relative h-[108px] w-[112px] shrink-0 overflow-hidden rounded-[14px] bg-[#F6EEFA]">
                    <SafeImage
                        src={tailor.user?.profileImage}
                        alt={name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white/95 px-2 py-[3px] text-[10.5px] font-bold text-[#1A1523] shadow-sm">
                        {hasReviews ? (
                            <>
                                <Star size={10} className="fill-[#F5A623] text-[#F5A623]" />
                                {rating.toFixed(1)}
                                <span className="font-medium text-gray-500">({reviews})</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={10} className="text-[#6A2385]" /> New
                            </>
                        )}
                    </span>
                </div>

                {/* Details */}
                <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-0.5">
                    <h3 className="flex min-w-0 items-center gap-1 text-[15px] font-bold leading-tight text-[#1A1523]" style={{ fontFamily: SANS }}>
                        <span className="truncate">{name}</span>
                        <BadgeCheck size={16} className="shrink-0 fill-[#6A2385] text-white" />
                    </h3>

                    <p className="mt-1 flex min-w-0 items-center gap-1 text-[11.5px] text-gray-500">
                        <MapPin size={11.5} className="shrink-0" />
                        <span className="truncate">{[distance || 'Near you', city].filter(Boolean).join(' · ')}</span>
                        {tailor.isAvailable && (
                            <>
                                <span className="shrink-0 text-gray-300">|</span>
                                <span className="shrink-0 font-semibold text-emerald-600">Available</span>
                            </>
                        )}
                    </p>

                    <p className="mt-1 truncate text-[12px] text-[#4B4453]">{about}</p>

                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <div className="flex min-w-0 flex-1 flex-wrap gap-1 overflow-hidden" style={{ maxHeight: 44 }}>
                            {tags.map((tag) => (
                                <span key={tag} className="truncate rounded-full bg-[#F3E9F8] px-2 py-[3px] text-[10.5px] font-semibold text-[#5A1A78]">
                                    {titleCase(tag)}
                                </span>
                            ))}
                        </div>
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] py-1.5 pl-3 pr-2.5 text-[11.5px] font-semibold text-white shadow-[0_6px_14px_-8px_rgba(90,26,120,0.8)]">
                            View Shop <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </div>
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
    const [showLocationModal, setShowLocationModal] = useState(false);

    // Voice search: fills the search box with what the customer says.
    const canUseVoice = Boolean(SpeechRecognition);
    const [listening, setListening] = useState(false);
    const startVoiceSearch = () => {
        if (!SpeechRecognition || listening) return;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = (event) => {
            const text = event.results?.[0]?.[0]?.transcript || '';
            if (text) setSearch(text.trim());
        };
        recognition.onerror = () => setListening(false);
        recognition.onend = () => setListening(false);
        setListening(true);
        try { recognition.start(); } catch { setListening(false); }
    };

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
    const matchingTailors = tailors.filter(t =>
        (t.shopName || "").toLowerCase().includes(searchTerm) ||
        (t.specializations || []).some(s => s.toLowerCase().includes(searchTerm))
    );
    // "Nearby": nearest first (also done by the server; repeated here so it works with an older API).
    const kmOf = (t) => (Number.isFinite(Number(t.distanceKm)) && t.distanceKm !== null ? Number(t.distanceKm) : Number.MAX_VALUE);
    const filteredTailors = filters.sortBy === 'distance'
        ? [...matchingTailors].sort((a, b) => kmOf(a) - kmOf(b))
        : matchingTailors;

    const hasExtraFilters = Boolean(filters.rating) || Number(filters.maxPrice) < 10000;
    const showSkeleton = isLoading && tailors.length === 0;

    return (
        <div className="min-h-screen bg-white pb-28 font-sans md:pb-8 selection:bg-[#843D9B] selection:text-white">
            <TailorFilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                setFilters={setFilters}
            />

            {/* Header: back + title, wishlist / location / filter, search with voice, sort chips */}
            <div className="sticky top-0 z-50 bg-white px-4 pb-3 pt-4 md:px-6">
                <div className="mx-auto max-w-5xl">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            aria-label="Back"
                            className="-ml-1.5 flex h-10 w-9 shrink-0 items-center justify-center text-[#1A1523] active:scale-95"
                        >
                            <ArrowLeft size={23} strokeWidth={2.2} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-[21px] font-bold leading-tight text-[#1A1523]" style={{ fontFamily: SANS }}>
                                Find Tailors
                            </h1>
                            <p className="truncate text-[11.5px] text-gray-500">Discover verified tailors &amp; boutiques near you</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/user/wishlist')}
                            aria-label="Wishlist"
                            title="Wishlist"
                            className="flex h-10 w-9 shrink-0 items-center justify-center text-[#1A1523] active:scale-95"
                        >
                            <Heart size={22} strokeWidth={2} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowLocationModal(true)}
                            aria-label="Change location"
                            title="Change location"
                            className="flex h-10 w-9 shrink-0 items-center justify-center text-[#1A1523] active:scale-95"
                        >
                            <MapPinned size={22} strokeWidth={2} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(true)}
                            aria-label="Filters"
                            className="relative ml-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#8A3FA6] to-[#5A1A78] text-white shadow-[0_8px_18px_-10px_rgba(90,26,120,0.9)] active:scale-95"
                        >
                            <SlidersHorizontal size={19} />
                            {(hasExtraFilters || filters.sortBy !== 'priority') && (
                                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#E5243B]" />
                            )}
                        </button>
                    </div>

                    <div className="mt-3 flex h-12 items-center gap-2.5 rounded-2xl bg-white px-4 ring-1 ring-[#E4D6EC] focus-within:ring-[#B98FCF]">
                        <Search size={18} className="shrink-0 text-[#6A2385]" />
                        <input
                            type="text"
                            placeholder={listening ? 'Listening…' : 'Search by shop name, specialty, or service…'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-[#1A1523] placeholder:text-gray-500 focus:outline-none"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="text-gray-400">
                                <X size={16} />
                            </button>
                        )}
                        {canUseVoice && (
                            <button
                                type="button"
                                onClick={startVoiceSearch}
                                aria-label="Search by voice"
                                className={`shrink-0 ${listening ? 'animate-pulse text-[#E5243B]' : 'text-[#6A2385]'}`}
                            >
                                <Mic size={19} />
                            </button>
                        )}
                    </div>

                    <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 md:-mx-6 md:px-6">
                        {SORT_CHIPS.map((chip) => {
                            const active = filters.sortBy === chip.value;
                            const Icon = chip.icon;
                            return (
                                <button
                                    key={chip.value}
                                    type="button"
                                    onClick={() => setFilters({ ...filters, sortBy: chip.value })}
                                    className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold transition-colors ${
                                        active
                                            ? 'bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] text-white shadow-[0_6px_14px_-8px_rgba(90,26,120,0.8)]'
                                            : 'bg-white text-[#2A1F33] ring-1 ring-[#E4D6EC] hover:ring-[#B98FCF]'
                                    }`}
                                >
                                    {Icon && <Icon size={14} className={active ? 'text-white' : 'text-[#6A2385]'} />}
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <LocationModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} />

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
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
                    </div>
                ) : filteredTailors.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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

            {/* "Book Service" tab lives here, so keep the tab bar visible */}
            <BottomNav />
        </div>
    );
};

export default TailorListing;
