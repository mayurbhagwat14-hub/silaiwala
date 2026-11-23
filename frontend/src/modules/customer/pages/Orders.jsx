import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, Search, ListFilter, Ruler, Bell, Calendar, Clock, Truck, CheckCircle2, Scissors, PenTool, ShieldCheck, MessageCircle, ShoppingBag } from 'lucide-react';
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



const OrdersPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { orders, fetchOrders, isLoading } = useOrderStore();
    const { user } = useAuthStore();
    const [alterations, setAlterations] = useState([]);
    const [customDesigns, setCustomDesigns] = useState([]);
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'orders'); 
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Typewriter effect for placeholder
    const searchPhrases = useMemo(() => ['by order ID', 'tailors', 'designs', 'stitching', 'alterations'], []);
    const [placeholderText, setPlaceholderText] = useState('');
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timer;
        const currentPhrase = searchPhrases[phraseIndex];

        if (isDeleting) {
            timer = setTimeout(() => {
                setPlaceholderText(currentPhrase.substring(0, placeholderText.length - 1));
            }, 50);
        } else {
            timer = setTimeout(() => {
                setPlaceholderText(currentPhrase.substring(0, placeholderText.length + 1));
            }, 100);
        }

        if (!isDeleting && placeholderText === currentPhrase) {
            timer = setTimeout(() => setIsDeleting(true), 2000);
        } else if (isDeleting && placeholderText === '') {
            setIsDeleting(false);
            setPhraseIndex((prev) => (prev + 1) % searchPhrases.length);
        }

        return () => clearTimeout(timer);
    }, [placeholderText, isDeleting, phraseIndex, searchPhrases]);

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

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
    let activeData = [];
    if (activeTab === 'orders' || activeTab === 'completed') activeData = orders || [];
    else if (activeTab === 'alterations') activeData = alterations || [];
    else if (activeTab === 'custom-designs') activeData = customDesigns || [];

    // Base filtering for Completed tab
    if (activeTab === 'completed') {
        activeData = activeData.filter(o => ['delivered', 'completed', 'product-delivered', 'order-completed'].includes((o.status || '').toLowerCase()));
    }

    const filteredData = activeData.filter(o => (filterStatus === 'All' || (o.status || '').toLowerCase() === filterStatus.toLowerCase()) && matchSearch(o));

    // Stats calculation based on active tab (or all)
    const stats = useMemo(() => {
        const dataToStat = activeData; 
        return {
            all: dataToStat.length,
            pending: dataToStat.filter(o => (o.status || '').toLowerCase() === 'pending').length,
            inProgress: dataToStat.filter(o => {
                const s = (o.status || '').toLowerCase();
                return ['in-progress', 'fabric-picked', 'stitching', 'cutting', 'hemming', 'with-tailor'].includes(s);
            }).length,
            outForDelivery: dataToStat.filter(o => (o.status || '').toLowerCase() === 'out-for-delivery').length,
            delivered: dataToStat.filter(o => {
                const s = (o.status || '').toLowerCase();
                return ['delivered', 'completed', 'product-delivered', 'order-completed'].includes(s);
            }).length,
        };
    }, [activeData]);

    const TABS = [
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'alterations', label: 'Alterations', icon: Scissors },
        { id: 'custom-designs', label: 'Custom Designs', icon: PenTool },
        { id: 'completed', label: 'Completed', icon: CheckCircle2 },
    ];

    return (
        <div className="min-h-screen bg-[#F7F5FA] pb-6 font-sans">
            {/* Header + tabs stay pinned together so cards never slide under a gap */}
            <div className="sticky top-0 z-40 bg-[#F7F5FA]">
                <div className="rounded-b-[24px] bg-gradient-to-br from-[#6b2a80] to-[#843D9B] px-4 pb-4 pt-4 shadow-md md:px-6 lg:px-8">
                    <div className="mb-3.5 flex items-center justify-between">
                        <div>
                            <h1 className="text-[20px] font-bold leading-tight tracking-tight text-white">My Orders</h1>
                            <p className="mt-0.5 text-[12px] text-white/70">Track and manage your requests</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/user/notifications')}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition-colors hover:bg-white/25"
                            aria-label="Notifications"
                        >
                            <Bell size={19} />
                        </button>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex h-12 items-center overflow-hidden rounded-2xl bg-white shadow-sm">
                        <Search size={17} className="ml-3.5 shrink-0 text-[#843D9B]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchQuery ? '' : `Search ${placeholderText}|`}
                            className="h-full w-full min-w-0 bg-transparent px-2.5 text-[13px] font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none"
                        />
                        <VoiceSearchButton
                            className="h-9 w-9"
                            onTranscript={(text) => setSearchQuery(text)}
                        />
                        <div className="mx-1 h-6 w-px shrink-0 bg-gray-200" />
                        <div className="relative flex h-full shrink-0 items-center gap-1.5 px-3.5 transition-colors hover:bg-gray-50">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                aria-label="Filter by status"
                            >
                                <option value="All">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <ListFilter size={15} className="text-gray-600" />
                            <span className="text-[12px] font-semibold text-gray-800">
                                {filterStatus === 'All' ? 'Filter' : filterStatus.replace(/-/g, ' ')}
                            </span>
                            {filterStatus !== 'All' && <span className="h-1.5 w-1.5 rounded-full bg-[#843D9B]" />}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-3 md:px-6 lg:px-8">
                    {TABS.map(({ id, label, icon: Icon }) => {
                        const active = activeTab === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-all ${
                                    active
                                        ? 'border-[#843D9B] bg-[#843D9B] text-white shadow-sm shadow-[#843D9B]/25'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                }`}
                            >
                                <Icon size={14} /> {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 4. Orders List */}
            <div className="mb-6 px-4 pt-1 md:px-6 lg:px-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-10 h-10 border-4 border-[#843D9B] border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Loading {activeTab}...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm text-center">
                        <Package size={40} className="text-gray-300 mb-3" />
                        <h3 className="text-[13px] font-black text-gray-900">No {activeTab} found</h3>
                        <p className="text-[11px] text-gray-500 mt-1 max-w-[200px] font-medium">
                            We couldn't find any orders matching your criteria.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {activeTab === 'alterations' ? (
                            filteredData.map(alt => <AlterationCard key={alt._id} alteration={alt} onPaymentSuccess={() => { fetchAlterations(); fetchOrders(); }} />)
                        ) : activeTab === 'custom-designs' ? (
                            filteredData.map(design => <CustomDesignCard key={design._id} design={design} onPaymentSuccess={() => { fetchCustomDesigns(); fetchOrders(); }} />)
                        ) : (
                            filteredData.map(order => <OrderCard key={order._id || order.orderId} order={order} />)
                        )}
                    </div>
                )}
            </div>

            {/* 5. Quality/Help Section */}
            <div className="px-4 pb-28 md:px-6 lg:px-8">
                <div className="bg-[#F8F5FF] rounded-2xl p-4 flex items-center justify-between border border-[#843D9B]/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#843D9B] shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="min-w-0">
                            <h4 className="text-[11px] font-black text-gray-900 line-clamp-1">Quality stitching. On-time delivery.</h4>
                            <p className="text-[10px] text-gray-500 font-medium mt-0.5 line-clamp-1">We care about every detail of your order.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/user/support')}
                        className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-[#843D9B] bg-white px-3.5 py-2 rounded-full border border-[#843D9B]/20 hover:bg-[#843D9B]/10 active:scale-95 transition-all shadow-sm"
                    >
                        <MessageCircle size={12} /> Need Help?
                    </button>
                </div>
            </div>

            {/* Bottom Nav */}
            <BottomNav />
        </div>
    );
};

export default OrdersPage;
