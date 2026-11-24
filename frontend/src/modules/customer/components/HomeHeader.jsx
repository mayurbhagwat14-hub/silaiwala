import React, { useState, useEffect } from 'react';
import { Bell, X, MapPin, ChevronDown, SlidersHorizontal, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LocationModal from './LocationModal';
import useLocationStore from '../../../store/locationStore';
import useAuthStore from '../../../store/authStore';
import { getImageUrl } from '../../../utils/imageUrl';
import AnimatedSearchBar from './AnimatedSearchBar';
import TailorFilterDrawer from './TailorFilterDrawer';
import { useNotifications } from '../context/NotificationContext';
import { DEFAULT_TAILOR_FILTERS, tailorFiltersToQuery } from '../utils/tailorFilters';

/** "Lal Chowk, Srinagar, Jammu and Kashmir 190001, India" → ["Lal Chowk", "Srinagar, J&K"] (no pincode/country). */
const splitLocation = (address) => {
    const parts = String(address || '')
        .split(',')
        .map((p) => p.replace(/[-\s]*\d{5,6}\b/g, '').trim())
        .filter((p) => p && !/^india$/i.test(p))
        .map((p) => p.replace(/^Jammu\s*(and|&)\s*Kashmir$/i, 'J&K'));
    if (!parts.length) return ['Select location', ''];
    return [parts[0], parts.slice(1, 3).join(', ')];
};

/**
 * Home header: delivery location on the left; notification bell (unread count) and profile
 * on the right; then a pinned search bar.
 */
const HomeHeader = () => {
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const { notifications = [], unreadCount, markAsRead, markAllRead } = useNotifications();
    const [showLocationModal, setShowLocationModal] = useState(false);
    const { address: location } = useLocationStore();
    const user = useAuthStore((st) => st.user);
    const [avatarFailed, setAvatarFailed] = useState(false);
    const avatar = user?.profileImage ? getImageUrl(user.profileImage) : '';
    const [area, rest] = splitLocation(location);
    const [showFilters, setShowFilters] = useState(false);

    // Apply in the drawer → open the tailor list with those filters in the URL.
    const applyFilters = (filters) => {
        const query = tailorFiltersToQuery(filters);
        navigate(`/user/tailors${query ? `?${query}` : ''}`);
    };

    useEffect(() => {
        document.body.style.overflow = showNotifications || showLocationModal || showFilters ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showNotifications, showLocationModal, showFilters]);

    const openNotifications = () => {
        setShowNotifications(true);
        if (unreadCount > 0 && markAllRead) markAllRead();
    };

    return (
        <>
            <div className="relative z-20 bg-white px-4 pb-3 pt-4 md:px-6">
                <div className="flex items-center justify-between gap-3">
                    {/* Location: bold area on top, rest of the address below */}
                    <button
                        type="button"
                        onClick={() => setShowLocationModal(true)}
                        title={location || 'Select location'}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#5A1A78] shadow-[0_6px_14px_-10px_rgba(90,31,110,0.5)] ring-1 ring-[#EFE6F4]">
                            <MapPin size={19} className="fill-[#5A1A78] [&>circle]:fill-white" />
                        </span>
                        <span className="min-w-0">
                            <span className="flex items-center gap-0.5 text-[15px] font-bold leading-tight text-[#1A1523]">
                                <span className="truncate">{area}</span>
                                <ChevronDown size={16} className="shrink-0 text-[#5A1A78]" />
                            </span>
                            {rest && <span className="block truncate text-[11.5px] text-gray-500">{rest}</span>}
                        </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                        {/* Notifications */}
                        <button
                            type="button"
                            onClick={openNotifications}
                            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#5A1A78] shadow-[0_6px_14px_-10px_rgba(90,31,110,0.5)] ring-1 ring-[#EFE6F4] transition-transform active:scale-95"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#E5243B] px-1 text-[9.5px] font-bold leading-none text-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Profile */}
                        <Link
                            to="/user/profile"
                            aria-label="Profile"
                            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-[#5A1A78] shadow-[0_6px_14px_-10px_rgba(90,31,110,0.5)] ring-1 ring-[#EFE6F4] transition-transform active:scale-95"
                        >
                            {avatar && !avatarFailed ? (
                                <img src={avatar} alt="" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
                            ) : (
                                <User size={19} />
                            )}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Search stays pinned while scrolling */}
            <div className="sticky top-0 z-30 bg-white px-4 pb-3 pt-1 md:px-6">
                <div className="flex h-[54px] items-center rounded-full bg-white pr-2 shadow-[0_10px_24px_-16px_rgba(74,21,96,0.5)] ring-1 ring-[#EEE4F3]">
                    <AnimatedSearchBar className="h-full min-w-0 flex-1" hideBackground />
                    <span className="mx-1 h-6 w-px bg-[#EEE4F3]" />
                    <button
                        type="button"
                        onClick={() => setShowFilters(true)}
                        aria-label="Filters"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#7B2D93] hover:bg-[#F5ECF9]"
                    >
                        <SlidersHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <AnimatePresence>
                {showNotifications && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNotifications(false)}
                            className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed left-4 right-4 top-20 z-[120] mx-auto max-w-sm overflow-hidden rounded-3xl bg-white p-5 shadow-2xl"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                                <button onClick={() => setShowNotifications(false)} className="rounded-full bg-gray-50 p-1.5 text-gray-400" aria-label="Close">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="max-h-72 space-y-3 overflow-y-auto">
                                {(notifications || []).length > 0 ? (notifications || []).map((n) => (
                                    <div
                                        key={n._id}
                                        onClick={() => markAsRead(n._id)}
                                        className={`cursor-pointer rounded-2xl border p-3 transition-all ${!n.isRead ? 'border-purple-100 bg-purple-50/50' : 'border-gray-100 bg-white'}`}
                                    >
                                        <div className="mb-1 flex items-start justify-between">
                                            <span className="text-xs font-bold leading-tight text-gray-900">{n.title}</span>
                                            <span className="text-[9px] font-bold text-gray-400">
                                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-medium leading-snug text-gray-500">{n.message}</p>
                                    </div>
                                )) : (
                                    <div className="py-8 text-center">
                                        <Bell size={32} className="mx-auto mb-2 text-gray-200" />
                                        <p className="text-xs font-bold text-gray-400">No new notifications</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <LocationModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} />
            <TailorFilterDrawer
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                filters={DEFAULT_TAILOR_FILTERS}
                setFilters={applyFilters}
            />
        </>
    );
};

export default HomeHeader;
