import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Scissors,
    Truck,
    Settings,
    LogOut,
    Bell,
    BarChart3,
    Layers,
    Store,
    Wallet,
    Megaphone,
    Menu,
    X,
    Sparkles,
    Package,
    Mail,
    CreditCard,
    Ruler,
    AlertTriangle,
    Feather,
    UserPlus,
    PlusCircle,
    ClipboardList,
    Search
} from 'lucide-react';

import useAuthStore from '../store/authStore';
import useBrandingStore from '../store/brandingStore';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/constants';
import { getToken } from '../utils/auth';
import { toast } from 'react-hot-toast';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { playNotificationSound } from '../utils/audio';
import api from '../utils/api';

// Sidebar sections (by menu item key). Items keep their order inside each section.
const MENU_SECTIONS = [
    { title: null, keys: ['dashboard'] },
    { title: 'Order Management', keys: ['orders', 'admin-orders', 'create-order', 'bulk-orders'] },
    { title: 'Offline Shop', keys: ['offline-orders', 'offline-reports', 'offline-customers'] },
    { title: 'Partners', keys: ['tailors', 'measurement-executives', 'delivery', 'shiprocket'] },
    { title: 'Customers', keys: ['crm', 'customers'] },
    { title: 'Catalog', keys: ['services', 'store', 'customizations', 'style-addons', 'embroidery-addons'] },
    { title: 'Finance', keys: ['finance', 'subscriptions', 'reports'] },
    { title: 'Content & Support', keys: ['cms', 'issues', 'support'] },
    { title: 'System', keys: ['settings'] },
];

const AdminLayout = () => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [menuSearch, setMenuSearch] = useState('');
    const [hasUnread, setHasUnread] = useState(false);
    const [badgeCounts, setBadgeCounts] = useState({});
    const [activeDots, setActiveDots] = useState(new Set());
    const { appName, logos } = useBrandingStore();

    // Read Admin user for FCM registration
    const adminUser = useMemo(() => {
        try {
            const userStr = localStorage.getItem('admin_user') || localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : { role: 'admin' };
        } catch {
            return { role: 'admin' };
        }
    }, []);

    // Register FCM Push Token for Admin Web Browser
    usePushNotifications(adminUser);

    // Fetch initial badge counts
    const fetchBadgeCounts = useCallback(async () => {
        try {
            const res = await api.get('/admin/badge-counts');
            if (res.data?.success && res.data.data) {
                setBadgeCounts(res.data.data);
            }
        } catch (err) {
            // Silently handle if cancelled or network glitch
        }
    }, []);

    useEffect(() => {
        fetchBadgeCounts();
    }, [fetchBadgeCounts]);

    // Map notification types or URLs to sidebar section keys
    const getSectionKey = useCallback((data = {}) => {
        const type = (data.type || '').toUpperCase();
        const url = (data.targetUrl || data.url || '').toLowerCase();
        const title = (data.title || '').toLowerCase();
        const message = (data.message || '').toLowerCase();

        if (type.includes('OFFLINE') || url.includes('offline-orders') || title.includes('offline') || message.includes('offline')) {
            return 'offline-orders';
        }
        if (type.includes('BULK') || url.includes('bulk') || title.includes('bulk') || message.includes('bulk')) {
            return 'bulk-orders';
        }
        if (type.includes('ORDER') || url.includes('/admin/orders') || title.includes('order') || message.includes('order')) {
            return 'orders';
        }
        if (type.includes('TAILOR') || url.includes('tailor') || title.includes('tailor') || message.includes('tailor')) {
            return 'tailors';
        }
        if (type.includes('EXECUTIVE') || type.includes('MEASUREMENT') || url.includes('measurement') || title.includes('measurement')) {
            return 'measurement-executives';
        }
        if (type.includes('DELIVERY') || type.includes('DEPOSIT') || url.includes('delivery') || title.includes('delivery')) {
            return 'delivery';
        }
        if (type.includes('SERVICE') || url.includes('services') || title.includes('service')) {
            return 'services';
        }
        if (type.includes('PRODUCT') || url.includes('store') || title.includes('product') || message.includes('product')) {
            return 'store';
        }
        if (type.includes('ISSUE') || url.includes('issues') || title.includes('issue')) {
            return 'issues';
        }
        if (type.includes('SUPPORT') || type.includes('TICKET') || url.includes('support') || title.includes('support')) {
            return 'support';
        }
        if (type.includes('WITHDRAW') || type.includes('PAYOUT') || type.includes('FINANCE') || url.includes('finance')) {
            return 'finance';
        }
        return null;
    }, []);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            auth: {
                token: getToken()
            }
        });

        socket.on('connect', () => {
            socket.emit('join_admin_room');
            const userId = adminUser._id || adminUser.id;
            if (userId) {
                socket.emit('join_user_room', userId);
            }
        });

        const triggerBadgeUpdate = (data, defaultKey = 'orders') => {
            const section = getSectionKey(data) || defaultKey;
            if (section) {
                setBadgeCounts(prev => ({
                    ...prev,
                    [section]: (prev[section] || 0) + 1
                }));
                setActiveDots(prev => new Set(prev).add(section));
            }
        };

        socket.on('new_notification', (data = {}) => {
            setHasUnread(true);
            triggerBadgeUpdate(data);

            try { playNotificationSound('admin'); } catch (e) {}

            let icon = '🔔';
            if (data.type === 'NEW_REGISTRATION') icon = '📋';
            if (data.type === 'NEW_ORDER' || data.type === 'ORDER_CREATED') icon = '🛍️';

            toast.success(data.title ? `${data.title}: ${data.message}` : (data.message || 'New notification received'), {
                icon,
                position: 'top-right',
                duration: 6000
            });
        });

        socket.on('new_order', (data = {}) => {
            setHasUnread(true);
            triggerBadgeUpdate(data, 'orders');

            try { playNotificationSound('admin'); } catch (e) {}
            toast.success(data.message || `New Order Received: ${data.orderId || 'Check dashboard'}`, {
                icon: '🛍️',
                position: 'top-right',
                duration: 6000
            });
        });

        socket.on('order_status_updated', (data) => {
            setHasUnread(true);
            triggerBadgeUpdate(data, 'orders');

            toast.success(`Order ${data.orderId} updated to ${data.status}`, {
                icon: '🔄',
                position: 'top-right'
            });
        });

        return () => {
            socket.off('new_notification');
            socket.off('new_order');
            socket.off('order_status_updated');
            socket.disconnect();
        };
    }, [adminUser, getSectionKey]);

    const ROLE_PERMISSIONS = useMemo(() => ({
        super_admin: ['*'],
        admin: ['*'],
        support_agent: [
            'dashboard', 'orders', 'admin-orders', 'create-order', 'offline-orders', 'bulk-orders', 'tailors', 
            'delivery', 'crm', 'customers', 'offline-customers', 'issues', 'support'
        ],
        finance_manager: [
            'dashboard', 'orders', 'admin-orders', 'offline-orders', 'offline-reports', 'finance', 
            'subscriptions', 'reports', 'delivery'
        ],
        content_manager: [
            'dashboard', 'services', 'store', 'cms', 'customizations', 
            'style-addons', 'embroidery-addons'
        ]
    }), []);

    const allMenuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin', key: 'dashboard' },
        { icon: <ShoppingBag size={20} />, label: 'Orders', path: '/admin/orders', key: 'orders' },
        { icon: <Sparkles size={20} />, label: 'Admin Orders', path: '/admin/orders/assisted', key: 'admin-orders' },
        { icon: <PlusCircle size={20} />, label: 'Create Order', path: '/admin/orders/create', key: 'create-order' },
        { icon: <ClipboardList size={20} />, label: 'Offline Orders', path: '/admin/offline-orders', key: 'offline-orders' },
        { icon: <BarChart3 size={20} />, label: 'Offline Reports', path: '/admin/offline-reports', key: 'offline-reports' },
        { icon: <Package size={20} />, label: 'Bulk Orders', path: '/admin/bulk-orders', key: 'bulk-orders' },
        { icon: <Scissors size={20} />, label: 'Tailors', path: '/admin/tailors', key: 'tailors' },
        { icon: <Ruler size={20} />, label: 'Measurement Execs', path: '/admin/measurement-executives', key: 'measurement-executives' },
        { icon: <Truck size={20} />, label: 'Delivery', path: '/admin/delivery', key: 'delivery' },
        { icon: <Package size={20} />, label: 'Shiprocket', path: '/admin/shiprocket', key: 'shiprocket' },
        { icon: <Users size={20} />, label: 'CRM', path: '/admin/crm', key: 'crm' },
        { icon: <Users size={20} />, label: 'Customers', path: '/admin/customers', key: 'customers' },
        { icon: <UserPlus size={20} />, label: 'Offline Customers', path: '/admin/offline-customers', key: 'offline-customers' },
        { icon: <Layers size={20} />, label: 'Services', path: '/admin/services', key: 'services' },
        { icon: <Store size={20} />, label: 'Store', path: '/admin/store', key: 'store' },
        { icon: <AlertTriangle size={20} />, label: 'Issues', path: '/admin/issues', key: 'issues' },
        { icon: <Wallet size={20} />, label: 'Finance', path: '/admin/finance', key: 'finance' },
        { icon: <Megaphone size={20} />, label: 'CMS', path: '/admin/cms', key: 'cms' },
        { icon: <CreditCard size={20} />, label: 'Subscriptions', path: '/admin/subscriptions', key: 'subscriptions' },
        { icon: <BarChart3 size={20} />, label: 'Reports', path: '/admin/reports', key: 'reports' },
        { icon: <Sparkles size={20} />, label: 'Customizations', path: '/admin/customizations', key: 'customizations' },
        { icon: <Sparkles size={20} />, label: 'Style Addons', path: '/admin/style-addons', key: 'style-addons' },
        { icon: <Feather size={20} />, label: 'Embroidery', path: '/admin/embroidery-addons', key: 'embroidery-addons' },
        { icon: <Mail size={20} />, label: 'Support', path: '/admin/support', key: 'support' },
        { icon: <Settings size={20} />, label: 'Settings', path: '/admin/settings', key: 'settings' },
    ];

    const userRole = adminUser?.role || 'admin';
    const allowedKeys = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.admin;

    const menuItems = useMemo(() => {
        if (allowedKeys.includes('*')) return allMenuItems;
        return allMenuItems.filter(item => allowedKeys.includes(item.key));
    }, [allowedKeys, allMenuItems]);

    const menuSections = useMemo(() => {
        const q = menuSearch.trim().toLowerCase();
        const visible = q ? menuItems.filter(i => i.label.toLowerCase().includes(q)) : menuItems;
        const placed = new Set();
        const sections = MENU_SECTIONS.map(sec => {
            const items = sec.keys.map(k => visible.find(i => i.key === k)).filter(Boolean);
            items.forEach(i => placed.add(i.key));
            return { title: sec.title, items };
        });
        const rest = visible.filter(i => !placed.has(i.key));
        if (rest.length) sections.push({ title: 'More', items: rest });
        return sections.filter(sec => sec.items.length > 0);
    }, [menuItems, menuSearch]);

    const currentPath = location.pathname;
    // Helper to check if a menu item is active
    const isActive = (path) => {
        if (path === '/admin') return currentPath === '/admin';
        if (path === '/admin/orders') return currentPath === '/admin/orders';
        if (path === '/admin/orders/assisted') return currentPath === '/admin/orders/assisted' || currentPath === '/admin/admin-created-orders';
        if (path === '/admin/orders/create') return currentPath === '/admin/orders/create' || currentPath === '/admin/create-order';
        return currentPath.startsWith(path);
    };

    // Check if current route is authorized for this role
    const currentMenuItem = allMenuItems.find(i => isActive(i.path));
    const isRouteAuthorized = !currentMenuItem || allowedKeys.includes('*') || allowedKeys.includes(currentMenuItem.key);

    // Clear active dot when navigating to an item
    useEffect(() => {
        const matchedItem = menuItems.find(i => isActive(i.path));
        if (matchedItem && matchedItem.key) {
            setActiveDots(prev => {
                if (prev.has(matchedItem.key)) {
                    const next = new Set(prev);
                    next.delete(matchedItem.key);
                    return next;
                }
                return prev;
            });
        }
    }, [location.pathname, menuItems]);

    return (
        <div className="flex h-screen bg-white uppercase-none relative overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-[#0A0A0A] text-white flex flex-col shadow-2xl border-r border-white/5 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="px-4 pt-5 pb-4 border-b border-white/5 space-y-4 shrink-0">
                    <div className="flex justify-between items-center">
                        <h1 className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                                <img src={logos.customer} alt={appName} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-white leading-none truncate">{appName}</span>
                        </h1>
                        <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                            <X size={22} />
                        </button>
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Admin Panel</p>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        <input
                            type="text"
                            value={menuSearch}
                            onChange={(e) => setMenuSearch(e.target.value)}
                            placeholder="Search Menu..."
                            aria-label="Search menu"
                            className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors"
                        />
                    </div>
                </div>

                <nav className="flex-1 px-3 py-3 overflow-y-auto no-scrollbar">
                    {menuSections.length === 0 && (
                        <p className="px-3 py-6 text-sm text-white/40 text-center">No menu matches “{menuSearch}”</p>
                    )}
                    {menuSections.map((section, sIdx) => (
                        <div key={section.title || 'top'} className={sIdx > 0 ? 'mt-5' : ''}>
                            {section.title && (
                                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-200/70">{section.title}</p>
                            )}
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const count = badgeCounts[item.key] || 0;
                                    const hasDot = activeDots.has(item.key) || count > 0;
                                    const active = isActive(item.path);

                                    return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => {
                                            setIsSidebarOpen(false);
                                            if (item.key) {
                                                setActiveDots(prev => {
                                                    const next = new Set(prev);
                                                    next.delete(item.key);
                                                    return next;
                                                });
                                            }
                                        }}
                                        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors duration-200 group relative ${active
                                            ? 'bg-white/10 border-white/10 text-white'
                                            : 'border-transparent text-white/75 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className={`${active ? 'text-white' : 'text-white/60 group-hover:text-white'} transition-colors shrink-0`}>
                                                {item.icon}
                                            </span>
                                            <span className={`text-sm truncate ${active ? 'font-semibold text-white' : 'font-medium group-hover:text-white'}`}>
                                                {item.label}
                                            </span>
                                        </div>

                                        {/* Notification Badges / Pulsating Red Dots */}
                                        {(count > 0 || hasDot) && (
                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                {count > 0 && (
                                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-tight leading-none shadow-sm ${
                                                        active
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-red-500 text-white'
                                                    }`}>
                                                        {count > 99 ? '99+' : count}
                                                    </span>
                                                )}
                                                {hasDot && (
                                                    <span className="relative flex h-2.5 w-2.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-black/40 shadow-sm"></span>
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-3 border-t border-white/5 bg-[#0A0A0A]">
                    <button
                        onClick={async () => {
                            await useAuthStore.getState().logout();
                            window.location.href = '/admin/login';
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 w-full text-white/60 hover:text-red-400 transition-all rounded-xl hover:bg-red-400/5 cursor-pointer">
                        <LogOut size={20} />
                        <span className="font-medium text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen w-full">
                {/* Header */}
                <header className="h-20 bg-white border-b flex items-center justify-between px-4 lg:px-10 shadow-sm relative z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight hidden sm:block">
                                {menuItems.find(i => isActive(i.path))?.label || 'Admin Control'}
                            </h2>
                            <p className="text-[10px] lg:text-xs text-gray-400 font-medium hidden sm:block">Manage your marketplace operations</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 lg:gap-6">
                        <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">System Live</span>
                        </div>
                        <button
                            onClick={() => {
                                setHasUnread(false);
                                toast.success(hasUnread ? 'You have new notifications!' : 'No new notifications');
                            }}
                            title="Notifications"
                            className="relative p-2.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-full transition-all cursor-pointer"
                        >
                            <Bell size={20} />
                            {hasUnread && (
                                <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-bounce"></span>
                            )}
                        </button>
                        <div className="flex items-center gap-3 lg:gap-4 pl-3 lg:pl-6 border-l border-gray-100">
                            <Link to={(allowedKeys.includes('*') || allowedKeys.includes('settings')) ? "/admin/settings" : "/admin"} title="Profile Info" className="flex items-center gap-3 lg:gap-4 hover:opacity-80 transition-opacity cursor-pointer">
                                <div className="text-right hidden lg:block">
                                    <p className="text-xs font-black text-gray-900 leading-none uppercase tracking-tighter">
                                        {adminUser?.name || (userRole === 'support_agent' ? 'Support Agent' : userRole === 'finance_manager' ? 'Finance Manager' : userRole === 'content_manager' ? 'Content Manager' : userRole === 'super_admin' ? 'Super Admin' : 'Admin')}
                                    </p>
                                    <p className="text-[9px] text-[#843D9B] font-black uppercase mt-1 tracking-[0.1em]">
                                        {userRole.replace('_', ' ')}
                                    </p>
                                </div>
                                <div className="h-10 w-10 lg:h-11 lg:w-11 rounded-2xl bg-[#843D9B] flex items-center justify-center text-white font-black text-xs shadow-lg shadow-purple-900/20 shrink-0 border-2 border-white uppercase">
                                    {adminUser?.name ? adminUser.name.slice(0, 2).toUpperCase() : (userRole === 'support_agent' ? 'SA' : userRole === 'finance_manager' ? 'FM' : userRole === 'content_manager' ? 'CM' : 'AD')}
                                </div>
                            </Link>
                            <button
                                onClick={async () => {
                                    await useAuthStore.getState().logout();
                                    window.location.href = '/admin/login';
                                }}
                                title="Sign Out"
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ml-1 cursor-pointer"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                    <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
                        {!isRouteAuthorized ? (
                            <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-sm max-w-md mx-auto mt-12">
                                <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={28} />
                                </div>
                                <h3 className="text-lg font-black text-gray-900">Access Restricted</h3>
                                <p className="text-xs text-gray-500 font-medium mt-2 leading-relaxed">
                                    Your account role (<strong className="capitalize text-gray-800">{userRole.replace('_', ' ')}</strong>) does not have permission to view this section.
                                </p>
                                <Link 
                                    to="/admin" 
                                    className="inline-block mt-6 px-6 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-[#682498] shadow-md shadow-purple-900/20 transition-all uppercase tracking-wider"
                                >
                                    Back to Dashboard
                                </Link>
                            </div>
                        ) : (
                            <Outlet />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
