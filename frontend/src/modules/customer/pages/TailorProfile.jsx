import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Award, Heart, Share2, CheckCircle2, Layers, Wand2, BadgeCheck, Navigation, MessageSquareText } from 'lucide-react';
import { motion } from 'framer-motion';
import useCheckoutStore from '../../../store/checkoutStore';
import useBrandingStore from '../../../store/brandingStore';
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

/** The tailor's own photo, or their initial on brand purple — never a stock photo. */
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

const SectionTitle = ({ title, subtitle }) => (
    <div className="mb-3 px-1">
        <h3 className="text-[17px] font-semibold text-[#1A1523]" style={{ fontFamily: SANS }}>{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-gray-500">{subtitle}</p>}
    </div>
);

const TailorProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const setTailorInStore = useCheckoutStore(state => state.setTailor);
    const appName = useBrandingStore((s) => s.appName) || 'Sewzella';
    const [tailor, setTailor] = useState(null);
    const [fabrics, setFabrics] = useState([]);
    const [workSamples, setWorkSamples] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(() => readFavourites().has(id));
    const [bioOpen, setBioOpen] = useState(false);
    const [addressOpen, setAddressOpen] = useState(false);

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
                setTailor(tailorRes.data.data);
                setFabrics(fabricsRes.data.data);

                // Merge work samples and services for the portfolio view
                const uniqueContent = new Map();

                // Add work samples first
                (samplesRes.data.data || []).forEach(item => {
                    uniqueContent.set(item._id, { ...item, type: 'sample' });
                });

                // Add services, mapping basePrice to laborPrice
                (servicesRes.data.data || []).forEach(item => {
                    if (!uniqueContent.has(item._id)) {
                        uniqueContent.set(item._id, {
                            ...item,
                            type: 'service',
                            isBookable: true,
                            laborPrice: item.basePrice
                        });
                    }
                });

                setWorkSamples(Array.from(uniqueContent.values()));
                setIsLoading(false);
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
                <div className="h-44 animate-pulse bg-[#EADCF2]" />
                <div className="-mt-12 px-4">
                    <div className="space-y-4 rounded-[28px] bg-white p-5 ring-1 ring-[#F1ECF4]">
                        <div className="flex gap-4">
                            <span className="h-20 w-20 animate-pulse rounded-2xl bg-[#F3EEF6]" />
                            <div className="flex-1 space-y-2 pt-2">
                                <span className="block h-5 w-2/3 animate-pulse rounded-full bg-[#F3EEF6]" />
                                <span className="block h-3 w-1/2 animate-pulse rounded-full bg-[#F3EEF6]" />
                            </div>
                        </div>
                        <span className="block h-16 animate-pulse rounded-2xl bg-[#F3EEF6]" />
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
    const photo = tailor.user?.profileImage ? getImageUrl(tailor.user.profileImage) : '';

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: name,
                    text: `Check out ${name} on ${appName}!`,
                    url: window.location.href,
                });
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
    const rating = Number(tailor.rating) || 0;
    const reviews = Number(tailor.totalReviews) || 0;
    const hasReviews = rating > 0 && reviews > 0;
    const experience = Number(tailor.experienceInYears) || 0;
    const ordersDone = Number(tailor.ordersCompleted) || 0;
    const specialities = (tailor.specializations || []).map((s) => String(s).trim()).filter(Boolean);
    const bio = (tailor.bio || '').trim();
    const city = tailor.location?.city || '';
    const address = tailor.location?.address || tailor.address || [tailor.location?.city, tailor.location?.state].filter(Boolean).join(', ');

    const [lng, lat] = Array.isArray(tailor.location?.coordinates) ? tailor.location.coordinates : [];
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    const mapQuery = hasCoords ? `${lat},${lng}` : encodeURIComponent(`${name} ${address}`);
    const directionsUrl = hasCoords
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

    const stats = [
        { icon: Star, value: hasReviews ? rating.toFixed(1) : 'New', label: hasReviews ? `${reviews} review${reviews > 1 ? 's' : ''}` : 'No reviews yet', tone: 'text-amber-500' },
        { icon: CheckCircle2, value: ordersDone > 0 ? `${ordersDone}` : '0', label: 'Orders done', tone: 'text-emerald-600' },
        experience > 0 && { icon: Award, value: `${experience} yr${experience > 1 ? 's' : ''}`, label: 'Experience', tone: 'text-[#6A2385]' },
    ].filter(Boolean);

    const goServices = () => {
        setTailorInStore(tailor._id, name);
        navigate('/user/services', { state: { tailorId: tailor._id, tailorName: name } });
    };
    const goCustom = () => {
        setTailorInStore(tailor._id, name);
        navigate('/user/custom-design', { state: { tailorId: tailor._id, tailorName: name } });
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-white pb-32 font-sans">
            {/* 1. Cover: the tailor's own photo blurred, or a plain brand gradient */}
            <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#7B2D93] via-[#6A2385] to-[#3E0F52]">
                {photo && <img src={photo} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-xl" />}
                <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-transparent" />

                <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label="Back"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md active:scale-90"
                    >
                        <ArrowLeft size={19} />
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={handleShare}
                            aria-label="Share"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md active:scale-90"
                        >
                            <Share2 size={17} />
                        </button>
                        <button
                            onClick={toggleFavourite}
                            aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                            aria-pressed={isFavorite}
                            className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 backdrop-blur-md active:scale-90 ${isFavorite ? 'bg-white text-rose-500 ring-white' : 'bg-white/15 text-white ring-white/25'}`}
                        >
                            <Heart size={17} className={isFavorite ? 'fill-current' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Profile card */}
            <div className="relative z-30 -mt-14 px-4">
                <motion.div
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="rounded-[28px] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(42,15,56,0.55)] ring-1 ring-[#F1ECF4] sm:p-6"
                >
                    <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                            <Photo src={photo} name={name} className="h-[84px] w-[84px] rounded-[22px] ring-4 ring-white shadow-lg" />
                            {tailor.isAvailable && (
                                <span title="Accepting orders" className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                            <h1 className="flex items-center gap-1.5 text-[21px] font-bold leading-tight text-[#1A1523]" style={{ fontFamily: SANS }}>
                                <span className="truncate">{name}</span>
                                {isVerified && <BadgeCheck size={19} className="shrink-0 fill-[#6A2385] text-white" />}
                            </h1>
                            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-gray-500">
                                {city && (
                                    <span className="flex items-center gap-1"><MapPin size={12} /> {city}</span>
                                )}
                                {tailor.isAvailable ? (
                                    <span className="font-medium text-emerald-600">● Accepting orders</span>
                                ) : (
                                    <span className="text-gray-400">● Currently busy</span>
                                )}
                            </p>
                            {specialities.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {specialities.slice(0, 4).map((s) => (
                                        <span key={s} className="rounded-full bg-[#F6EEFA] px-2.5 py-0.5 text-[11px] font-medium text-[#6A2385]">{titleCase(s)}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats — real numbers only */}
                    <div className={`mt-4 grid gap-2 ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {stats.map(({ icon: StatIcon, value, label, tone }) => (
                            <div key={label} className="rounded-2xl bg-[#FBF7FD] px-2 py-2.5 text-center ring-1 ring-[#F1E8F5]">
                                <StatIcon size={17} className={`mx-auto ${tone} ${StatIcon === Star && hasReviews ? 'fill-amber-400' : ''}`} />
                                <span className="mt-1 block text-[15px] font-bold leading-none text-[#1A1523]">{value}</span>
                                <span className="mt-1 block text-[10.5px] text-gray-500">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* About — only the tailor's own words */}
                    {bio && (
                        <div className="mt-4">
                            <h3 className="mb-1 text-[13px] font-semibold text-[#1A1523]">About</h3>
                            <p className={`text-[13px] leading-relaxed text-gray-600 ${bioOpen ? '' : 'line-clamp-3'}`}>{bio}</p>
                            {bio.length > 160 && (
                                <button onClick={() => setBioOpen((v) => !v)} className="mt-1 text-[12px] font-semibold text-[#6A2385]">
                                    {bioOpen ? 'Show less' : 'Read more'}
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* 3. Location — one compact row: small live map, address, directions */}
            {(hasCoords || address) && (
                <div className="mt-5 px-4">
                    <div className="flex items-center gap-3 rounded-[20px] bg-white p-2.5 ring-1 ring-[#F1ECF4] shadow-[0_10px_26px_-20px_rgba(42,15,56,0.6)]">
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${name} in Maps`}
                            className="relative block h-[84px] w-[84px] shrink-0 overflow-hidden rounded-2xl bg-[#F6EEFA]"
                        >
                            <iframe
                                title={`${name} on the map`}
                                src={`https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                tabIndex={-1}
                                className="pointer-events-none absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 border-0"
                            />
                        </a>
                        <button
                            type="button"
                            onClick={() => setAddressOpen((v) => !v)}
                            className="min-w-0 flex-1 text-left"
                        >
                            <span className="flex items-center gap-1 text-[13px] font-semibold text-[#1A1523]">
                                <MapPin size={13} className="text-[#6A2385]" /> Shop location
                            </span>
                            <span className={`mt-0.5 block text-[12px] leading-snug text-gray-500 ${addressOpen ? '' : 'line-clamp-2'}`}>
                                {address || city}
                            </span>
                        </button>
                        <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Directions"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5A1A78] text-white active:scale-95"
                        >
                            <Navigation size={16} />
                        </a>
                    </div>
                </div>
            )}

            {/* 4. Fabrics */}
            {fabrics && fabrics.length > 0 && (
                <div id="tailor-fabrics" className="mt-6 px-4">
                    <SectionTitle title="Fabric collection" subtitle="Fabrics available at this shop" />
                    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3">
                        {fabrics.map((fabric) => (
                            <button
                                key={fabric._id}
                                type="button"
                                onClick={() => {
                                    setTailorInStore(tailor._id, name);
                                    navigate(`/user/fabric/${fabric._id}`);
                                }}
                                className="w-40 shrink-0 snap-start overflow-hidden rounded-[18px] bg-white text-left ring-1 ring-[#F1ECF4] shadow-[0_10px_22px_-18px_rgba(42,15,56,0.6)]"
                            >
                                <div className="relative aspect-[4/5] bg-[#F6EEFA]">
                                    <Photo src={fabric.images?.[0] || fabric.image ? getImageUrl(fabric.images?.[0] || fabric.image) : ''} name={fabric.name} className="h-full w-full" />
                                    {fabric.category?.name && (
                                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#6A2385]">{fabric.category.name}</span>
                                    )}
                                </div>
                                <div className="p-2.5">
                                    <h4 className="truncate text-[13px] font-semibold text-[#1A1523]">{fabric.name}</h4>
                                    <p className="mt-0.5 text-[13px] font-bold text-[#6A2385]">₹{Number(fabric.price || 0).toLocaleString('en-IN')}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. Services & work */}
            <div id="signature-designs" className="mt-6 px-4">
                <SectionTitle
                    title="Services & work"
                    subtitle={workSamples.length ? 'Tap a service to book it' : undefined}
                />
                {workSamples.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {workSamples.map((sample, idx) => {
                            const price = Number(sample.laborPrice || sample.basePrice) || 0;
                            const img = sample.image && sample.image !== 'no-photo.jpg' ? getImageUrl(sample.image) : '';
                            return (
                                <motion.button
                                    key={sample._id}
                                    type="button"
                                    initial={{ opacity: 0, y: 12 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: Math.min(idx, 6) * 0.05 }}
                                    onClick={() => {
                                        if (sample.type === 'service') {
                                            setTailorInStore(tailor._id, name);
                                            navigate(`/user/services/${sample._id}`, { state: { tailorId: tailor._id } });
                                        }
                                    }}
                                    className={`overflow-hidden rounded-[18px] bg-white text-left ring-1 ring-[#F1ECF4] shadow-[0_10px_22px_-18px_rgba(42,15,56,0.6)] ${sample.type === 'service' ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
                                >
                                    <div className="relative aspect-[4/5] bg-[#F6EEFA]">
                                        <Photo src={img} name={sample.title} className="h-full w-full" />
                                        {sample.isBookable && (
                                            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">Bookable</span>
                                        )}
                                    </div>
                                    <div className="p-2.5">
                                        <h4 className="truncate text-[13px] font-semibold text-[#1A1523]">{sample.title}</h4>
                                        <div className="mt-0.5 flex items-center justify-between gap-2">
                                            <span className="truncate text-[11px] text-gray-500">{sample.category?.name || (sample.type === 'sample' ? 'Past work' : 'Service')}</span>
                                            {price > 0 && <span className="shrink-0 text-[12.5px] font-bold text-[#6A2385]">₹{price.toLocaleString('en-IN')}</span>}
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center rounded-[20px] bg-white px-6 py-8 text-center ring-1 ring-[#F1ECF4]">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E9F8] text-[#6A2385]">
                            <MessageSquareText size={22} />
                        </span>
                        <p className="mt-3 text-[13.5px] font-semibold text-[#1A1523]">No services listed yet</p>
                        <p className="mt-1 text-[12px] text-gray-500">You can still place a custom order with this tailor.</p>
                    </div>
                )}
            </div>

            {/* Sticky actions */}
            <div className="fixed inset-x-0 bottom-0 z-[40] rounded-t-[22px] border-t border-[#EFE6F4] bg-white/95 px-4 pt-3 shadow-[0_-6px_20px_-12px_rgba(42,15,56,0.3)] backdrop-blur-md" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
                <div className="mx-auto flex max-w-md gap-3">
                    <button
                        onClick={goServices}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-[#5A1A78] bg-white py-3 text-[13px] font-semibold text-[#5A1A78] active:scale-95"
                    >
                        <Layers size={16} /> Services
                    </button>
                    <button
                        onClick={goCustom}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] py-3 text-[13px] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(90,26,120,0.9)] active:scale-95"
                    >
                        <Wand2 size={16} /> Custom Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TailorProfile;
