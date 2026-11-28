import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Truck,
    FileCheck,
    CreditCard,
    Wallet,
    Ruler,
    Wand2,
    AlertTriangle,
    Bell,
    RefreshCw,
    House,
    Shirt,
    User
} from 'lucide-react';
import useBrandingStore from '../store/brandingStore';
import { useTailorAuth } from '../modules/tailor/context/AuthContext';
import { useNotifications } from '../modules/tailor/context/NotificationContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../modules/tailor/services/api';
import { getToken } from '../utils/auth';
import useSocketStore from '../store/socketStore';

// Warm the code of the partner tabs once the shell is up, so switching tabs never waits on a download.
// Same paths as the React.lazy imports in routes.jsx, so they resolve to the same chunks.
const prefetchPartnerPages = () => {
    import('../modules/tailor/pages/Overview');
    import('../modules/tailor/pages/Orders');
    import('../modules/tailor/pages/Products');
    import('../modules/tailor/pages/TailorEarnings');
    import('../modules/tailor/pages/ProfileSettings');
    import('../modules/tailor/pages/Notifications');
    import('../modules/tailor/pages/TailorShopOrders');
    import('../modules/tailor/pages/TailorAlterations');
    import('../modules/tailor/pages/TailorCustomDesigns');
    import('../modules/tailor/pages/ReportedIssues');
};

// Pages opened from Profile keep the Profile tab highlighted
const PROFILE_SUBPAGES = ['/partner/reviews', '/partner/pickup-info', '/partner/privacy', '/partner/edit-profile'];

const TailorLayout = () => {
    useEffect(() => {
        const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
        idle(prefetchPartnerPages);
    }, []);

    const location = useLocation();
    const navigate = useNavigate();
    const { user, status } = useTailorAuth();
    usePushNotifications(user);
    const notificationContext = useNotifications();
    const unreadCount = notificationContext?.unreadCount || 0;
    const isOverview = location.pathname === '/partner' || location.pathname === '/partner/';
    const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
    const { appName, logos } = useBrandingStore();

    // ── PULL-TO-REFRESH STATE FOR ALL TAILOR PAGES ──
    const mainRef = useRef(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const touchStartRef = useRef({ y: 0, active: false });

    // ── VIRTUAL KEYBOARD DETECTION FOR MOBILE FOOTER ──
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                const isShort = window.visualViewport.height < window.innerHeight - 140;
                setIsKeyboardOpen(isShort);
            }
        };

        const handleFocusIn = (e) => {
            const tag = e.target?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
                setIsKeyboardOpen(true);
            }
        };

        const handleFocusOut = () => {
            setTimeout(() => {
                const activeTag = document.activeElement?.tagName?.toLowerCase();
                if (activeTag !== 'input' && activeTag !== 'textarea' && activeTag !== 'select' && !document.activeElement?.isContentEditable) {
                    setIsKeyboardOpen(false);
                }
            }, 100);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        }
        window.addEventListener('focusin', handleFocusIn);
        window.addEventListener('focusout', handleFocusOut);

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            }
            window.removeEventListener('focusin', handleFocusIn);
            window.removeEventListener('focusout', handleFocusOut);
        };
    }, []);

    const handleTouchStart = (e) => {
        if (!mainRef.current) return;
        if (mainRef.current.scrollTop <= 2) {
            touchStartRef.current = {
                y: e.touches[0].clientY,
                active: true
            };
        } else {
            touchStartRef.current.active = false;
        }
    };

    const handleTouchMove = (e) => {
        if (!touchStartRef.current.active || !mainRef.current || isRefreshing) return;
        if (mainRef.current.scrollTop > 2) {
            touchStartRef.current.active = false;
            setPullDistance(0);
            return;
        }

        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStartRef.current.y;

        if (diff > 0) {
            const distance = Math.min(diff * 0.45, 90);
            setPullDistance(distance);
        } else {
            setPullDistance(0);
        }
    };

    const handleTouchEnd = () => {
        if (!touchStartRef.current.active) return;
        touchStartRef.current.active = false;

        if (pullDistance >= 60 && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(0);
            setTimeout(() => {
                if (typeof window !== 'undefined') {
                    window.scrollTo(0, 0);
                }
                window.location.reload();
            }, 300);
        } else {
            setPullDistance(0);
        }
    };

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo(0, 0);
        }
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    }, [location.pathname]);

    useEffect(() => {
        const userId = user?._id || user?.id;
        if (!userId) return;
        
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('/tailors/dashboard');
                if (response.data.success && response.data.data.summary) {
                    setPendingOrdersCount(response.data.data.summary.pendingOrders || 0);
                }
            } catch (error) {
                console.error("Failed to fetch pending orders count:", error);
            }
        };

        fetchDashboardData();

        const token = getToken();
        if (!token) return;

        const socket = useSocketStore.getState().connect(String(userId), 'tailor');

        const refreshPendingCount = () => {
            fetchDashboardData();
        };

        if (socket) {
            socket.on('new_order', refreshPendingCount);
            socket.on('receive_new_order', refreshPendingCount);
            socket.on('order_status_updated', refreshPendingCount);
        }

        return () => {
            if (socket) {
                socket.off('new_order', refreshPendingCount);
                socket.off('receive_new_order', refreshPendingCount);
                socket.off('order_status_updated', refreshPendingCount);
            }
        };
    }, [user?._id, user?.id]);

    const menuItems = [
        { icon: <House size={20} />, label: 'Home', path: '/partner' },
        { icon: <ClipboardList size={20} />, label: 'Orders', path: '/partner/orders', badge: pendingOrdersCount },
        { icon: <Ruler size={20} />, label: 'Alterations', mobileLabel: 'Alt.', path: '/partner/alterations' },
        { icon: <Wand2 size={20} />, label: 'Custom Designs', mobileLabel: 'Custom', path: '/partner/custom-designs' },
        { icon: <AlertTriangle size={20} />, label: 'Issues', path: '/partner/issues' },
        { icon: <Shirt size={20} />, label: 'Services', path: '/partner/products' },
        { icon: <Wallet size={20} />, label: 'Wallet', path: '/partner/wallet' },
        { icon: <User size={20} />, label: 'Profile', path: '/partner/settings' },
    ];

    return (
        <div className="h-screen md:h-[100dvh] w-full bg-white flex flex-col md:flex-row font-sans selection:bg-[#843D9B] selection:text-white overflow-hidden">
            {/* ── SIDEBAR (DESKTOP ONLY) ── */}
            <aside className="hidden md:flex flex-col w-72 bg-[#0A0A0A] border-r border-[#1C1C1C] h-screen shrink-0 z-50">
                <div className="p-8">
                    <Link to="/partner" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/5 overflow-hidden border border-gray-800 rotate-3 group-hover:rotate-0 transition-transform">
                            <img src={logos.tailor} alt={appName} className="w-full h-full object-contain p-0.5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white leading-none tracking-tight">
                                {appName}
                            </h1>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Partner Portal</p>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path || (item.path === '/partner/settings' && PROFILE_SUBPAGES.includes(location.pathname));
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                    isActive 
                                        ? 'bg-[#843D9B] text-white shadow-xl shadow-[#843D9B]/20' 
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {React.cloneElement(item.icon, { size: 18, strokeWidth: isActive ? 2.5 : 2 })}
                                <span className="flex-1">{item.label}</span>
                                {item.badge > 0 && (
                                    <span className="h-5 min-w-[20px] px-1.5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-rose-500/20">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6">
                    <div className="bg-[#1C1C1C] rounded-[2rem] p-5 border border-white/5 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[#843D9B]/10 rounded-full blur-2xl group-hover:bg-[#843D9B]/20 transition-all"></div>
                        <div className="flex items-center gap-3 mb-3">
                            {user?.profile?.profileImage || user?.profileImage ? (
                                <div className="h-10 w-10 rounded-xl shadow-md overflow-hidden bg-white shrink-0">
                                    <img src={user?.profile?.profileImage || user?.profileImage} alt="Profile" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="h-10 w-10 rounded-xl bg-[#843D9B] flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'T'}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-xs font-black text-white truncate">{user?.name || 'Partner'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${status === 'APPROVED' ? 'bg-[#843D9B]' : 'bg-orange-400'} animate-pulse`}></span>
                                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest leading-none">{status}</span>
                                </div>
                            </div>
                        </div>
                        <Link to="/partner/settings" className="block w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black text-center text-gray-400 uppercase tracking-widest border border-white/5 transition-all">
                            Manage Shop
                        </Link>
                    </div>
                </div>
            </aside>

            {/* ── MAIN CONTENT AREA ── */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative overscroll-none">
                {/* ── MOBILE TOP HEADER ── */}
                <header className={`${location.pathname === '/partner/settings' ? 'hidden' : 'md:hidden'} w-full bg-gradient-to-r from-[#6B2F7E] via-[#843D9B] to-[#9B5BB0] px-4 h-14 flex items-center justify-between shrink-0 z-40 top-0 left-0`}>
                    <Link to="/partner" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                            <img src={logos.tailor} alt={appName} className="w-full h-full object-contain p-0.5" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-white leading-none tracking-tight">
                                {appName}
                            </h1>
                            <p className="text-[11px] text-white/80 font-medium mt-1 leading-none">Tailor Partner</p>
                        </div>
                    </Link>

                    <div className="flex items-center gap-2.5">
                        <Link
                            to="/partner/notifications"
                            className="p-2 text-white hover:bg-white/10 rounded-xl transition-all relative flex items-center justify-center"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 h-4 min-w-[16px] px-1 bg-rose-500 rounded-full border-2 border-[#843D9B] flex items-center justify-center text-[8px] font-semibold text-white z-10">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </header>

                {/* Pull to Refresh Mobile Indicator Banner */}
                {(pullDistance > 0 || isRefreshing) && (
                    <div 
                        className="md:hidden fixed top-16 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-transform duration-75"
                        style={{ transform: `translateY(${Math.min(pullDistance * 0.7, 45)}px)` }}
                    >
                        <div className="bg-[#843D9B] text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 backdrop-blur-md animate-fadeIn">
                            <RefreshCw size={15} className={`${isRefreshing || pullDistance >= 60 ? 'animate-spin' : ''}`} />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider">
                                {isRefreshing ? 'Refreshing Page...' : pullDistance >= 60 ? 'Release to Refresh' : 'Pull Down to Refresh'}
                            </span>
                        </div>
                    </div>
                )}

                <main 
                    ref={mainRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`flex-1 overflow-y-auto overscroll-none custom-scrollbar transition-all duration-500 flex flex-col min-h-0 ${
                    (isOverview || location.pathname === '/partner/settings' || location.pathname === '/partner/wallet' || location.pathname === '/partner/earnings') 
                        ? 'p-0' 
                        : 'p-0 md:p-8 lg:p-10'
                }`}>
                    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative min-h-0">
                        {/* ── SUB-NAVIGATION FOR ORDERS SECTION ── */}
                        {['/partner/orders', '/partner/shop-orders', '/partner/alterations', '/partner/custom-designs', '/partner/issues'].includes(location.pathname) && (
                            <div className="bg-white/95 backdrop-blur-xl border-b border-gray-100 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 sticky top-0 z-30">
                                {[
                                    { path: '/partner/orders', label: 'Stitching' },
                                    { path: '/partner/shop-orders', label: 'Shop' },
                                    { path: '/partner/alterations', label: 'Alterations' },
                                    { path: '/partner/custom-designs', label: 'Custom' },
                                    { path: '/partner/issues', label: 'Issues' },
                                ].map((tab) => (
                                    <Link 
                                        key={tab.path} 
                                        to={tab.path} 
                                        className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full transition-all ${
                                            location.pathname === tab.path
                                                ? 'bg-[#843D9B] text-white shadow-sm shadow-[#843D9B]/20'
                                                : 'bg-[#F5EDFA] text-[#843D9B] hover:bg-[#EBDDF3]'
                                        }`}
                                    >
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                        
                        <div className={`flex-1 pb-24 md:pb-12 ${location.pathname === '/partner/orders' ? 'md:p-4' : ['/partner/shop-orders', '/partner/alterations', '/partner/custom-designs', '/partner/issues'].includes(location.pathname) ? 'p-4' : ''}`}>
                            {/* Page-level boundary: a loading page never blanks the header / bottom nav */}
                            <React.Suspense fallback={
                                <div className="flex-1 flex items-center justify-center py-24">
                                    <div className="w-8 h-8 border-[3px] border-[#843D9B]/20 border-t-[#843D9B] rounded-full animate-spin" />
                                </div>
                            }>
                                <Outlet />
                            </React.Suspense>
                        </div>
                    </div>
                </main>

                {/* ── BOTTOM NAVIGATION (MOBILE ONLY) ── */}
                {!isKeyboardOpen && (
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-stretch justify-around z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] animate-fadeIn">
                        {menuItems.filter(item => !['/partner/alterations', '/partner/custom-designs', '/partner/issues'].includes(item.path)).map((item) => {
                            const isOrderSection = ['/partner/orders', '/partner/shop-orders', '/partner/alterations', '/partner/custom-designs', '/partner/issues'].includes(location.pathname);
                            const isActive = location.pathname === item.path || (item.path === '/partner/orders' && isOrderSection) || (item.path === '/partner/settings' && PROFILE_SUBPAGES.includes(location.pathname));
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex-1 flex flex-col items-center gap-1 py-1 transition-colors active:scale-95 ${
                                        isActive ? 'text-[#843D9B]' : 'text-gray-500'
                                    }`}
                                >
                                    <div className="relative flex items-center justify-center">
                                        {item.badge > 0 && (
                                            <span className="absolute -top-1.5 -right-2 h-[14px] min-w-[14px] px-1 bg-rose-500 rounded-full border-[1.5px] border-white flex items-center justify-center text-[8px] font-semibold text-white z-10">
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                        {React.cloneElement(item.icon, {
                                            size: 22,
                                            strokeWidth: isActive ? 2 : 1.75
                                        })}
                                    </div>
                                    <span className="text-[11px] font-semibold leading-none whitespace-nowrap">
                                        {item.mobileLabel || item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </div>
        </div>
    );
};

export default TailorLayout;
