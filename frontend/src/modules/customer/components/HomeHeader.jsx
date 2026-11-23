import React, { useState, useEffect } from 'react';
import { Bell, X, MapPin, ChevronDown, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LocationModal from './LocationModal';
import useLocationStore from '../../../store/locationStore';
import useBrandingStore from '../../../store/brandingStore';
import AnimatedSearchBar from './AnimatedSearchBar';
import { useNotifications } from '../context/NotificationContext';

/** Splits "Area - full address" into a bold area name and a lighter remainder. */
const splitAddress = (address) => {
    if (!address) return ['Select location', ''];
    const parts = String(address).split(',').map((p) => p.trim()).filter(Boolean);
    return [parts[0], parts.slice(1, 3).join(', ')];
};

const HomeHeader = () => {
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const { notifications = [], unreadCount, markAsRead, markAllRead } = useNotifications();
    const [showLocationModal, setShowLocationModal] = useState(false);
    const { address: location } = useLocationStore();
    const { appName, logos } = useBrandingStore();
    const [logoFailed, setLogoFailed] = useState(false);
    const [area, rest] = splitAddress(location);
    const brandName = String(appName || 'Sewzella').trim();
    const isSewzella = brandName.toLowerCase() === 'sewzella';

    const handleBellClick = () => {
        const nextState = !showNotifications;
        setShowNotifications(nextState);
        if (nextState && unreadCount > 0 && markAllRead) markAllRead();
    };

    useEffect(() => {
        document.body.style.overflow = showNotifications || showLocationModal ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [showNotifications, showLocationModal]);

    return (
        <>
            {/* Brand row + location */}
            <div className="relative z-20 bg-gradient-to-b from-[#F3E8F8] to-[#FBF7FD] px-4 pb-3 pt-4 md:px-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        {/* Logo: gradient frame + white tile; the image is zoomed slightly to trim built-in whitespace */}
                        <div className="shrink-0 rounded-[20px] bg-gradient-to-br from-[#C79BDA] via-[#843D9B] to-[#5A1F6E] p-[2px] shadow-[0_10px_22px_-10px_rgba(90,31,110,0.6)]">
                            <div className="flex h-[56px] w-[56px] items-center justify-center overflow-hidden rounded-[18px] bg-white">
                                {logos?.customer && !logoFailed ? (
                                    <img
                                        src={logos.customer}
                                        alt={appName || 'Sewzella'}
                                        className="h-full w-full scale-[1.18] object-contain"
                                        onError={() => setLogoFailed(true)}
                                    />
                                ) : (
                                    <span className="text-2xl font-semibold text-[#843D9B]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>S</span>
                                )}
                            </div>
                        </div>
                        <div className="min-w-0 leading-none">
                            <p
                                className="truncate text-[24px] font-semibold leading-none tracking-[-0.01em] text-[#1A1523]"
                                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                                {isSewzella ? (
                                    <>Sew<em className="font-medium italic text-[#843D9B]">zella</em></>
                                ) : (
                                    brandName
                                )}
                            </p>
                            <p className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-[8.5px] font-semibold uppercase tracking-[0.26em] text-[#8E7A9B]">
                                <span className="h-px w-3 bg-[#C9A8D8]" />
                                Stitched · Styled · You
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            onClick={handleBellClick}
                            aria-label="Notifications"
                            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#843D9B]/10 text-[#843D9B] transition-transform active:scale-95"
                        >
                            <Bell size={19} />
                            {unreadCount > 0 && (
                                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border border-white bg-rose-500" />
                            )}
                        </button>
                        <button
                            onClick={() => navigate('/user/profile')}
                            aria-label="Profile"
                            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#843D9B]/10 text-[#843D9B] transition-transform active:scale-95"
                        >
                            <User size={19} />
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="mt-3.5 flex w-full items-center gap-2 rounded-2xl bg-[#843D9B]/[0.07] px-3.5 py-2.5 text-left ring-1 ring-[#843D9B]/15 transition-colors hover:bg-[#843D9B]/10"
                >
                    <MapPin size={17} className="shrink-0 text-[#843D9B]" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                        <span className="font-bold text-gray-900">{area}</span>
                        {rest && <span className="text-gray-500"> - {rest}</span>}
                    </span>
                    <ChevronDown size={16} className="shrink-0 text-gray-500" />
                </button>
            </div>

            {/* Search stays pinned while scrolling */}
            <div className="sticky top-0 z-30 bg-[#FBF7FD]/95 px-4 pb-3 pt-1 backdrop-blur-md md:px-6">
                <div className="h-12 rounded-2xl bg-white shadow-[0_8px_20px_-14px_rgba(74,21,96,0.45)] ring-1 ring-[#E9DDF0]">
                    <AnimatedSearchBar className="h-full w-full" hideBackground />
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
        </>
    );
};

export default HomeHeader;
