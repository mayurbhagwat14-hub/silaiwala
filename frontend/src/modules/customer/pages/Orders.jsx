import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, Search, Filter, Truck, CheckCircle2, Scissors, PenTool, ShoppingBag, Shirt, Layers, Hourglass, Shuffle, Headphones } from 'lucide-react';
import useOrderStore from '../../../store/orderStore';
import OrderCard from '../components/orders/OrderCard';
import AlterationCard from '../components/orders/AlterationCard';
import CustomDesignCard from '../components/orders/CustomDesignCard';
import BottomNav from '../components/BottomNav';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../../config/constants';
import useAuthStore from '../../../store/authStore';
import { getToken } from '../../../utils/auth';
import api from '../../../utils/api';
import VoiceSearchButton from '../../../components/ui/VoiceSearchButton';

const SANS = "'Plus Jakarta Sans', sans-serif";
const DONE_STATUSES = ['delivered', 'completed', 'product-delivered', 'order-completed'];
const CANCELLED_STATUSES = ['cancelled', 'failed-delivery', 'rejected'];
const STATUS_FILTERS = [
    { value: 'All', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'delivered', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];
// Orders use `status`; alteration / custom-design requests use `quotationStatus`.
const inStatusGroup = (item, group) => {
    if (group === 'All') return true;
    const s = String(item.status || item.quotationStatus || 'pending').toLowerCase();
    if (group === 'pending') return s === 'pending' || s === 'quoted';
    if (group === 'delivered') return DONE_STATUSES.includes(s);
    if (group === 'cancelled') return CANCELLED_STATUSES.includes(s);
    return !['pending', 'quoted', ...DONE_STATUSES, ...CANCELLED_STATUSES].includes(s);
};
const TAB_IDS = ['orders', 'stitching', 'alterations', 'custom-designs', 'fabric'];
const tabFromState = (tab) => (TAB_IDS.includes(tab) ? tab : 'orders');



const OrdersPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { orders, fetchOrders, isLoading } = useOrderStore();
    const { user } = useAuthStore();
    const [alterations, setAlterations] = useState([]);
    const [customDesigns, setCustomDesigns] = useState([]);
    const [activeTab, setActiveTab] = useState(() => tabFromState(location.state?.activeTab));
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const tabsRef = useRef(null);

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(tabFromState(location.state.activeTab));
        }
    }, [location.state]);

    // Keep the selected tab chip fully visible in the scrollable row
    useEffect(() => {
        const el = tabsRef.current?.querySelector(`[data-tab="${activeTab}"]`);
        el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }, [activeTab]);

    useEffect(() => {
        fetchOrders();
        fetchAlterations();
        fetchCustomDesigns();

        const socket = io(SOCKET_URL, {
            auth: {
                token: getToken()
            }
        });

        if (user?.id || user?._id) {
            const userId = user.id || user._id;
            const joinOwnRoom = () => socket.emit('join_user_room', String(userId));
            socket.on('connect', joinOwnRoom);
            joinOwnRoom();
        }

        socket.on('new_notification', (data) => {
            fetchOrders();
        });

        socket.on('order_status_updated', (data) => {
            fetchOrders();
        });

        return () => {
            socket.off('new_notification');
            socket.off('order_status_updated');
            socket.disconnect();
        };
    }, [fetchOrders, user?.id, user?._id]);

    const fetchAlterations = async () => {
        try {
            const res = await api.get('/alterations');
            if (res.data.success) {
                setAlterations(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch alterations:', error);
        }
    };

    const fetchCustomDesigns = async () => {
        try {
            const res = await api.get('/custom-designs');
            if (res.data.success) {
                setCustomDesigns(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch custom designs:', error);
        }
    };

    const matchSearch = (item) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const idMatch = (item.orderId || item._id || '').toLowerCase().includes(q);
        
        let detailsMatch = false;
        if (item.items) {
            detailsMatch = item.items.some(i => (i.service?.title || i.service?.name || '').toLowerCase().includes(q) || (i.product?.name || '').toLowerCase().includes(q));
        } else if (item.garmentType) {
            detailsMatch = item.garmentType.toLowerCase().includes(q);
        } else if (item.designType || item.referenceStyle) {
            detailsMatch = ((item.designType || '') + ' ' + (item.referenceStyle || '')).toLowerCase().includes(q);
        }
        return idMatch || detailsMatch;
    };

    // Filter Logic
    const isProductOnly = (o) => (o.items || []).length > 0 && o.items.every((i) => i.product && !i.service);
    let activeData = [];
    if (activeTab === 'orders') activeData = orders || [];
    else if (activeTab === 'stitching') activeData = (orders || []).filter((o) => !isProductOnly(o));
    else if (activeTab === 'fabric') activeData = (orders || []).filter(isProductOnly);
    else if (activeTab === 'alterations') activeData = alterations || [];
    else if (activeTab === 'custom-designs') activeData = customDesigns || [];

    const filteredData = activeData.filter((o) => inStatusGroup(o, filterStatus) && matchSearch(o));

    // Summary across all of the customer's orders
    const stats = useMemo(() => {
        const list = orders || [];
        const s = (o) => String(o.status || '').toLowerCase();
        return {
            total: list.length,
            inProgress: list.filter((o) => !['pending', ...DONE_STATUSES, ...CANCELLED_STATUSES].includes(s(o))).length,
            completed: list.filter((o) => DONE_STATUSES.includes(s(o))).length,
            cancelled: list.filter((o) => CANCELLED_STATUSES.includes(s(o))).length,
        };
    }, [orders]);

    const TABS = [
        { id: 'orders', label: 'All Orders', icon: ShoppingBag },
        { id: 'stitching', label: 'Stitching', icon: Shirt },
        { id: 'alterations', label: 'Alterations', icon: Scissors },
        { id: 'custom-designs', label: 'Custom Designs', icon: PenTool },
        { id: 'fabric', label: 'Fabric Orders', icon: Layers },
    ];

    const STAT_ITEMS = [
        { label: 'Total Orders', value: stats.total, icon: ShoppingBag, cls: 'text-[#6A2385]' },
        { label: 'In Progress', value: stats.inProgress, icon: Hourglass, cls: 'text-[#6A2385]' },
        { label: 'Completed', value: stats.completed, icon: CheckCircle2, cls: 'text-emerald-600' },
        { label: 'Cancelled', value: stats.cancelled, icon: Shuffle, cls: 'text-[#6A2385]' },
    ];

    const tabLabel = TABS.find((t) => t.id === activeTab)?.label || 'orders';

    return (
        <div className="min-h-screen bg-white pb-6 font-sans">
            {/* Purple header with summary card */}
            <div className="relative bg-white px-4 pb-1 pt-5 md:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div>
                        <div className="min-w-0">
                            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-[#1A1523]" style={{ fontFamily: SANS }}>My Orders</h1>
                            <p className="mt-0.5 text-[12px] leading-snug text-gray-500">Track and manage your stitching, alteration and custom requests</p>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-4 rounded-2xl bg-white px-1 py-3 shadow-[0_8px_22px_-16px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                        {STAT_ITEMS.map(({ label, value, icon: Icon, cls }, i) => (
                            <div key={label} className={`flex min-w-0 flex-col items-center justify-center px-1 text-center ${i > 0 ? 'border-l border-[#EFE8F4]' : ''}`}>
                                <div className="flex items-center gap-1.5">
                                    <Icon size={17} className={`shrink-0 ${cls}`} strokeWidth={1.9} />
                                    <p className="text-[16px] font-bold leading-none text-[#1A1523]">{value}</p>
                                </div>
                                <p className="mt-1.5 w-full whitespace-nowrap text-[10px] leading-none text-gray-500">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl">
                {/* Search + filter, then tabs (pinned while scrolling) */}
                <div className="sticky top-0 z-40 bg-white px-4 pb-3 pt-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-12 min-w-0 flex-1 items-center rounded-full bg-white px-1 ring-1 ring-[#E4D6EC] focus-within:ring-[#B98FCF]">
                            <Search size={17} className="ml-3 shrink-0 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by order ID, design, or category..."
                                className="h-full w-full min-w-0 bg-transparent px-2.5 text-[13px] text-[#1A1523] placeholder:text-gray-400 focus:outline-none"
                            />
                            <VoiceSearchButton className="mr-1 h-9 w-9 text-[#6A2385]" onTranscript={(text) => setSearchQuery(text)} />
                        </div>
                        <div className="relative flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] px-4 text-white shadow-[0_8px_18px_-10px_rgba(90,26,120,0.9)]">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                aria-label="Filter by status"
                            >
                                {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                            <Filter size={15} />
                            <span className="text-[12.5px] font-semibold">
                                {filterStatus === 'All' ? 'Filter' : STATUS_FILTERS.find((f) => f.value === filterStatus)?.label}
                            </span>
                            {filterStatus !== 'All' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                    </div>

                    <div className="relative -mx-4 mt-2 md:-mx-6 lg:-mx-8">
                    <div ref={tabsRef} className="no-scrollbar flex gap-2 overflow-x-auto scroll-px-4 px-4 py-1.5 md:px-6 lg:px-8">
                        {TABS.map(({ id, label, icon: Icon }) => {
                            const active = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    data-tab={id}
                                    type="button"
                                    onClick={() => setActiveTab(id)}
                                    className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[12px] font-semibold transition-colors ${
                                        active
                                            ? 'border-transparent bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] text-white'
                                            : 'border-[#E4D6EC] bg-white text-[#2A1F33] hover:border-[#B98FCF]'
                                    }`}
                                >
                                    <Icon size={14} className={active ? 'text-white' : 'text-[#6A2385]'} />
                                    {label}
                                </button>
                            );
                        })}
                        <span className="w-2 shrink-0" aria-hidden="true" />
                    </div>
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />
                    </div>
                </div>

                {/* Orders list */}
                <div className="mb-5 px-4 pt-1 md:px-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#843D9B] border-t-transparent" />
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Loading {tabLabel}...</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-[20px] bg-white px-6 py-14 text-center ring-1 ring-[#EFE8F4]">
                            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E9F8] text-[#6A2385]">
                                <Package size={26} />
                            </span>
                            <h3 className="text-[14px] font-semibold text-[#1A1523]">No {tabLabel.toLowerCase()} found</h3>
                            <p className="mt-1 max-w-[230px] text-[12px] text-gray-500">
                                {searchQuery || filterStatus !== 'All' ? 'Nothing matches your search or filter.' : "You haven't placed any yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {activeTab === 'alterations' ? (
                                filteredData.map((alt) => <AlterationCard key={alt._id} alteration={alt} onPaymentSuccess={() => { fetchAlterations(); fetchOrders(); }} />)
                            ) : activeTab === 'custom-designs' ? (
                                filteredData.map((design) => <CustomDesignCard key={design._id} design={design} onPaymentSuccess={() => { fetchCustomDesigns(); fetchOrders(); }} />)
                            ) : (
                                filteredData.map((order) => <OrderCard key={order._id || order.orderId} order={order} />)
                            )}
                        </div>
                    )}
                </div>

                {/* Help */}
                <div className="px-4 pb-28 md:px-6 lg:px-8">
                    <div className="relative flex items-center gap-3 overflow-hidden rounded-[18px] bg-gradient-to-r from-[#F6EEFA] to-[#EFE2F6] p-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#6A2385] shadow-sm">
                            <Truck size={22} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-[14px] font-bold leading-tight text-[#1A1523]">Need Help with Your Order?</h4>
                            <p className="mt-0.5 text-[11.5px] leading-snug text-gray-500">Track, update or get support from our team.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/user/support')}
                            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11.5px] font-semibold text-[#6A2385] ring-1 ring-[#6A2385]/40 transition-all hover:bg-[#F3E9F8] active:scale-95"
                        >
                            <Headphones size={13} /> Contact Support
                        </button>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default OrdersPage;
