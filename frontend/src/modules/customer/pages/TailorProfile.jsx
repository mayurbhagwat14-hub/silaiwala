import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Star, MapPin, Heart, Share2, BadgeCheck, Navigation, CalendarDays, MessageCircle, Phone,
    LayoutGrid, Scissors, Image as ImageIcon, MessageSquareText, Info, Store, ShieldCheck, Truck, RefreshCw,
    Lock, ArrowRight, Users, Briefcase, Gem, Wand2, Layers, XCircle,
} from 'lucide-react';
import useCheckoutStore from '../../../store/checkoutStore';
import useBrandingStore from '../../../store/brandingStore';
import useLocationStore from '../../../store/locationStore';
import api from '../../../utils/api';
import { getImageUrl } from '../../../utils/imageUrl';
import toast from 'react-hot-toast';

const SANS = "'Plus Jakarta Sans', sans-serif";
const FAV_KEY = 'favouriteTailors'; // shared with the home "Featured Tailors" hearts

const readFavourites = () => {
    try {
        return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
    } catch {
        return new Set();
    }
};

// Tailor-entered tags arrive as "kurta" or "SUITS" — show them consistently.
const titleCase = (str) => String(str).trim().toLowerCase().replace(/(^|[\s/&(-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

const kmBetween = (a, b) => {
    const R = 6371;
    const t = Math.PI / 180;
    const dLat = (b.lat - a.lat) * t;
    const dLng = (b.lng - a.lng) * t;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
};

const timeAgo = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
    return `${Math.floor(months / 12)} year${months >= 24 ? 's' : ''} ago`;
};

const realImage = (src) => (src && src !== 'no-photo.jpg' ? getImageUrl(src) : '');

/** The tailor's / customer's own photo, or their initial on brand purple — never a stock photo. */
const Photo = ({ src, name, className = '', initialClass = 'text-3xl' }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br from-[#843D9B] to-[#4A1560] ${className}`}>
                <span className={`font-semibold text-white ${initialClass}`}>{(name || 'T').trim().charAt(0).toUpperCase()}</span>
            </div>
        );
    }
    return <img src={src} alt={name || ''} onError={() => setFailed(true)} className={`object-cover ${className}`} />;
};

const Stars = ({ value, size = 12 }) => (
    <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-[#F5A623] text-[#F5A623]' : 'fill-gray-200 text-gray-200'} />
        ))}
    </span>
);

/** Section heading from the reference: purple outline icon, bold title, optional "View all →" action. */
const SectionHead = ({ icon: Icon, title, action, onAction }) => (
    <div className="mb-3 flex items-center gap-2.5">
        <Icon size={22} strokeWidth={1.7} className="shrink-0 text-[#6A2385]" />
        <h3 className="min-w-0 flex-1 truncate text-[17px] font-bold text-[#1A1523]" style={{ fontFamily: SANS }}>{title}</h3>
        {action && (
            <button type="button" onClick={onAction} className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[#6A2385]">
                {action} <ArrowRight size={14} />
            </button>
        )}
    </div>
);

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'services', label: 'Services', icon: Scissors },
    { id: 'portfolio', label: 'Portfolio', icon: ImageIcon },
    { id: 'reviews', label: 'Reviews', icon: MessageSquareText },
    { id: 'about', label: 'About', icon: Info },
];

const TailorProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const setTailorInStore = useCheckoutStore(state => state.setTailor);
    const appName = useBrandingStore((s) => s.appName) || 'Sewzella';
    const userCoords = useLocationStore((s) => s.coordinates);
    const [tailor, setTailor] = useState(null);
    const [fabrics, setFabrics] = useState([]);
    const [samples, setSamples] = useState([]);
    const [services, setServices] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(() => readFavourites().has(id));
    const [bioOpen, setBioOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [showAllServices, setShowAllServices] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [tailorRes, fabricsRes, samplesRes, servicesRes] = await Promise.all([
                    api.get(`/tailors/${id}`),
                    api.get(`/tailors/${id}/fabrics`),
                    api.get(`/tailors/${id}/work-samples`),
                    api.get(`/tailors/${id}/services`)
                ]);
                const t = tailorRes.data.data;
                setTailor(t);
                setFabrics(fabricsRes.data.data || []);
                setSamples(samplesRes.data.data || []);
                setServices(servicesRes.data.data || []);
                setIsLoading(false);

                // Reviews can point at the tailor profile or the tailor's user id — load both, newest first
                const ids = [...new Set([t?._id, t?.user?._id || t?.user].filter(Boolean).map(String))];
                const lists = await Promise.all(ids.map((rid) => api.get(`/reviews/Tailor/${rid}`).then((r) => r.data.data || []).catch(() => [])));
                const seen = new Set();
                setReviews(lists.flat().filter((r) => (seen.has(r._id) ? false : seen.add(r._id)))
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            } catch (error) {
                if (error?.name === 'CanceledError' || error?.message === 'canceled' || error?.message?.includes('Cancelled')) {
                    return;
                }
                console.error('Failed to fetch tailor data:', error);
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                <div className="h-[190px] animate-pulse bg-[#EADCF2]" />
                <div className="-mt-10 px-3">
                    <div className="space-y-4 rounded-[22px] bg-white p-4 ring-1 ring-[#F1ECF4]">
                        <div className="flex gap-4">
                            <span className="h-24 w-24 animate-pulse rounded-full bg-[#F3EEF6]" />
                            <div className="flex-1 space-y-2 pt-2">
                                <span className="block h-5 w-2/3 animate-pulse rounded-full bg-[#F3EEF6]" />
                                <span className="block h-3 w-1/2 animate-pulse rounded-full bg-[#F3EEF6]" />
                            </div>
                        </div>
                        <span className="block h-12 animate-pulse rounded-2xl bg-[#F3EEF6]" />
                    </div>
                </div>
            </div>
        );
    }

    if (!tailor) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center">
                <h2 className="text-lg font-semibold text-[#1A1523]">Tailor not found</h2>
                <button onClick={() => navigate(-1)} className="mt-4 rounded-full bg-[#5A1A78] px-5 py-2 text-[13px] font-semibold text-white">Go back</button>
            </div>
        );
    }

    const name = tailor.shopName || tailor.user?.name || 'Tailor Partner';
    const photo = realImage(tailor.user?.profileImage);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: name, text: `Check out ${name} on ${appName}!`, url: window.location.href });
            } catch {
                /* share sheet dismissed */
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
        }
    };

    const toggleFavourite = () => {
        const favs = readFavourites();
        if (favs.has(id)) favs.delete(id);
        else favs.add(id);
        try {
            localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
        } catch {
            /* storage unavailable — keep in memory only */
        }
        setIsFavorite(favs.has(id));
    };

    // ── Only real data below; anything the tailor hasn't filled in is simply not shown ──
    const isVerified = tailor.registrationStatus === 'verified' || tailor.isApproved === true;
    const reviewCount = reviews.length || Number(tailor.totalReviews) || 0;
    const rating = reviews.length
        ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length
        : Number(tailor.rating) || 0;
    const hasReviews = rating > 0 && reviewCount > 0;
    const experience = Number(tailor.experienceInYears) || 0;
    const ordersDone = Number(tailor.ordersCompleted) || 0;
    const specialities = (tailor.specializations || []).map((s) => titleCase(s)).filter(Boolean);
    const bio = (tailor.bio || '').trim();
    const city = tailor.location?.city ? titleCase(tailor.location.city) : '';
    const address = tailor.location?.address || tailor.address || [tailor.location?.city, tailor.location?.state].filter(Boolean).join(', ');
    const pincode = tailor.location?.pincode || '';
    const phone = String(tailor.user?.phoneNumber || '').replace(/[^\d+]/g, '');
    const waNumber = phone.replace(/^\+/, '').length === 10 ? `91${phone.replace(/^\+/, '')}` : phone.replace(/^\+/, '');

    const [lng, lat] = Array.isArray(tailor.location?.coordinates) ? tailor.location.coordinates : [];
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    const distanceKm = hasCoords && userCoords?.lat && userCoords?.lng ? kmBetween(userCoords, { lat, lng }) : null;
    const distanceText = distanceKm != null ? `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km` : '';
    const mapQuery = hasCoords ? `${lat},${lng}` : encodeURIComponent(`${name} ${address}`);
    const directionsUrl = hasCoords
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

    const portfolio = samples.map((s) => ({ id: s._id, title: s.title, image: realImage(s.image || s.images?.[0]) })).filter((s) => s.image);
    const bannerImage = portfolio[0]?.image || realImage(services.find((s) => realImage(s.image))?.image) || '';
    const prices = services.map((s) => Number(s.basePrice) || 0).filter((p) => p > 0);
    const startsFrom = prices.length ? Math.min(...prices) : 0;
    const visibleServices = showAllServices ? services : services.slice(0, 5);

    const distribution = [5, 4, 3, 2, 1].map((star) => {
        const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length;
        return { star, pct: reviews.length ? Math.round((count / reviews.length) * 100) : 0 };
    });
    const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 2);

    const aboutText = bio || [
        `${name} is a tailoring partner${city ? ` in ${city}` : ''} on ${appName}`,
        specialities.length ? `, specialising in ${specialities.slice(0, 4).join(', ')}` : '',
        '.',
    ].join('');

    const scrollTo = (tab) => {
        setActiveTab(tab);
        const el = document.getElementById(`tp-${tab}`);
        if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 70;
            window.scrollTo({ top: tab === 'overview' ? 0 : top, behavior: 'smooth' });
        }
    };

    const goServices = () => {
        setTailorInStore(tailor._id, name);
        navigate('/user/services', { state: { tailorId: tailor._id, tailorName: name } });
    };
    const bookService = (service) => {
        setTailorInStore(tailor._id, name);
        navigate(`/user/services/${service._id}`, { state: { tailorId: tailor._id } });
    };
    const goCustom = () => {
        setTailorInStore(tailor._id, name);
        navigate('/user/custom-design', { state: { tailorId: tailor._id, tailorName: name } });
    };
    const openWhatsApp = () => {
        if (!waNumber) { toast.error('Contact number not available'); return; }
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi ${name}, I found you on ${appName}.`)}`, '_blank', 'noopener');
    };
    const callShop = () => {
        if (!phone) { toast.error('Contact number not available'); return; }
        window.location.href = `tel:${phone}`;
    };

    const badges = [
        isVerified && { icon: ShieldCheck, label: 'Verified Partner' },
        { icon: Gem, label: 'Custom Fit' },
        { icon: Truck, label: 'Pickup & Delivery' },
        { icon: RefreshCw, label: 'Free Alteration' },
    ].filter(Boolean);

    const policies = [
        { icon: Wand2, label: 'Customization Available' },
        { icon: Truck, label: 'Pickup & Delivery' },
        { icon: RefreshCw, label: 'Free Alteration (7 days)' },
        { icon: Lock, label: 'Secure Payment' },
        { icon: XCircle, label: 'Free Cancellation*' },
    ];

    return (
        <div className="min-h-screen overflow-x-hidden bg-white pb-32 font-sans">
            {/* 1. Hero banner: the tailor's own work photo (softened so any text in it doesn't compete), or a brand gradient */}
            <div className="relative h-[170px] w-full overflow-hidden bg-gradient-to-br from-[#7B2D93] via-[#5A1A78] to-[#3E0F52]">
                {bannerImage && <img src={bannerImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover blur-[3px]" />}
                <div className="absolute inset-0 bg-gradient-to-b from-[#2A0A3A]/75 via-[#4A1265]/70 to-[#4A1265]/80" />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-16 pb-8 text-center text-white">
                    <img src="/brand/sewzella-mark.png" alt="" aria-hidden="true" className="h-8 w-auto brightness-0 invert" />
                    <p className="mt-1.5 line-clamp-1 text-[22px] font-semibold leading-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{name}</p>
                </div>

                <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => navigate(-1)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm active:scale-90">
                        <ArrowLeft size={22} />
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleFavourite}
                            aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                            aria-pressed={isFavorite}
                            className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md active:scale-90 ${isFavorite ? 'text-rose-500' : 'text-[#5A1A78]'}`}
                        >
                            <Heart size={19} className={isFavorite ? 'fill-current' : ''} />
                        </button>
                        <button onClick={handleShare} aria-label="Share" className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5A1A78] shadow-md active:scale-90">
                            <Share2 size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative z-10 mx-auto -mt-7 max-w-3xl rounded-t-[26px] bg-white px-4 pt-4">
                {/* 2. Boutique info */}
                <section id="tp-overview" className="rounded-[20px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                    <div className="flex items-center gap-3.5">
                        <Photo src={photo} name={name} className="h-[76px] w-[76px] shrink-0 rounded-full ring-4 ring-[#F3E9F8]" initialClass="text-2xl" />
                        <div className="min-w-0 flex-1">
                            <h1 className="flex min-w-0 items-center gap-1.5 text-[19px] font-bold leading-tight text-[#1A1523]" style={{ fontFamily: SANS }}>
                                <span className="truncate">{name}</span>
                                {isVerified && <BadgeCheck size={19} className="shrink-0 fill-[#6A2385] text-white" />}
                            </h1>
                            <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tailor.isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${tailor.isAvailable ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                {tailor.isAvailable ? 'Accepting Orders' : 'Currently Busy'}
                            </span>
                            {specialities.length > 0 && (
                                <p className="mt-1.5 line-clamp-1 text-[12.5px] text-[#4B4453]">{specialities.slice(0, 3).join(' · ')}</p>
                            )}
                        </div>
                    </div>

                    {(city || address) && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#FBF7FD] px-3 py-2">
                            <MapPin size={15} className="shrink-0 text-[#6A2385]" />
                            <p className="min-w-0 flex-1 truncate text-[12.5px] text-[#4B4453]">
                                {address || city}
                                {distanceText && <span className="text-gray-400"> · {distanceText}</span>}
                            </p>
                            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[12px] font-semibold text-[#6A2385]">View on Map</a>
                        </div>
                    )}

                    {/* Stats: value on top, label below — nothing gets cut off */}
                    <div className="mt-3 grid grid-cols-3 divide-x divide-[#EFE8F4]">
                        <div className="flex flex-col items-center px-1 text-center">
                            <span className="flex items-center gap-1 text-[15px] font-bold text-[#1A1523]">
                                <Star size={15} className={hasReviews ? 'fill-[#F5A623] text-[#F5A623]' : 'text-gray-300'} />
                                {hasReviews ? rating.toFixed(1) : 'New'}
                            </span>
                            <span className="mt-0.5 text-[11px] text-gray-500">{reviewCount} review{reviewCount === 1 ? '' : 's'}</span>
                        </div>
                        <div className="flex flex-col items-center px-1 text-center">
                            <span className="flex items-center gap-1 text-[15px] font-bold text-[#1A1523]">
                                <Briefcase size={15} className="text-[#6A2385]" />
                                {experience > 0 ? `${experience}+` : 'New'}
                            </span>
                            <span className="mt-0.5 text-[11px] text-gray-500">{experience > 0 ? 'Years exp.' : 'Partner'}</span>
                        </div>
                        <div className="flex flex-col items-center px-1 text-center">
                            <span className="flex items-center gap-1 text-[15px] font-bold text-[#1A1523]">
                                <Users size={15} className="text-[#6A2385]" />
                                {ordersDone.toLocaleString('en-IN')}
                            </span>
                            <span className="mt-0.5 text-[11px] text-gray-500">Orders</span>
                        </div>
                    </div>
                </section>

                {/* 3. Actions: one main button, three quick actions */}
                <button onClick={goServices} className="mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] text-[14.5px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(90,26,120,0.9)] active:scale-[0.98]">
                    <CalendarDays size={18} /> Book Service
                </button>
                <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                    <button onClick={openWhatsApp} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-semibold text-[#1A1523] ring-1 ring-[#E4D6EC] active:scale-95">
                        <MessageCircle size={16} className="text-[#6A2385]" /> Chat
                    </button>
                    <button onClick={callShop} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-semibold text-[#1A1523] ring-1 ring-[#E4D6EC] active:scale-95">
                        <Phone size={16} className="text-[#6A2385]" /> Call
                    </button>
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-white text-[13px] font-semibold text-[#1A1523] ring-1 ring-[#E4D6EC] active:scale-95">
                        <Navigation size={16} className="text-[#6A2385]" /> Directions
                    </a>
                </div>

                {/* 4. Tabs */}
                <div className="sticky top-0 z-20 -mx-4 mt-4 grid grid-cols-5 border-b border-[#EFE8F4] bg-white px-4">
                    {TABS.map(({ id: tab, label, icon: Icon }) => {
                        const active = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => scrollTo(tab)}
                                className={`flex flex-col items-center gap-1 border-b-2 pb-2 pt-2.5 text-[12px] font-semibold transition-colors ${active ? 'border-[#6A2385] text-[#6A2385]' : 'border-transparent text-[#4B4453]'}`}
                            >
                                <Icon size={19} strokeWidth={1.7} /> {label}
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-7 pt-5">
                    {/* 5. About */}
                    <section id="tp-about" className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#FBF7FD] to-[#F4EAF9] p-4">
                        <img src="/brand/sewzella-mark.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-2 top-3 h-20 w-auto opacity-25" />
                        <div className="relative">
                            <SectionHead icon={Store} title={`About ${tailor.shopName ? 'the Boutique' : 'the Tailor'}`} />
                            <p className={`pr-16 text-[12.5px] leading-relaxed text-[#4B4453] ${bioOpen ? '' : 'line-clamp-3'}`}>{aboutText}</p>
                            {aboutText.length > 170 && (
                                <button onClick={() => setBioOpen((v) => !v)} className="mt-1 text-[12px] font-semibold text-[#6A2385]">
                                    {bioOpen ? 'Show less' : 'Read more'}
                                </button>
                            )}
                            <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
                                {badges.map(({ icon: Icon, label }) => (
                                    <span key={label} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#2A1F33] ring-1 ring-[#E4D6EC]">
                                        <Icon size={14} className="text-[#6A2385]" /> {label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 6. Services & pricing */}
                    <section id="tp-services">
                        <SectionHead
                            icon={CalendarDays}
                            title="Services & Pricing"
                            action={services.length > 5 ? (showAllServices ? 'Show Less' : 'View All Services') : null}
                            onAction={() => setShowAllServices((v) => !v)}
                        />
                        <div className="space-y-3">
                            {visibleServices.map((service) => {
                                const price = Number(service.basePrice) || 0;
                                const desc = (service.description || '').trim();
                                const sub = desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : service.category?.name || 'Custom stitching';
                                return (
                                    <div key={service._id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_6px_18px_-14px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                                        <Photo src={realImage(service.image)} name={service.title} className="h-[68px] w-[68px] shrink-0 rounded-xl" initialClass="text-lg" />
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 text-[14px] font-bold leading-snug text-[#1A1523]">{titleCase(service.title)}</p>
                                            <p className="mt-0.5 line-clamp-1 text-[12px] text-[#4B4453]">{sub}</p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                                            {price > 0 && (
                                                <p className="text-right leading-tight">
                                                    <span className="block text-[10px] text-gray-500">Starts from</span>
                                                    <span className="text-[16px] font-bold text-[#5A1A78]">₹{price.toLocaleString('en-IN')}</span>
                                                </p>
                                            )}
                                            <button onClick={() => bookService(service)} className="rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] px-4 py-1.5 text-[12px] font-semibold text-white active:scale-95">
                                                Book Now
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Custom design — book anything from a photo */}
                            <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#D9C2E6] bg-[#FBF7FD] p-2.5">
                                <span className="flex h-[54px] w-[64px] shrink-0 items-center justify-center rounded-xl bg-white text-[#6A2385] ring-1 ring-[#EFE8F4]">
                                    <Wand2 size={22} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px] font-bold text-[#1A1523]">Custom Design</p>
                                    <p className="truncate text-[11.5px] text-[#4B4453]">Upload your design, get a quote</p>
                                </div>
                                <button onClick={goCustom} className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[12px] font-semibold text-[#6A2385] ring-1 ring-[#6A2385] active:scale-95">
                                    Get Quote
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 7. Portfolio */}
                    <section id="tp-portfolio">
                        <SectionHead icon={ImageIcon} title="Portfolio" />
                        {portfolio.length > 0 ? (
                            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                                {portfolio.map((p) => (
                                    <button key={p.id} type="button" onClick={() => window.open(p.image, '_blank')} className="w-[104px] shrink-0 overflow-hidden rounded-xl ring-1 ring-[#EFE8F4]" title={p.title}>
                                        <img src={p.image} alt={p.title || 'Work sample'} className="aspect-[4/5] w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-2xl bg-[#FBF7FD] p-4 text-center text-[12.5px] text-gray-500">No portfolio photos yet.</p>
                        )}
                    </section>

                    {/* Fabrics (only when the tailor sells fabric) */}
                    {fabrics.length > 0 && (
                        <section>
                            <SectionHead icon={Layers} title="Fabric Collection" />
                            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                                {fabrics.map((fabric) => (
                                    <button
                                        key={fabric._id}
                                        type="button"
                                        onClick={() => { setTailorInStore(tailor._id, name); navigate(`/user/fabric/${fabric._id}`); }}
                                        className="w-[120px] shrink-0 overflow-hidden rounded-xl bg-white text-left ring-1 ring-[#EFE8F4]"
                                    >
                                        <Photo src={realImage(fabric.images?.[0] || fabric.image)} name={fabric.name} className="aspect-square w-full" initialClass="text-xl" />
                                        <div className="p-2">
                                            <p className="truncate text-[12px] font-semibold text-[#1A1523]">{fabric.name}</p>
                                            <p className="text-[12px] font-bold text-[#5A1A78]">₹{Number(fabric.price || 0).toLocaleString('en-IN')}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 8. Reviews */}
                    <section id="tp-reviews">
                        <SectionHead
                            icon={Star}
                            title={`Reviews (${reviewCount})`}
                            action={reviews.length > 2 ? (showAllReviews ? 'Show Less' : 'View All Reviews') : null}
                            onAction={() => setShowAllReviews((v) => !v)}
                        />
                        {hasReviews ? (
                            <>
                                <div className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-[#EFE8F4]">
                                    <div className="w-[118px] shrink-0 rounded-xl bg-[#F6EEFA] py-3 text-center">
                                        <p className="text-[26px] font-bold leading-none text-[#1A1523]">{rating.toFixed(1)}<span className="text-[14px] font-semibold text-gray-500"> / 5</span></p>
                                        <div className="mt-1.5 flex justify-center"><Stars value={rating} size={13} /></div>
                                        <p className="mt-1 text-[10.5px] text-gray-500">{reviewCount} Verified Reviews</p>
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        {distribution.map(({ star, pct }) => (
                                            <div key={star} className="flex items-center gap-1.5 text-[11px] text-[#4B4453]">
                                                <span className="w-2.5 text-right">{star}</span>
                                                <Star size={10} className="fill-[#F5A623] text-[#F5A623]" />
                                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EFE8F4]">
                                                    <span className="block h-full rounded-full bg-[#6A2385]" style={{ width: `${pct}%` }} />
                                                </span>
                                                <span className="w-8 text-right">{pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {visibleReviews.length > 0 && (
                                    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                                        {visibleReviews.map((r) => (
                                            <div key={r._id} className="rounded-2xl bg-white p-3 ring-1 ring-[#EFE8F4]">
                                                <div className="flex items-center gap-2.5">
                                                    <Photo src={realImage(r.user?.profileImage)} name={r.name || r.user?.name} className="h-9 w-9 shrink-0 rounded-full" initialClass="text-sm" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[13px] font-bold text-[#1A1523]">{r.name || r.user?.name || 'Customer'}</p>
                                                        <div className="flex items-center gap-2"><Stars value={r.rating} size={11} /><span className="text-[10.5px] text-gray-400">{timeAgo(r.createdAt)}</span></div>
                                                    </div>
                                                </div>
                                                <p className="mt-2 line-clamp-3 text-[12px] leading-snug text-[#4B4453]">“{r.comment}”</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="rounded-2xl bg-[#FBF7FD] p-4 text-center text-[12.5px] text-gray-500">No reviews yet — be the first to order and review.</p>
                        )}
                    </section>

                    {/* 9. Location & contact */}
                    {(hasCoords || address) && (
                        <section>
                            <SectionHead icon={MapPin} title="Location & Contact" />
                            <div className="flex gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-[#EFE8F4]">
                                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name} in Maps`} className="relative block h-[96px] w-[44%] shrink-0 overflow-hidden rounded-xl bg-[#F6EEFA]">
                                    <iframe
                                        title={`${name} on the map`}
                                        src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        tabIndex={-1}
                                        className="pointer-events-none absolute left-1/2 top-1/2 h-[220px] w-[320px] -translate-x-1/2 -translate-y-1/2 border-0"
                                    />
                                </a>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <p className="flex items-start gap-1.5 text-[12.5px] font-semibold text-[#1A1523]">
                                        <MapPin size={14} className="mt-0.5 shrink-0 text-[#6A2385]" />
                                        <span className="line-clamp-2">{[address || city, pincode].filter(Boolean).join(' – ')}</span>
                                    </p>
                                    {distanceText && <p className="mt-0.5 pl-5 text-[11.5px] text-gray-500">{distanceText} from your location</p>}
                                    <div className="mt-auto flex items-center gap-2 pt-2">
                                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#F6EEFA] py-2 text-[12px] font-semibold text-[#6A2385] ring-1 ring-[#E4D6EC]">
                                            Get Directions <ArrowRight size={13} />
                                        </a>
                                        <button onClick={callShop} aria-label="Call" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#6A2385] ring-1 ring-[#E4D6EC]">
                                            <Phone size={16} />
                                        </button>
                                        <button onClick={openWhatsApp} aria-label="WhatsApp" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#6A2385] ring-1 ring-[#E4D6EC]">
                                            <MessageCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 10. Shop policies (platform policies that apply to every order) */}
                    <section>
                        <SectionHead icon={ShieldCheck} title="Shop Policies" />
                        <div className="grid grid-cols-5 divide-x divide-[#EFE8F4] rounded-2xl bg-white py-3 ring-1 ring-[#EFE8F4]">
                            {policies.map(({ icon: Icon, label }) => (
                                <div key={label} className="flex flex-col items-center px-1 text-center">
                                    <Icon size={20} strokeWidth={1.7} className="text-[#6A2385]" />
                                    <p className="mt-1.5 text-[10px] font-semibold leading-tight text-[#2A1F33]">{label}</p>
                                </div>
                            ))}
                        </div>
                        <p className="mt-1.5 px-1 text-[10.5px] text-gray-400">*Before the fabric is picked up.</p>
                    </section>
                </div>
            </div>

            {/* 11. Fixed booking bar */}
            <div className="fixed inset-x-0 bottom-0 z-[40] border-t border-[#EFE6F4] bg-white px-3 pt-2.5 shadow-[0_-8px_24px_-14px_rgba(42,15,56,0.35)]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-1">
                    {startsFrom > 0 && (
                        <div className="shrink-0 pr-1 sm:border-r sm:border-[#EFE8F4] sm:pr-3">
                            <p className="text-[11px] text-gray-500">Starts from</p>
                            <p className="text-[20px] font-bold leading-tight text-[#5A1A78]">₹{startsFrom.toLocaleString('en-IN')}</p>
                        </div>
                    )}
                    <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
                        <CalendarDays size={22} strokeWidth={1.7} className="shrink-0 text-[#6A2385]" />
                        <div className="min-w-0">
                            <p className="truncate text-[13px] font-bold text-[#1A1523]">Book Your Service Now</p>
                            <p className="truncate text-[11px] text-gray-500">Get custom stitching from {isVerified ? 'a verified' : 'this'} tailor</p>
                        </div>
                    </div>
                    <button onClick={goServices} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_-10px_rgba(90,26,120,0.9)] active:scale-95 sm:flex-none">
                        Book Your Service <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TailorProfile;
