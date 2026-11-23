import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, X, Navigation, ChevronDown } from 'lucide-react';
import LocationModal from './LocationModal';
import useLocationStore from '../../../store/locationStore';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedSearchBar from './AnimatedSearchBar';
import { useNotifications } from '../context/NotificationContext';

const HomeHeader = () => {
    const [showNotifications, setShowNotifications] = useState(false);
    const { notifications = [], unreadCount, markAsRead, markAllRead } = useNotifications();

    // Search stays tucked away until the search icon is tapped
    const [showSearch, setShowSearch] = useState(false);
    const searchRef = useRef(null);
    const toggleSearch = () => setShowSearch((v) => !v);

    const [showLocationModal, setShowLocationModal] = useState(false);
    const { address: location } = useLocationStore();

    const handleBellClick = () => {
        const nextState = !showNotifications;
        setShowNotifications(nextState);
        if (nextState && unreadCount > 0 && markAllRead) {
            markAllRead();
        }
    };

    useEffect(() => {
        if (showNotifications || showLocationModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => document.body.style.overflow = 'unset';
    }, [showNotifications, showLocationModal]);

    return (
        <>
            <div className="bg-[#843D9B] pt-4 md:pt-6 pb-5 px-4 md:px-6 relative z-20 w-full overflow-hidden rounded-b-[28px] shadow-[0_12px_28px_-14px_rgba(74,21,96,0.55)]">
                {/* soft highlight so the curved edge reads as a designed surface */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(255,255,255,0.18),transparent_60%)]" />
                {/* Top Row: Location & Icons */}
                <div className="relative flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0 pr-4" onClick={() => setShowLocationModal(true)}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 border border-white/40 shrink-0">
                            <Navigation size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-white/80 font-medium leading-none mb-1">Delivering to</p>
                            <div className="flex items-center gap-1">
                                <span className="text-xs sm:text-sm font-bold text-white truncate">{location || 'Select Location'}</span>
                                <ChevronDown size={14} className="text-white shrink-0" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleBellClick}
                            aria-label="Notifications"
                            className="w-10 h-10 bg-white/10 rounded-xl text-white border border-white/20 flex items-center justify-center relative active:scale-95 transition-transform"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full border border-[#843D9B]"></span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={toggleSearch}
                            aria-label={showSearch ? 'Close search' : 'Search'}
                            aria-expanded={showSearch}
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center relative active:scale-95 transition-all ${
                                showSearch ? 'bg-white text-[#843D9B] border-white' : 'bg-white/10 text-white border-white/20'
                            }`}
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={showSearch ? 'close' : 'search'}
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="flex"
                                >
                                    {showSearch ? <X size={18} /> : <Search size={18} />}
                                </motion.span>
                            </AnimatePresence>
                        </button>
                    </div>
                </div>

            </div>

            {/* Search Bar Row — slides open from under the header; collapsed (no space) when hidden */}
            <AnimatePresence initial={false}>
                {showSearch && (
                    <motion.div
                        key="search-strip"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        onAnimationComplete={() => {
                            if (showSearch) searchRef.current?.querySelector('input')?.focus();
                        }}
                        className="relative z-10 w-full overflow-hidden bg-white"
                    >
                        <div ref={searchRef} className="px-4 md:px-6 pt-4 pb-2">
                            <div className="bg-white rounded-[1.25rem] flex items-center relative overflow-hidden pl-1 pr-2 h-[46px] sm:h-[50px] ring-1 ring-[#E9E3EE] shadow-[0_6px_18px_-12px_rgba(42,15,56,0.35)]">
                                <div className="flex-1 h-full min-w-0">
                                    <AnimatedSearchBar className="h-full bg-transparent shadow-none border-none text-sm w-full" hideBackground={true} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notification Dropdown Portal */}
            <AnimatePresence>
                {showNotifications && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNotifications(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[110]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute top-20 right-4 w-[calc(100vw-2rem)] max-w-sm mx-auto bg-white rounded-3xl shadow-2xl p-5 z-[120] overflow-hidden"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                                <button
                                    onClick={() => setShowNotifications(false)}
                                    className="p-1.5 bg-gray-50 rounded-full text-gray-400"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-3 max-h-72 overflow-y-auto">
                                {(notifications || []).length > 0 ? (notifications || []).map(n => (
                                    <div
                                        key={n._id}
                                        onClick={() => markAsRead(n._id)}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${!n.isRead ? 'bg-purple-50/50 border-purple-100' : 'bg-white border-gray-100'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-gray-900 leading-tight">{n.title}</span>
                                            <span className="text-[9px] font-bold text-gray-400">
                                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 font-medium leading-snug">{n.message}</p>
                                    </div>
                                )) : (
                                    <div className="py-8 text-center">
                                        <Bell size={32} className="mx-auto text-gray-200 mb-2" />
                                        <p className="text-xs font-bold text-gray-400">No new notifications</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <LocationModal 
                isOpen={showLocationModal} 
                onClose={() => setShowLocationModal(false)} 
            />
        </>
    );
};

export default HomeHeader;
