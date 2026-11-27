import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin, Star, Store, Crown } from 'lucide-react';
import useTailorStore from '../../../../store/tailorStore';
import useLocationStore from '../../../../store/locationStore';
import { useRequireAuth } from '../../../../hooks/useRequireAuth';
import { getImageUrl } from '../../../../utils/imageUrl';
import { SectionHeader } from './PopularServices';

const FAV_KEY = 'favouriteTailors';

// Favourites are a per-device convenience, kept in localStorage.
const readFavourites = () => {
    try {
        return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
    } catch {
        return new Set();
    }
};

const Avatar = ({ src, name }) => {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#843D9B] to-[#4A1560] text-3xl font-semibold text-white">
                {(name || 'T').trim().charAt(0).toUpperCase()}
            </span>
        );
    }
    return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />;
};

const TailorCard = ({ tailor, favourite, onToggleFavourite, onBook }) => {
    const name = tailor.shopName || tailor.user?.name || 'Tailor';
    const rating = Number(tailor.rating) || 0;
    const reviews = Number(tailor.totalReviews) || 0;
    const place = tailor.location?.city || tailor.location?.address?.split(',')[0]?.trim() || 'Near you';
    const photo = tailor.user?.profileImage ? getImageUrl(tailor.user.profileImage) : '';

    return (
        <div className="relative flex w-[128px] shrink-0 snap-start flex-col items-center rounded-[18px] bg-white px-2.5 pb-2.5 pt-3 shadow-[0_10px_26px_-18px_rgba(42,15,56,0.55)] ring-1 ring-[#F1ECF4]">
            <button
                type="button"
                onClick={() => onToggleFavourite(tailor._id)}
                aria-label={favourite ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
                aria-pressed={favourite}
                className="absolute right-2.5 top-2.5 text-[#7B2D93]"
            >
                <Heart size={20} className={favourite ? 'fill-[#7B2D93]' : ''} />
            </button>
            <span className="h-[62px] w-[62px] overflow-hidden rounded-full ring-2 ring-[#F3E9F8]">
                <Avatar src={photo} name={name} />
            </span>
            <h3 className="mt-2 w-full truncate text-center text-[13.5px] font-semibold text-[#1A1523]">{name}</h3>
            <p className="mt-1 flex items-center gap-1 text-[13px]">
                {reviews > 0 && rating > 0 ? (
                    <>
                        <Star size={15} className="fill-[#F5A623] text-[#F5A623]" />
                        <span className="font-medium text-[#C77F00]">{rating.toFixed(1)}</span>
                        <span className="text-gray-500">({reviews})</span>
                    </>
                ) : (
                    <span className="font-medium text-[#7B2D93]">New</span>
                )}
            </p>
            <p className="mt-0.5 flex w-full items-center justify-center gap-1 text-[12.5px] text-gray-600">
                <MapPin size={13} className="shrink-0 fill-gray-700 text-gray-700 [&>circle]:fill-white" />
                <span className="truncate">{place}</span>
            </p>
            <button
                type="button"
                onClick={() => onBook(tailor._id)}
                className="mt-2 w-full rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] py-1.5 text-[12.5px] font-semibold text-white transition-transform active:scale-95"
            >
                Book Now
            </button>
        </div>
    );
};

const CardSkeleton = () => (
    <div className="flex h-[200px] w-[128px] shrink-0 flex-col items-center rounded-[18px] bg-white p-3.5 ring-1 ring-[#F1ECF4]">
        <span className="h-[78px] w-[78px] animate-pulse rounded-full bg-[#F3EEF6]" />
        <span className="mt-3 h-3.5 w-24 animate-pulse rounded-full bg-[#F3EEF6]" />
        <span className="mt-2 h-3 w-16 animate-pulse rounded-full bg-[#F3EEF6]" />
        <span className="mt-auto h-8 w-full animate-pulse rounded-full bg-[#F3EEF6]" />
    </div>
);

/** "Featured Tailors Near You": tailors around the selected location, best rated first. */
const FeaturedTailors = () => {
    const { tailors, fetchTailors, isLoading } = useTailorStore();
    const { coordinates } = useLocationStore();
    const { requireAuth } = useRequireAuth();
    const navigate = useNavigate();
    const [favourites, setFavourites] = useState(readFavourites);

    const lat = coordinates?.lat;
    const lng = coordinates?.lng;

    useEffect(() => {
        const params = { strictRadius: true };
        if (lat && lng) {
            params.lat = lat;
            params.lng = lng;
        }
        fetchTailors(params);
    }, [fetchTailors, lat, lng]);

    const toggleFavourite = (id) => {
        setFavourites((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            try {
                localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
            } catch {
                /* storage unavailable — keep in memory only */
            }
            return next;
        });
    };

    const book = (id) => {
        if (!requireAuth('Please login to book a tailor')) return;
        navigate(`/user/tailor/${id}`);
    };

    const list = (Array.isArray(tailors) ? tailors : [])
        .slice()
        .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(b.totalReviews) || 0) - (Number(a.totalReviews) || 0))
        .slice(0, 10);
    const loading = isLoading && list.length === 0;

    return (
        <section className="mt-6">
            <SectionHeader title="Featured Tailors Near You" to="/user/tailors" icon={Crown} />
            {loading ? (
                <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
                    {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
                </div>
            ) : list.length === 0 ? (
                <div className="mx-4 flex flex-col items-center rounded-[18px] bg-white px-6 py-7 text-center ring-1 ring-[#F1ECF4] md:mx-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3E9F8] text-[#7B2D93]">
                        <Store size={22} />
                    </span>
                    <p className="mt-3 text-[14px] font-semibold text-[#1A1523]">No tailors in this area yet</p>
                    <p className="mt-1 text-[12px] text-gray-500">Try changing your location, or browse all tailors.</p>
                    <Link to="/user/tailors" className="mt-4 rounded-full bg-[#7B2D93] px-5 py-2 text-[12px] font-bold text-white">
                        Browse tailors
                    </Link>
                </div>
            ) : (
                <div className="no-scrollbar flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 md:px-6">
                    {list.map((t) => (
                        <TailorCard
                            key={t._id}
                            tailor={t}
                            favourite={favourites.has(t._id)}
                            onToggleFavourite={toggleFavourite}
                            onBook={book}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default FeaturedTailors;
