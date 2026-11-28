import React from 'react';
import { ArrowLeft, Bell, AlertCircle, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const Notifications = () => {
    const navigate = useNavigate();
    const { notifications, unreadCount, markAllRead, markAsRead, loading } = useNotifications();

    const getRelativeTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getIcon = (type) => {
        switch (type) {
            case 'ORDER_CREATED':
                return { icon: <ShoppingBag size={18} />, bg: 'bg-emerald-50', color: 'text-emerald-600' };
            case 'ORDER_STATUS_UPDATED':
                return { icon: <Bell size={18} />, bg: 'bg-[#F5EDFA]', color: 'text-[#843D9B]' };
            case 'SYSTEM_NOTICE':
                return { icon: <AlertCircle size={18} />, bg: 'bg-amber-50', color: 'text-amber-600' };
            default:
                return { icon: <Bell size={18} />, bg: 'bg-gray-100', color: 'text-gray-500' };
        }
    };

    const openNotification = (notif) => {
        const isNew = !notif.isRead;
        if (isNew) markAsRead(notif._id);

        if (notif.data?.targetUrl) {
            let url = notif.data.targetUrl;
            if (url.includes('/orders')) {
                navigate('/partner/orders', { state: { highlightOrderId: notif.data.orderId } });
            } else if (url.includes('finance') || url.includes('wallet') || url.includes('withdraw')) {
                navigate('/partner/wallet');
            } else {
                navigate(url);
            }
        } else if (notif.type === 'ORDER_CREATED' || notif.type === 'ORDER_STATUS_UPDATED') {
            navigate('/partner/orders', { state: { highlightOrderId: notif.data?.orderId } });
        } else if (notif.type.includes('WITHDRAWAL')) {
            navigate('/partner/wallet');
        }
    };

    return (
        <div className="min-h-full bg-white md:bg-[#F5F5F5] flex flex-col font-sans selection:bg-[#843D9B] selection:text-white">

            {/* ── MOBILE HEADER ── */}
            <div className="md:hidden bg-white px-2 h-14 flex items-center justify-between border-b border-gray-100 sticky top-0 z-50">
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-base font-bold text-gray-900 tracking-tight">Alerts</h1>
                    {unreadCount > 0 && (
                        <span className="ml-1 text-[11px] font-semibold text-white bg-[#843D9B] min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllRead}
                        className="mr-2 text-xs font-semibold text-[#843D9B] bg-[#F5EDFA] px-3 py-1.5 rounded-full hover:bg-[#EBDDF3] active:scale-95 transition-all"
                    >
                        Mark All Read
                    </button>
                )}
            </div>

            <div className="flex-1 md:p-0 max-w-4xl mx-auto w-full">

                {/* ── DESKTOP TITLE ── */}
                <div className="hidden md:flex py-8 items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">System Notifications</h2>
                        <p className="text-sm text-gray-500 mt-1">Stay updated with your latest shop activities</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="bg-[#F5EDFA] text-[#843D9B] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#EBDDF3] transition-all active:scale-95"
                        >
                            Clear All Unread
                        </button>
                    )}
                </div>

                {/* ── NOTIFICATION LIST ── */}
                <div className="pb-20">
                    {loading && notifications.length === 0 ? (
                        <div className="mx-3 md:mx-0 divide-y divide-gray-100 md:bg-white md:rounded-2xl md:border md:border-gray-100">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex gap-3 px-1 md:px-4 py-3">
                                    <div className="h-11 w-11 rounded-xl bg-gray-100 animate-pulse shrink-0" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-3 w-2/3 rounded bg-gray-100 animate-pulse" />
                                        <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="mx-3 md:mx-0 mt-3 md:mt-0 flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-gray-100">
                            <div className="h-16 w-16 bg-[#F5EDFA] rounded-2xl flex items-center justify-center mb-4">
                                <Bell size={28} className="text-[#843D9B]" />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">Inbox Zero</h3>
                            <p className="text-xs text-gray-500 mt-1">No new alerts at the moment.</p>
                        </div>
                    ) : (
                        <div className="mx-3 md:mx-0 divide-y divide-gray-100 md:bg-white md:rounded-2xl md:border md:border-gray-100 md:overflow-hidden">
                            {notifications.map((notif) => {
                                const { icon, bg, color } = getIcon(notif.type);
                                const isNew = !notif.isRead;
                                return (
                                    <div
                                        key={notif._id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => openNotification(notif)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotification(notif); } }}
                                        className="flex gap-3 px-1 md:px-4 py-3 cursor-pointer hover:bg-gray-50/70 active:bg-gray-50 transition-colors focus:outline-none focus-visible:bg-gray-50"
                                    >
                                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color} ${isNew ? '' : 'opacity-70'}`}>
                                            {icon}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className={`text-sm leading-snug line-clamp-2 ${isNew ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                    {notif.title}
                                                </h3>
                                                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                                    <span className="text-[11px] text-gray-400">{getRelativeTime(notif.createdAt)}</span>
                                                    {isNew && <span className="h-2 w-2 bg-[#843D9B] rounded-full" aria-label="Unread" />}
                                                </div>
                                            </div>
                                            <p className={`text-xs leading-relaxed mt-0.5 line-clamp-2 ${isNew ? 'text-gray-600' : 'text-gray-400'}`}>
                                                {notif.message}
                                            </p>
                                            {notif.type && (
                                                <span className={`inline-block mt-1.5 text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${bg} ${color}`}>
                                                    {notif.type.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
