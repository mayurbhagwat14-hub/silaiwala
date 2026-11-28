import React, { useState, useEffect } from 'react';
import {
    ShoppingBag, Clock, CheckCircle, ChevronRight,
    Bell, TrendingUp, Menu, ShieldAlert, Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTailorAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../../config/constants';
import { getToken } from '../../../utils/auth';
import { toast } from 'react-hot-toast';
import { getPageCache, setPageCache } from '../utils/pageCache';
import PartnerBanners from '../components/PartnerBanners';

const Overview = () => {
    const { user } = useTailorAuth();
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();
    const userId = user?._id || user?.id;
    const [dashboardData, setDashboardData] = useState(() => getPageCache(userId, 'dashboard') || null);
    const [isLoading, setIsLoading] = useState(() => !getPageCache(userId, 'dashboard'));

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/tailors/dashboard');
            if (response.data.success) {
                setDashboardData(response.data.data);
                setPageCache(userId, 'dashboard', response.data.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        const socket = io(SOCKET_URL, {
            auth: {
                token: getToken()
            }
        });
        const userId = user?._id || user?.id;
        if (userId) socket.emit('join', `user_${userId}`);
        socket.on('new_order', (data) => {
            fetchDashboardData();
            if (data?.orderId) {
                toast.success(`New Order Received: #${data.orderId}`, {
                    icon: '👕',
                    style: {
                        borderRadius: '16px',
                        background: '#333',
                        color: '#fff',
                        fontWeight: 'bold'
                    },
                });
            } else {
                toast.success('You have received a new order!');
            }
        });
        return () => {
            socket.off('new_order');
        };
    }, [user?._id]);

    const summary = dashboardData?.summary || {
        totalEarnings: 0, totalOrders: 0, pendingOrders: 0,
        completedThisWeek: 0, avgDeliveryTime: 0, walletBalance: 0
    };

    const recentActivity = dashboardData?.recentActivity || [];

    return (
        <div className="min-h-full bg-[#F5F5F5] flex flex-col font-sans selection:bg-[#843D9B] selection:text-white">
            {/* ── CONTENT AREA ── */}
            <div className="flex-1 p-3 md:p-6 lg:p-8 space-y-4 md:space-y-6 pb-24 md:pb-12">
                
                {/* ── WELCOME SECTION (DESKTOP & MOBILE) ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-2">
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest md:tracking-[0.2em] mb-0.5 md:mb-1">Dashboard Overview</p>
                        <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight truncate">
                            Welcome back, {dashboardData?.tailorName?.split(' ')[0] || user?.name?.split(' ')[0] || 'Partner'}
                        </h2>
                    </div>
                    <button
                        onClick={() => navigate('/partner/notifications')}
                        className="hidden md:flex p-2.5 bg-white rounded-xl text-gray-600 hover:text-[#843D9B] transition-all relative border border-gray-100 shadow-sm items-center justify-center self-start md:self-auto"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 h-5 w-5 bg-rose-500 rounded-full border-[2px] border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── VERIFICATION STATUS BANNER ── */}
                {(dashboardData?.registrationStatus === 'pending' || dashboardData?.registrationStatus === 'rejected') && (
                    <div className={`rounded-2xl p-3 md:p-4 border flex items-start gap-3 md:gap-4 ${
                        dashboardData.registrationStatus === 'rejected' 
                            ? 'bg-red-500/10 border-red-500/20' 
                            : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                        <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl mt-0.5 ${
                            dashboardData.registrationStatus === 'rejected' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                            <ShieldAlert size={16} className="md:w-5 md:h-5" />
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-xs md:text-sm font-black ${
                                dashboardData.registrationStatus === 'rejected' ? 'text-red-700' : 'text-amber-700'
                            }`}>
                                {dashboardData.registrationStatus === 'rejected' ? 'Profile Rejected' : 'Profile Under Review'}
                            </h3>
                            <p className={`text-[10px] md:text-xs font-medium mt-0.5 md:mt-1 ${
                                dashboardData.registrationStatus === 'rejected' ? 'text-red-600' : 'text-amber-600'
                            }`}>
                                {dashboardData.registrationStatus === 'rejected' 
                                    ? dashboardData.rejectionReason || 'There were issues with your documents. Please review and update them.'
                                    : 'Your documents are currently being verified by the admin. You will be notified once approved.'
                                }
                            </p>
                        </div>
                        {dashboardData.registrationStatus === 'rejected' && (
                            <button
                                onClick={() => navigate('/partner/under-review')}
                                className="px-3 md:px-4 py-1.5 md:py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] md:text-xs font-bold rounded-lg md:rounded-xl transition-colors shrink-0"
                            >
                                Update Documents
                            </button>
                        )}
                    </div>
                )}

                {/* ── KEY METRICS ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {/* Total Earnings */}
                    <div
                        onClick={() => navigate('/partner/wallet')}
                        className="bg-[#FFF8E6] border border-[#F6E2B3] rounded-2xl p-3.5 md:p-5 min-h-[84px] md:min-h-[96px] cursor-pointer active:scale-95 hover:shadow-md transition-all duration-300 group flex items-center gap-3 md:gap-4 min-w-0"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center text-[#B7791F] shrink-0 relative">
                            <Wallet size={20} />
                        </div>
                        <div className="min-w-0 relative">
                            <p className="text-[11px] md:text-xs text-gray-600 font-medium leading-tight line-clamp-2 mb-1">Total Earnings</p>
                            <p className="text-xl md:text-3xl font-bold text-gray-900 leading-tight truncate">
                                ₹{(summary.totalEarnings || 0).toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>

                    {/* New Orders */}
                    <div
                        onClick={() => navigate('/partner/orders', { state: { status: 'pending' } })}
                        className="bg-[#F5EDFA] border border-[#E5D3F0] rounded-2xl p-3.5 md:p-5 min-h-[84px] md:min-h-[96px] cursor-pointer active:scale-95 hover:shadow-md transition-all duration-300 group flex items-center gap-3 md:gap-4 min-w-0"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center text-[#843D9B] shrink-0 relative">
                            <ShoppingBag size={20} />
                        </div>
                        <div className="min-w-0 relative">
                            <p className="text-[11px] md:text-xs text-gray-600 font-medium leading-tight line-clamp-2 mb-1">New Orders</p>
                            <p className="text-xl md:text-3xl font-bold text-gray-900 leading-tight truncate">
                                {String(summary.pendingOrders || 0).padStart(2, '0')}
                            </p>
                        </div>
                    </div>

                    {/* In Progress */}
                    <div
                        onClick={() => navigate('/partner/orders', { state: { status: 'in-progress' } })}
                        className="bg-[#FFF3EA] border border-[#FADCC4] rounded-2xl p-3.5 md:p-5 min-h-[84px] md:min-h-[96px] cursor-pointer active:scale-95 hover:shadow-md transition-all duration-300 group flex items-center gap-3 md:gap-4 min-w-0"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center text-[#D9822B] shrink-0 relative">
                            <Clock size={20} />
                        </div>
                        <div className="min-w-0 relative">
                            <p className="text-[11px] md:text-xs text-gray-600 font-medium leading-tight line-clamp-2 mb-1">In Progress</p>
                            <p className="text-xl md:text-3xl font-bold text-gray-900 leading-tight truncate">
                                {String(Math.max(summary.totalOrders - summary.completedThisWeek, 0)).padStart(2, '0')}
                            </p>
                        </div>
                    </div>

                    {/* Completed */}
                    <div
                        onClick={() => navigate('/partner/orders', { state: { status: 'completed' } })}
                        className="bg-[#EDF9F1] border border-[#CDEEDA] rounded-2xl p-3.5 md:p-5 min-h-[84px] md:min-h-[96px] cursor-pointer active:scale-95 hover:shadow-md transition-all duration-300 group flex items-center gap-3 md:gap-4 min-w-0"
                    >
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center text-[#2F9E5B] shrink-0 relative">
                            <CheckCircle size={20} />
                        </div>
                        <div className="min-w-0 relative">
                            <p className="text-[11px] md:text-xs text-gray-600 font-medium leading-tight line-clamp-2 mb-1">Completed</p>
                            <p className="text-xl md:text-3xl font-bold text-gray-900 leading-tight truncate">
                                {summary.completedThisWeek || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── ADMIN-MANAGED BANNERS (CMS placement: Partner App - Dashboard Banner) ── */}
                <PartnerBanners />

                {/* ── BOTTOM SECTION: TWO COLUMNS ON DESKTOP ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    
                    {/* LEFT COLUMN (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Upcoming Pickups */}
                        <div>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Upcoming Pickups</h3>
                                <button
                                    onClick={() => navigate('/partner/orders')}
                                    className="text-[10px] font-black text-[#843D9B] uppercase tracking-widest bg-indigo-50 px-4 py-1.5 rounded-full hover:bg-[#843D9B] hover:text-white transition-all"
                                >
                                    View All
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isLoading ? (
                                    [1, 2].map(i => (
                                        <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
                                    ))
                                ) : (() => {
                                    const activePickups = dashboardData?.upcomingPickups || [];
                                    if (activePickups.length === 0) {
                                        return (
                                            <div className="col-span-full p-8 text-center text-gray-400 text-sm font-bold bg-white rounded-2xl border border-gray-100 border-dashed">
                                                No upcoming pickups scheduled.
                                            </div>
                                        );
                                    }
                                    return activePickups.map((order) => (
                                        <button
                                            key={order._id}
                                            onClick={() => navigate('/partner/orders', { state: { highlightOrderTitle: order.orderId } })}
                                            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 hover:border-[#843D9B]/20 transition-all text-left group"
                                        >
                                            <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center text-white font-black text-xs shrink-0 group-hover:scale-110 transition-transform">
                                                {order.customer?.name?.charAt(0) || 'C'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-gray-900">{order.customer?.name || 'Customer'}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Order #{order.orderId}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-[#843D9B] font-black mb-1">₹{Math.round(Number(order.tailorEarning) || (order.items || []).reduce((s, it) => s + ((Number(it.price) || 0) + (it.styleAddons || []).reduce((t, a) => t + (Number(a?.price) || 0), 0)) * (Number(it.quantity) || 1), 0))}</p>
                                                <span className={`text-[8px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${
                                                    order.status === 'pending'
                                                        ? 'text-rose-600 bg-rose-50 border-rose-100'
                                                        : 'text-blue-600 bg-blue-50 border-blue-100'
                                                }`}>
                                                    {order.status === 'pending' ? 'NEW' : order.status.replace(/-/g, ' ')}
                                                </span>
                                            </div>
                                        </button>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN (1/3) */}
                    <div className="space-y-6">
                        {/* Current Workflow */}
                        {recentActivity.find(o => ['accepted', 'cutting', 'stitching'].includes(o.status)) ? (() => {
                            const activeOrder = recentActivity.find(o => ['accepted', 'cutting', 'stitching'].includes(o.status));
                            let progress = 25;
                            if (activeOrder.status === 'cutting') progress = 50;
                            if (activeOrder.status === 'stitching') progress = 75;

                            return (
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute right-3 bottom-0 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                                        <svg width="60" height="80" viewBox="0 0 70 100" fill="none">
                                            <ellipse cx="35" cy="18" rx="12" ry="12" fill="#843D9B" />
                                            <path d="M10 40 Q35 30 60 40 L65 90 H5 Z" fill="#843D9B" />
                                        </svg>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 bg-[#843D9B] rounded-full animate-ping" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Workflow</p>
                                    </div>
                                    
                                    <h4 className="text-base font-black text-gray-900 mb-6 leading-tight">
                                        Order #{activeOrder.orderId}<br />
                                        <span className="text-sm font-bold text-gray-500">for {activeOrder.customer?.name || 'Customer'}</span>
                                    </h4>

                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{activeOrder.status.replace(/-/g, ' ')}</span>
                                            <span className="text-xs font-black text-[#843D9B]">{progress}%</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#843D9B] rounded-full shadow-[0_0_10px_rgba(45,47,110,0.3)] transition-all" style={{ width: `${progress}%` }} />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => navigate('/partner/orders', { state: { highlightOrderTitle: activeOrder.orderId } })}
                                            className="w-full py-3 bg-gray-50 rounded-xl text-[10px] font-black text-gray-700 uppercase tracking-widest hover:bg-gray-100 transition-all"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div className="bg-white rounded-2xl p-6 border border-gray-100 border-dashed shadow-sm flex flex-col items-center justify-center text-center h-48">
                                <Clock size={24} className="text-gray-300 mb-3" />
                                <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest">No Active<br/>Workflows</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;
