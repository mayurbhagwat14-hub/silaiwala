import React, { useState, useEffect } from 'react';
import { resolveRazorpayKey, createRazorpayInstance } from '../../../utils/razorpay';
import { CreditCard, Zap, Calendar, ArrowUpCircle, AlertTriangle, Star } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Subscription = () => {
    const [plans, setPlans] = useState([]);
    const [tailorData, setTailorData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubEnabled, setIsSubEnabled] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansRes, tailorRes] = await Promise.all([
                    api.get('/subscriptions'),
                    api.get('/tailors/me')
                ]);
                
                if (plansRes.data?.isEnabled === false) {
                    setIsSubEnabled(false);
                    setPlans([]);
                } else if (plansRes.data?.success) {
                    setIsSubEnabled(true);
                    setPlans(plansRes.data.data || []);
                }
                if (tailorRes.data.success) setTailorData(tailorRes.data.data);
            } catch (error) {
                console.error('Error fetching subscription data:', error);
                toast.error('Failed to load subscription plans');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSubscribe = async (planId) => {
        const selectedPlan = plans.find(p => p._id === planId);
        if (!selectedPlan) return;

        if (selectedPlan.price > 0) {
            try {
                toast.loading('Initializing payment...');
                const rzpOrderRes = await api.post('/subscriptions/create-order', { planId });
                toast.dismiss();

                if (!rzpOrderRes.data.success) throw new Error('Failed to create payment order');
                const rzpOrder = rzpOrderRes.data.data;

                const options = {
                    key: resolveRazorpayKey(rzpOrder),
                    amount: rzpOrder.amount,
                    currency: rzpOrder.currency,
                    name: "SilaiWala",
                    description: `Subscription: ${selectedPlan.name}`,
                    order_id: rzpOrder.orderId,
                    handler: async function (response) {
                        try {
                            toast.loading('Verifying payment...');
                            const verifyRes = await api.post('/subscriptions/subscribe', {
                                planId: planId,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            });

                            if (verifyRes.data.success) {
                                toast.dismiss();
                                toast.success('Subscription plan activated!');
                                const tailorRes = await api.get('/tailors/me');
                                if (tailorRes.data.success) setTailorData(tailorRes.data.data);
                            }
                        } catch (err) {
                            toast.dismiss();
                            console.error('Payment verification failed:', err);
                            toast.error(err.response?.data?.message || 'Payment verification failed');
                        }
                    },
                    prefill: {
                        name: tailorData?.shopName || "Tailor",
                        contact: tailorData?.user?.phone || ""
                    },
                    theme: { color: "#843D9B" }
                };

                const rzp = await createRazorpayInstance(options);
                rzp.on('payment.failed', function (response) {
                    toast.error('Payment failed: ' + response.error.description);
                });
                rzp.open();

            } catch (error) {
                toast.dismiss();
                toast.error(error.response?.data?.message || error.message || 'Failed to initialize payment');
            }
        } else {
            // Free plan
            try {
                toast.loading('Activating plan...');
                const res = await api.post('/subscriptions/subscribe', { planId });
                if (res.data.success) {
                    toast.dismiss();
                    toast.success('Subscription plan activated!');
                    // Refresh tailor data to get updated activePlan
                    const tailorRes = await api.get('/tailors/me');
                    if (tailorRes.data.success) setTailorData(tailorRes.data.data);
                }
            } catch (error) {
                toast.dismiss();
                toast.error(error.response?.data?.message || 'Failed to activate plan');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#843D9B]"></div>
            </div>
        );
    }

    const activePlan = tailorData?.activePlan;
    const planExpiryDate = tailorData?.planExpiryDate ? new Date(tailorData.planExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Subscribed';

    // Light, brand-consistent look per plan theme (content and actions are the same for every theme)
    const PLAN_STYLES = {
        elite: {
            card: 'border-amber-200',
            ring: 'ring-2 ring-amber-400/60',
            badge: 'bg-amber-100 text-amber-800',
            badgeText: 'Best Value',
            accent: 'text-amber-700',
            box: 'bg-amber-50 border-amber-100',
            boxLabel: 'text-amber-700',
            button: 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20',
            current: 'bg-amber-100 text-amber-700',
            cta: 'Upgrade Now',
            Icon: Star,
            iconClass: 'text-amber-500',
        },
        premium: {
            card: 'border-[#E5D3F0]',
            ring: 'ring-2 ring-[#843D9B]/40',
            badge: 'bg-[#843D9B] text-white',
            badgeText: 'Popular',
            accent: 'text-[#843D9B]',
            box: 'bg-[#F5EDFA] border-[#E5D3F0]',
            boxLabel: 'text-[#843D9B]',
            button: 'bg-[#843D9B] text-white hover:bg-[#6B2F7E] shadow-md shadow-[#843D9B]/20',
            current: 'bg-[#F5EDFA] text-[#843D9B]',
            cta: 'Select Plan',
            Icon: Zap,
            iconClass: 'text-[#843D9B]',
        },
        basic: {
            card: 'border-gray-100',
            ring: 'ring-2 ring-gray-300',
            badge: 'bg-gray-100 text-gray-700',
            badgeText: null,
            accent: 'text-gray-500',
            box: 'bg-gray-50 border-gray-100',
            boxLabel: 'text-gray-500',
            button: 'bg-gray-900 text-white hover:bg-black',
            current: 'bg-gray-100 text-gray-500',
            cta: 'Select Plan',
            Icon: null,
            iconClass: '',
        },
    };

    return (
        <div className="space-y-3 md:space-y-4 animate-in fade-in duration-500 bg-[#F5F5F5] min-h-full px-3 pt-3 pb-24 md:p-0">

            {/* Current Plan Card */}
            {activePlan ? (
                <div className="bg-gradient-to-br from-[#6B2F7E] via-[#843D9B] to-[#9B5BB0] p-5 md:p-7 rounded-2xl text-white relative overflow-hidden shadow-lg shadow-[#843D9B]/20">
                    <div className="absolute top-0 right-0 p-5 opacity-10 pointer-events-none">
                        <Zap size={96} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <span className="bg-white/15 border border-white/20 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider">Active Plan</span>
                                <h3 className="text-2xl font-bold mt-2.5 tracking-tight">{activePlan.name}</h3>
                            </div>
                            <ArrowUpCircle size={32} className="text-white/60" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/15">
                            <div>
                                <p className="text-white/70 text-[11px] font-medium mb-0.5 flex items-center gap-1">
                                    <Calendar size={12} /> Expiry Date
                                </p>
                                <p className="text-sm font-semibold">{planExpiryDate}</p>
                            </div>
                            <div>
                                <p className="text-white/70 text-[11px] font-medium mb-0.5 flex items-center gap-1">
                                    <CreditCard size={12} /> Billing Cycle
                                </p>
                                <p className="text-sm font-semibold capitalize">{activePlan.billingCycle}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl relative overflow-hidden">
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="h-11 w-11 bg-white rounded-xl flex items-center justify-center text-red-500 shrink-0">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-red-600">No Active Plan</h3>
                            <p className="text-xs text-red-500/80 mt-0.5">Please select a plan below to activate your shop profile.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pricing Plans */}
            <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between px-1">
                    <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Available Plans</h4>
                </div>

                {plans.map((plan) => {
                    const isCurrentPlan = activePlan?._id === plan._id;
                    const st = PLAN_STYLES[plan.theme] || PLAN_STYLES.basic;
                    const ThemeIcon = st.Icon;

                    return (
                        <div
                            key={plan._id}
                            className={`bg-white border ${st.card} ${isCurrentPlan ? st.ring : ''} p-4 rounded-2xl relative overflow-hidden shadow-sm`}
                        >
                            {ThemeIcon && (
                                <div className="absolute top-0 right-0 p-3 opacity-[0.07] pointer-events-none">
                                    <ThemeIcon size={64} fill={plan.theme === 'elite' ? 'currentColor' : 'none'} className={st.iconClass} />
                                </div>
                            )}
                            <div className="flex justify-between items-start gap-3 relative z-10">
                                <div className="min-w-0">
                                    {plan.isPopular && st.badgeText && (
                                        <span className={`${st.badge} text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5 inline-block`}>{st.badgeText}</span>
                                    )}
                                    <p className="text-base font-bold text-gray-900">{plan.name}</p>
                                    <p className={`text-[11px] font-semibold mt-0.5 ${st.accent}`}>{plan.commissionRange}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg font-bold text-gray-900 leading-tight">{plan.price === 0 ? 'Free' : `₹${plan.price}`}</p>
                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">{plan.billingCycle}</p>
                                </div>
                            </div>
                            <div className={`${st.box} border rounded-xl p-3 mt-3 relative z-10`}>
                                <p className="text-xs text-gray-700 leading-relaxed">
                                    <span className={`${st.boxLabel} font-semibold uppercase tracking-wide text-[10px] block mb-1`}>Key Benefits</span>
                                    {plan.features.join(', ')}
                                </p>
                            </div>
                            <button
                                onClick={() => handleSubscribe(plan._id)}
                                disabled={isCurrentPlan}
                                className={`w-full mt-3 py-2.5 rounded-xl font-semibold text-sm transition-all relative z-10 ${isCurrentPlan ? `${st.current} cursor-not-allowed` : `${st.button} active:scale-[0.98]`}`}
                            >
                                {isCurrentPlan ? 'Current Plan' : st.cta}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                <div className="flex gap-3">
                    <div className="h-9 w-9 flex items-center justify-center bg-white rounded-xl text-amber-500 shrink-0">
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-amber-700">Warning</p>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                            If subscription expires, your shop will be hidden from customers and active orders may be reassigned.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscription;
