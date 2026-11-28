import React, { useState, useEffect } from 'react';
import { resolveRazorpayKey, createRazorpayInstance } from '../../../utils/razorpay';
import {
    ShoppingBag, Star, Gift, ArrowUpRight, Menu, Bell,
    Loader2, ChevronRight, X, Send, CreditCard, AlertCircle, History, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTailorAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import useBrandingStore from '../../../store/brandingStore';
import { getPageCache, setPageCache } from '../utils/pageCache';

// ── Figma-matched Earnings Page ──────────────────────────────────────────────
const TailorEarnings = () => {
    const navigate = useNavigate();
    const { user } = useTailorAuth();
    const { unreadCount } = useNotifications();
    const { appName, logos } = useBrandingStore();

    const userId = user?._id || user?.id;
    const cached = getPageCache(userId, 'earnings:Daily');
    const [activeTab, setActiveTab] = useState('Daily');
    const [isLoading, setIsLoading] = useState(!cached);
    const [stats, setStats]         = useState(cached?.stats || { balance: 0, totalWithdrawn: 0, codWalletBalance: 0, cashBlocked: false });
    const [transactions, setTxns]   = useState(cached?.transactions || []);
    const [earningsData, setEarningsData] = useState(cached?.earningsData || null);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [upiId, setUpiId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAllTxns, setShowAllTxns] = useState(false);

    // COD Deposit States
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositRemarks, setDepositRemarks] = useState('');
    const [depositHistory, setDepositHistory] = useState(cached?.depositHistory || []);

    const handleWithdrawRequest = async (e) => {
        e.preventDefault();

        const amount = parseFloat(withdrawAmount);
        if (!amount || amount <= 0) {
            return toast.error('Please enter a valid amount');
        }

        if (amount > stats.balance) {
            return toast.error('Insufficient balance');
        }

        if (!upiId) {
            return toast.error('Please enter UPI ID');
        }

        setIsSubmitting(true);
        try {
            const res = await api.post('/wallet/withdraw', {
                amount,
                method: 'upi',
                upiId,
                bankDetails: { upiId }
            });

            if (res.data.success) {
                toast.success('Withdrawal request submitted!');
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                setUpiId('');
                
                // Refresh stats
                const balRes = await api.get('/wallet/dashboard');
                setStats(balRes.data.data);
                setTxns(balRes.data.data.recentTransactions || []);
            }
        } catch (error) {
            console.error('Withdrawal failed:', error);
            toast.error(error.response?.data?.message || 'Withdrawal request failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDepositRequest = async (e) => {
        e.preventDefault();
        const amount = parseFloat(depositAmount);
        
        if (!amount || amount <= 0) return toast.error('Please enter a valid amount');
        if (amount > stats.codWalletBalance) return toast.error('Amount exceeds your COD balance');

        setIsSubmitting(true);
        try {
            // 1. Create Razorpay Order
            const rzpOrderRes = await api.post('/tailors/cod-deposit/razorpay/create', {
                amount,
                remarks: depositRemarks
            });
            
            if (!rzpOrderRes.data.success) throw new Error('Razorpay order creation failed');

            const options = {
                key: resolveRazorpayKey(rzpOrderRes.data.data),
                amount: rzpOrderRes.data.data.amount,
                currency: "INR",
                name: appName,
                description: "COD Cash Deposit",
                order_id: rzpOrderRes.data.data.id,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.post('/tailors/cod-deposit/razorpay/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            depositId: rzpOrderRes.data.depositId
                        });

                        if (verifyRes.data.success) {
                            toast.success('Cash deposit successful!');
                            setShowDepositModal(false);
                            setDepositAmount('');
                            setDepositRemarks('');
                            
                            // Re-fetch data
                            const [balRes, historyRes] = await Promise.all([
                                api.get('/wallet/dashboard'),
                                api.get('/tailors/cod-deposit/history')
                            ]);
                            setStats(balRes.data.data);
                            setTxns(balRes.data.data.recentTransactions || []);
                            if (historyRes.data.success) {
                                setDepositHistory(historyRes.data.data);
                            }
                        }
                    } catch (err) {
                        toast.error(err.response?.data?.message || 'Payment verification failed');
                    }
                },
                prefill: {
                    name: user?.name || "Tailor Partner",
                    contact: user?.phoneNumber || "9999999999"
                },
                theme: {
                    color: "#843D9B"
                }
            };

            const rzp = await createRazorpayInstance(options);
            rzp.on('payment.failed', function (response) {
                toast.error(response.error.description || 'Payment failed');
            });
            rzp.open();
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Failed to submit deposit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const tabs = ['Daily', 'Weekly', 'Monthly'];

    useEffect(() => {
        const fetchData = async () => {
            try {
                let periodMap = { 'Daily': 'day', 'Weekly': 'week', 'Monthly': 'month' };
                const period = periodMap[activeTab] || 'week';
                
                const [balRes, earnRes, historyRes] = await Promise.all([
                    api.get('/wallet/dashboard'),
                    api.get(`/tailors/earnings?period=${period}`),
                    api.get('/tailors/cod-deposit/history').catch(() => ({ data: { success: true, data: [] } }))
                ]);
                setStats(balRes.data.data);
                setTxns(balRes.data.data.recentTransactions || []);
                setEarningsData(earnRes.data.data);
                if (historyRes.data.success) {
                    setDepositHistory(historyRes.data.data);
                }
                setPageCache(userId, `earnings:${activeTab}`, {
                    stats: balRes.data.data,
                    transactions: balRes.data.data.recentTransactions || [],
                    earningsData: earnRes.data.data,
                    depositHistory: historyRes.data.success ? historyRes.data.data : [],
                });
                setIsLoading(false);
            } catch (error) {
                if (error?.name === 'CanceledError') return;
                console.error('Earnings fetch error:', error);
                setIsLoading(false);
            }
        };
        fetchData();
    }, [activeTab, userId]);

    const periodTotal = earningsData?.summary?.periodTotal || 0;
    // Real split from wallet credits (backend summary.breakdown); no invented percentages
    const breakdown = earningsData?.summary?.breakdown || {};
    const orderEarnings = Number(breakdown.orderEarnings) || 0;
    const incentives = Number(breakdown.incentives) || 0;
    const bonus = Number(breakdown.bonus) || 0;
    const displayedEarnings = periodTotal || 0;

    const getBadgeStyle = (label) => {
        if (!label) return 'text-green-700 bg-green-50';
        const lower = label.toLowerCase();
        if (lower === 'incentive' || lower === 'bonus') return 'text-blue-600 bg-blue-50';
        if (lower === 'credit' || lower === 'completed' || lower === 'paid') return 'text-green-700 bg-green-50';
        if (lower === 'pending') return 'text-amber-600 bg-amber-50';
        if (lower === 'rejected') return 'text-rose-600 bg-rose-50';
        return 'text-gray-500 bg-gray-100';
    };

    const getBadgeLabel = (txn) => {
        if (txn.description?.toLowerCase().includes('bonus')) return 'INCENTIVE';
        if (txn.category === 'withdrawal' && txn.withdrawalRequest) return txn.withdrawalRequest.status.toUpperCase();
        if (txn.type === 'credit') return 'COMPLETED';
        return (txn.status || 'COMPLETED').toUpperCase();
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return isToday ? `Today, ${time}` : `Yesterday, ${time}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[#843D9B]" />
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[#F5F5F5] flex flex-col font-sans selection:bg-[#843D9B] selection:text-white pb-24 md:pb-8">

            <div className="flex-1 px-3 pt-3 md:p-0">
                
                {/* ── DESKTOP TITLE ── */}
                <div className="hidden md:block py-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Earnings & Wallet</h2>
                    <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Track your financial performance and payouts</p>
                </div>

                {/* ── MAIN CONTENT GRID ── */}
                <div className="flex flex-col lg:flex-row gap-3 md:gap-6">
                    
                    {/* LEFT COLUMN: BALANCE & BREAKDOWN */}
                    <div className="flex-1 space-y-3 md:space-y-6">
                        
                        {/* ── TAB BAR ── */}
                        <div className="flex gap-2 md:w-fit">
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 md:flex-none md:px-6 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                        activeTab === tab
                                            ? 'bg-[#843D9B] text-white border-[#843D9B] shadow-sm shadow-[#843D9B]/20'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* ── TOTAL EARNINGS CARD ── */}
                        <div className="bg-gradient-to-br from-[#6B2F7E] via-[#843D9B] to-[#9B5BB0] rounded-2xl p-5 md:p-8 relative overflow-hidden group shadow-lg shadow-[#843D9B]/20">
                            <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-[0.08] group-hover:scale-110 transition-transform duration-700">
                                <ArrowUpRight size={200} color="white" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[11px] text-white/70 font-semibold uppercase tracking-wider mb-2">
                                    Total Wallet Balance
                                </p>
                                <div className="flex items-baseline gap-1.5 mb-4 md:mb-6">
                                    <span className="text-xl md:text-2xl font-bold text-white/60">₹</span>
                                    <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                    {(stats.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h3>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5 bg-white/15 px-2.5 py-1.5 rounded-full border border-white/20">
                                        <ArrowUpRight size={13} className="text-emerald-200" strokeWidth={3} />
                                        <span className="text-[11px] font-semibold text-emerald-100">+12.5%</span>
                                    </div>
                                    <button 
                                        onClick={() => setShowWithdrawModal(true)}
                                        className="bg-white text-[#843D9B] px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#F5EDFA] active:scale-95 transition-all shadow-md shadow-black/10"
                                    >
                                        Withdraw Funds
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── BREAKDOWN GRID ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            <button 
                                onClick={() => navigate('/partner/orders')}
                                className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3.5 group hover:border-[#843D9B]/20 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="w-11 h-11 bg-[#F5EDFA] rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <ShoppingBag size={20} className="text-[#843D9B]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 font-medium mb-0.5">Order Earnings</p>
                                    <p className="text-lg font-bold text-gray-900 tracking-tight leading-tight">
                                        ₹{orderEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-[#843D9B] group-hover:translate-x-1 transition-all" />
                            </button>

                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="bg-[#FFF8E6] rounded-2xl p-4 border border-[#F6E2B3] group transition-all">
                                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
                                        <Star size={17} className="text-[#B7791F]" fill="currentColor" />
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium mb-0.5">Incentives</p>
                                    <p className="text-lg font-bold text-gray-900 tracking-tight leading-tight">
                                        ₹{incentives.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="bg-[#EDF9F1] rounded-2xl p-4 border border-[#CDEEDA] group transition-all">
                                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
                                        <Gift size={17} className="text-[#2F9E5B]" />
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium mb-0.5">Bonus</p>
                                    <p className="text-lg font-bold text-gray-900 tracking-tight leading-tight">
                                        ₹{bonus.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* RIGHT COLUMN: RECENT PAYOUTS */}
                    <div className="w-full lg:w-[400px] flex flex-col">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col pb-1">
                            <div className="px-4 py-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 tracking-tight">Activity Log</h3>
                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">Real-time transaction history</p>
                                </div>
                                {transactions.length > 15 && (
                                    <button 
                                        onClick={() => setShowAllTxns(!showAllTxns)}
                                        className="text-xs font-semibold text-[#843D9B] bg-[#F5EDFA] px-3 py-1 rounded-full hover:bg-[#EBDDF3]"
                                    >
                                        {showAllTxns ? 'Show Less' : 'View All'}
                                    </button>
                                )}
                            </div>

                            <div className="px-2 py-1 divide-y divide-gray-100">
                                {transactions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                                        <ShoppingBag size={32} className="text-gray-200 mb-3" />
                                        <p className="text-sm font-bold text-gray-400">No recent activity.</p>
                                    </div>
                                ) : (showAllTxns ? transactions : transactions.slice(0, 15)).map((item, i) => {
                                    const isCredit = item.type === 'credit' || (item.id && !item.id.startsWith('Peak')) || (item.badge === 'INCENTIVE');
                                    return (
                                        <div key={i} className="group px-2 py-3 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-3">
                                            <div className="w-10 h-10 bg-[#F5EDFA] rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                {item.img === 'bonus' || (item.description && item.description.includes('bonus'))
                                                    ? <Gift size={18} className="text-[#843D9B]" />
                                                    : <ShoppingBag size={18} className="text-[#843D9B]" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                                                    {item._id ? (
                                                        item.category === 'withdrawal' && item.withdrawalRequest?.status === 'paid' 
                                                        ? 'Withdrawal Completed' 
                                                        : (item.description || `Order #${item.orderId || 'N/A'}`)
                                                    ) : (item.id.startsWith('AL') ? `Order #${item.id}` : item.id)}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[11px] text-gray-400 font-medium">
                                                        {item.createdAt ? formatTime(item.createdAt) : item.time}
                                                    </p>
                                                    {item.withdrawalRequest?.proofOfPayment && (
                                                        <a href={item.withdrawalRequest.proofOfPayment} target="_blank" rel="noreferrer" className="text-[9px] font-black text-[#843D9B] bg-[#843D9B]/10 px-1.5 py-0.5 rounded hover:bg-[#843D9B]/20 transition-colors flex items-center gap-1">
                                                            <ArrowUpRight size={10} /> Receipt
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {isCredit ? '+' : '-'}₹{(item.amount || 0).toLocaleString('en-IN')}
                                                </p>
                                                <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wide ${item.badgeColor || getBadgeStyle(getBadgeLabel(item))}`}>
                                                    {item.badge || getBadgeLabel(item)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Withdrawal Modal */}
            <AnimatePresence>
                {showWithdrawModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-sm md:items-center"
                        onClick={() => !isSubmitting && setShowWithdrawModal(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:p-8 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setShowWithdrawModal(false)}
                                disabled={isSubmitting}
                                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-3 mb-6 md:mb-8 pr-12">
                                <div className="w-12 h-12 bg-[#F5EDFA] text-[#843D9B] rounded-xl flex items-center justify-center shrink-0">
                                    <Send size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight">Withdraw Funds</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Directly to UPI</p>
                                </div>
                            </div>

                            <form onSubmit={handleWithdrawRequest} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-2xl font-black text-slate-900 focus:outline-none focus:border-[#843D9B] focus:bg-white transition-all"
                                        min="100"
                                        max={stats.balance}
                                        disabled={isSubmitting}
                                    />
                                    <div className="flex items-center justify-between mt-2 px-2">
                                        <p className="text-[10px] font-bold text-slate-500">Available: ₹{stats.balance?.toLocaleString()}</p>
                                        <button
                                            type="button"
                                            onClick={() => setWithdrawAmount(stats.balance)}
                                            className="text-[10px] font-black text-[#843D9B] uppercase tracking-widest"
                                        >
                                            Max
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">UPI ID</label>
                                    <input
                                        type="text"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        placeholder="username@bank"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#843D9B] focus:bg-white transition-all"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !withdrawAmount || !upiId}
                                    className="w-full bg-[#843D9B] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary-dark active:scale-95 transition-all shadow-xl shadow-indigo-900/10 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Request Withdrawal'
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


        </div>
    );
};

export default TailorEarnings;
