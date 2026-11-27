import React, { useEffect, useState, useRef } from 'react';
import { resolveRazorpayKey, createRazorpayInstance } from '../../../utils/razorpay';
import { ArrowLeft, ArrowRight, Lock, ShieldCheck, MapPin, Package, Loader2, FileText, ShoppingBag, Truck, Pencil, Calendar, Home, BadgeCheck, Headphones } from 'lucide-react';
import OrderFlowStepper from '../components/OrderFlowStepper';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';
import useCheckoutStore from '../../../store/checkoutStore';
import useAddressStore from '../../../store/userStore';
import useCartStore from '../../../store/cartStore';
import BillDetails from '../components/checkout/summary/BillDetails';
import CouponOfferSection from '../components/checkout/summary/CouponOfferSection';
import ServiceReviewCard from '../components/checkout/summary/ServiceReviewCard';
import MeasurementSchedulePicker from '../components/checkout/summary/MeasurementSchedulePicker';
import { formatCheckoutAddress, splitAdvanceRemaining } from '../../../utils/checkoutBilling';

import useOrderStore from '../../../store/orderStore';

const CheckoutSummary = () => {
    const navigate = useNavigate();
    const {
        serviceItems,
        buyNowItem,
        isBuyNowMode,
        clearCheckout,
        removeServiceItem,
        setBuyNowMode,
        addServiceItem,
        checkoutType,
        appliedCoupon,
        setAppliedCoupon,
        clearAppliedCoupon,
    } = useCheckoutStore(state => state);
    const { items: cartItems, getTotalPrice, clearCart } = useCartStore(state => state);
    const addOrder = useOrderStore(state => state.addOrder);
    
    // Properly select state to ensure reactivity
    const addresses = useAddressStore(state => state.addresses);
    const selectedAddressId = useAddressStore(state => state.selectedAddressId);
    const fetchAddresses = useAddressStore(state => state.fetchAddresses);
    
    // Derive selected address
    const selectedAddress = addresses.find(addr => addr._id === selectedAddressId) || addresses[0];

    // Fetch addresses if they are empty (e.g., on page refresh)
    useEffect(() => {
        if (addresses.length === 0) {
            fetchAddresses();
        }
    }, [addresses.length, fetchAddresses]);



    const currentCheckoutItems = React.useMemo(() => {
        if (isBuyNowMode && buyNowItem) return [buyNowItem];
        const valid = serviceItems.filter((item) => !item.configuration?.pending);
        const seen = new Set();
        return valid.filter((item) => {
            const sid = String(item.serviceDetails?._id || item.serviceDetails?.id || item.basketId || '');
            if (!sid || seen.has(sid)) return false;
            seen.add(sid);
            return true;
        });
    }, [isBuyNowMode, buyNowItem, serviceItems]);
    const isServiceCheckout = checkoutType === 'service' || (!checkoutType && currentCheckoutItems.length > 0);
    const isCartCheckout = checkoutType === 'cart' || (!checkoutType && cartItems.length > 0 && currentCheckoutItems.length === 0);

    const hasTailorAtHome = React.useMemo(() => {
        return currentCheckoutItems.some(item => 
            item.configuration?.isTailorAtHome || 
            item.configuration?.measurements?.option === 'visit' || 
            item.configuration?.measurements?.type === 'home' ||
            (item.pricing?.tailorAtHome && item.pricing.tailorAtHome > 0)
        );
    }, [currentCheckoutItems]);

    const [specialInstructions, setSpecialInstructions] = useState('');
    // Same delivery estimate as the service configuration page (express 10, premium 7, standard 15 days)
    const checkoutDeliveryType = String(currentCheckoutItems[0]?.configuration?.deliveryType || 'standard').toLowerCase();
    const checkoutDeliveryDays = checkoutDeliveryType === 'express' ? 10 : checkoutDeliveryType === 'premium' ? 7 : 15;
    const estimatedDeliveryDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + checkoutDeliveryDays);
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    })();

    const existingScheduleItem = currentCheckoutItems.find(item => 
        item.configuration?.scheduledDate || item.configuration?.scheduledTimeSlot || item.configuration?.measurementSchedule
    );
    const [measurementSchedule, setMeasurementSchedule] = useState(() => ({
        scheduledDate: existingScheduleItem?.configuration?.scheduledDate || existingScheduleItem?.configuration?.measurementSchedule?.scheduledDate || '',
        scheduledTimeSlot: existingScheduleItem?.configuration?.scheduledTimeSlot || existingScheduleItem?.configuration?.measurementSchedule?.scheduledTimeSlot || 'ASAP',
        scheduledTime: existingScheduleItem?.configuration?.scheduledTime || existingScheduleItem?.configuration?.measurementSchedule?.scheduledTime || null,
        isAsap: existingScheduleItem?.configuration?.isAsap ?? (existingScheduleItem?.configuration?.measurementSchedule?.isAsap ?? true)
    }));

    useEffect(() => {
        const itemWithSchedule = currentCheckoutItems.find(item => 
            item.configuration?.scheduledDate || item.configuration?.scheduledTimeSlot || item.configuration?.measurementSchedule
        );
        if (itemWithSchedule?.configuration) {
            const cfg = itemWithSchedule.configuration;
            const sched = cfg.measurementSchedule || cfg;
            setMeasurementSchedule(prev => ({
                scheduledDate: prev.scheduledDate || sched.scheduledDate || '',
                scheduledTimeSlot: prev.scheduledTimeSlot && prev.scheduledTimeSlot !== 'ASAP' ? prev.scheduledTimeSlot : (sched.scheduledTimeSlot || 'ASAP'),
                scheduledTime: prev.scheduledTime || sched.scheduledTime || null,
                isAsap: sched.isAsap ?? prev.isAsap
            }));
        }
    }, [currentCheckoutItems]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingText, setLoadingText] = useState('Initializing...');
    const hasNavigated = useRef(false);
    const [bulkOrder, setBulkOrder] = useState(null);
    const location = useLocation();
    const bulkOrderId = location.state?.bulkOrderId;

    const [advancePercentage, setAdvancePercentage] = useState(30);
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false); // Kept for backwards compatibility in JSX if needed
    
    // Fetch Admin Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/cms/settings');
                if (res.data.success) {
                    if (res.data.data?.walletConfig?.advancePercentage) {
                        setAdvancePercentage(res.data.data.walletConfig.advancePercentage);
                    }
                }
            } catch (err) {
                if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
                    console.error("Failed to fetch settings:", err);
                }
            }
        };
        fetchSettings();
    }, []);

    const [currentPricing, setCurrentPricing] = useState({
        total: 0,
        base: 0,
        taxes: 0,
        delivery: 0,
        platformFee: 0,
        platformFeePercentage: 0,
        gstPercentage: 0
    });
    const [isLoadingPricing, setIsLoadingPricing] = useState(true);

    // Fetch Bulk Order Details
    useEffect(() => {
        if (!bulkOrderId) return;
        
        const fetchBulkOrder = async () => {
            try {
                const res = await api.get(`/bulk-orders/${bulkOrderId}`);
                if (res.data.success) {
                    setBulkOrder(res.data.data);
                }
            } catch (err) {
                if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
                    console.error("Failed to fetch bulk order:", err);
                    toast.error("Failed to load bulk order details");
                }
            }
        };
        fetchBulkOrder();
    }, [bulkOrderId]);

    // Note: Auto-redirect on empty cart removed to prevent hijacking navigation during/after order creation.

    // Fetch Price Summary from Backend API
    useEffect(() => {
        const fetchPricing = async () => {
            if (bulkOrder) {
                setCurrentPricing({
                    total: bulkOrder.quote.depositRequired,
                    base: bulkOrder.quote.depositRequired,
                    taxes: 0,
                    delivery: 0,
                    platformFee: 0,
                    platformFeePercentage: 0,
                    gstPercentage: 0
                });
                setIsLoadingPricing(false);
                return;
            }

            if (!isCartCheckout && currentCheckoutItems.length === 0) {
                setIsLoadingPricing(false);
                return;
            }

            setIsLoadingPricing(true);
            try {
                const items = isCartCheckout ? cartItems : currentCheckoutItems;
                const res = await api.post('/orders/price-summary', {
                    items,
                    deliveryAddress: selectedAddress,
                    isCartCheckout
                });
                if (res.data.success) {
                    setCurrentPricing(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch price summary:", err);
                // Estimate only (no GST / fees) — the server recalculates the real total on order
                toast.error("Couldn't load live pricing. Showing an estimate; final amount is confirmed at payment.");
                const fallbackBase = isCartCheckout
                    ? cartItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0)
                    : currentCheckoutItems.reduce((acc, it) => acc + (Number(it.pricing?.base) || 0), 0);
                const fallbackAddons = !isCartCheckout ? currentCheckoutItems.reduce((acc, it) => acc + (Number(it.pricing?.addons) || 0), 0) : 0;
                const fallbackFabric = !isCartCheckout ? currentCheckoutItems.reduce((acc, it) => acc + (Number(it.pricing?.fabric) || 0), 0) : 0;
                const fallbackTailorAtHome = !isCartCheckout ? currentCheckoutItems.reduce((acc, it) => acc + (Number(it.pricing?.tailorAtHome) || 0), 0) : 0;
                const subtotal = fallbackBase + fallbackAddons + fallbackFabric + fallbackTailorAtHome;
                setCurrentPricing(prev => ({
                    ...prev,
                    base: fallbackBase,
                    addons: fallbackAddons,
                    fabric: fallbackFabric,
                    tailorAtHome: fallbackTailorAtHome,
                    total: subtotal,
                    taxes: 0,
                    delivery: 0,
                }));
            } finally {
                setIsLoadingPricing(false);
            }
        };
        fetchPricing();
    }, [bulkOrder, cartItems, currentCheckoutItems, isCartCheckout, selectedAddress]);

    const isCartAlteration = isCartCheckout && cartItems.length > 0 && cartItems[0].isAlteration;
    const isCartCustomDesign = isCartCheckout && cartItems.length > 0 && cartItems[0].isCustomDesign;
    const isAlterationCheckout = isCartAlteration || (isServiceCheckout && currentCheckoutItems.some(item => 
        item.serviceDetails?.category?.name?.toLowerCase().includes('alteration') || 
        item.serviceDetails?.tags?.some(t => t.toLowerCase().includes('alteration'))
    ));
    const requireFullPayment = (isCartCheckout && !isCartAlteration && !isCartCustomDesign) || (isServiceCheckout && isAlterationCheckout);

    const baseTotal = Math.round(Number(currentPricing?.total) || 0);
    const couponCheckoutType = isCartCheckout ? 'store' : 'service';

    // Re-validate applied coupon when order total changes (address, cart qty, etc.)
    useEffect(() => {
        if (!appliedCoupon?.code || baseTotal <= 0 || isLoadingPricing) return;

        let cancelled = false;
        const revalidate = async () => {
            try {
                const res = await api.post('/customers/apply-promo', {
                    code: appliedCoupon.code,
                    orderAmount: baseTotal,
                    checkoutType: couponCheckoutType,
                });
                if (cancelled) return;
                if (!res.data?.success) {
                    clearAppliedCoupon();
                    return;
                }
                const data = res.data.data;
                setAppliedCoupon({
                    code: data.code,
                    discount: Math.round(Number(data.discount) || 0),
                    description: data.description || '',
                    discountType: data.discountType,
                    discountValue: data.discountValue,
                });
            } catch {
                if (!cancelled) clearAppliedCoupon();
            }
        };
        revalidate();
        return () => { cancelled = true; };
    }, [baseTotal, couponCheckoutType, isLoadingPricing]); // eslint-disable-line react-hooks/exhaustive-deps

    // coupons never apply to a bulk deposit (the server charges the quoted deposit in full)
    const discountAmount = appliedCoupon && !bulkOrderId ? Math.round(Number(appliedCoupon.discount) || 0) : 0;
    const displayPricing = React.useMemo(() => {
        if (!appliedCoupon || discountAmount <= 0 || bulkOrderId) {
            return { ...currentPricing, discountAmount: 0, couponCode: '' };
        }
        return {
            ...currentPricing,
            discountAmount,
            couponCode: appliedCoupon.code,
            preDiscountTotal: baseTotal,
            total: Math.max(0, baseTotal - discountAmount),
        };
    }, [currentPricing, appliedCoupon, discountAmount, baseTotal, bulkOrderId]);

    const finalTotal = Math.round(Number(displayPricing?.total) || 0);
    // The server tells us the exact advance rule it will charge (same rule as createOrder);
  // the local guess is only used until the price summary arrives.
  const effectiveAdvancePct = Number.isFinite(Number(currentPricing?.advancePercentage)) && currentPricing?.advancePercentage != null
    ? Number(currentPricing.advancePercentage)
    : (requireFullPayment ? 100 : (advancePercentage || 30));
    const { advanceAmount } = splitAdvanceRemaining(finalTotal, effectiveAdvancePct);

    const handlePayment = async () => {
        if (!selectedAddress) {
            toast.error('Please select a delivery address first');
            navigate('/user/checkout/address');
            return;
        }

        setIsProcessing(true);
        try {
            let order;

            if (!bulkOrderId) {
                // If it's a Custom Alteration from Cart
                if (isCartAlteration) {
                    setLoadingText('Submitting alteration request...');
                    const altRes = await api.post('/alterations/request', {
                        deliveryAddress: {
                            street: selectedAddress.street,
                            city: selectedAddress.city,
                            state: selectedAddress.state || '',
                            zipCode: selectedAddress.zipCode,
                            location: selectedAddress.location
                        }
                    });
                    if (!altRes.data.success) throw new Error('Alteration request failed');
                    
                    const createdAlt = altRes.data.data;
                    clearCart();
                    hasNavigated.current = true;
                    navigate('/user/checkout/success', {
                        replace: true,
                        state: {
                            orderId: createdAlt?._id,
                            orderNumber: createdAlt?.alterationId || 'ALT-REQ',
                            pendingAcceptance: true,
                            isAlteration: true,
                            isNewOrder: true
                        }
                    });
                    return;
                }

                // If it's a Custom Design from Cart
                if (isCartCustomDesign) {
                    setLoadingText('Submitting custom design request...');
                    const customDesignRes = await api.post('/custom-designs/request', {
                        tailorId: cartItems[0].tailor || cartItems[0].tailorId,
                        notes: cartItems[0].notes || '',
                        designType: cartItems[0].designType || 'custom',
                        fabricSource: cartItems[0].fabricSource || 'customer',
                        referenceImages: cartItems[0].referenceImages || [],
                        measurements: cartItems[0].measurements || {},
                        deliveryAddress: {
                            addressLine1: selectedAddress.addressLine1 || selectedAddress.address,
                            city: selectedAddress.city,
                            state: selectedAddress.state,
                            zipCode: selectedAddress.zipCode,
                            location: selectedAddress.location
                        }
                    });
                    if (!customDesignRes.data.success) throw new Error('Custom design request failed');
                    
                    const createdDesign = customDesignRes.data.data;
                    clearCart();
                    hasNavigated.current = true;
                    navigate('/user/checkout/success', {
                        replace: true,
                        state: {
                            orderId: createdDesign?._id,
                            orderNumber: createdDesign?.designId || 'DES-REQ',
                            pendingAcceptance: true,
                            isCustomDesign: true,
                            isNewOrder: true
                        }
                    });
                    return;
                }

                let payload;
                if (isServiceCheckout) {
                    const firstItemTailor = currentCheckoutItems[0]?.serviceDetails?.tailorId || currentCheckoutItems[0]?.serviceDetails?.tailor;
                    const resolvedTailorId =
                        (typeof firstItemTailor === 'object' ? (firstItemTailor?._id || firstItemTailor?.id) : firstItemTailor) ||
                        null;

                    payload = {
                        tailorId: resolvedTailorId,
                        isMeasurementHome: currentCheckoutItems.some(item => item.configuration?.isTailorAtHome || item.configuration?.measurements?.type === 'home' || item.configuration?.measurements?.option === 'visit'),
                        items: currentCheckoutItems.map(item => {
                            const rawId = item.serviceDetails?._id || item.serviceDetails?.id;
                            const serviceId = (rawId && typeof rawId === 'string' && rawId.length === 24) ? rawId : (item.serviceDetails?.id || item.serviceDetails?._id);
                            const rawFabric = item.configuration?.selectedFabric?._id || item.configuration?.selectedFabric?.id || item.configuration?.selectedFabric;
                            const fabricId = (rawFabric && typeof rawFabric === 'string' && rawFabric.length === 24) ? rawFabric : null;

                            return {
                                service: serviceId,
                                fabricSource: item.configuration?.fabricSource || 'customer',
                                deliveryType: item.configuration?.deliveryType || 'standard',
                                selectedFabric: fabricId,
                                quantity: 1,
                                price: item.pricing?.base || 0,
                                measurements: item.configuration?.isTailorAtHome ? { type: 'home' } : item.configuration?.measurements || {},
                                isTailorAtHome: !!item.configuration?.isTailorAtHome,
                                selectedStyle: item.configuration?.selectedStyle || null,
                                addons: item.configuration?.addons || item.configuration?.styleAddons || item.addons || item.styleAddons || [],
                                customizations: item.configuration?.customizations || item.customizations || {}
                            };
                        }),
                        totalAmount: finalTotal,
                        promoCode: appliedCoupon?.code || undefined,
                        specialInstructions: specialInstructions.trim() || undefined,
                        deliveryFee: currentPricing.delivery || 0,
                        platformFee: currentPricing.platformFee || 0,
                        gstAmount: currentPricing.taxes || 0,
                        scheduledDate: measurementSchedule.scheduledDate || new Date().toISOString().split('T')[0],
                        scheduledTimeSlot: measurementSchedule.isAsap ? 'ASAP' : (measurementSchedule.scheduledTimeSlot || 'ASAP'),
                        scheduledTime: measurementSchedule.isAsap ? null : measurementSchedule.scheduledTime,
                        deliveryAddress: {
                            street: selectedAddress.street,
                            city: selectedAddress.city,
                            state: selectedAddress.state || '',
                            zipCode: selectedAddress.zipCode,
                            location: selectedAddress.location
                        }
                    };
                } else {
                    const firstItemTailor = cartItems[0]?.tailor;
                    const resolvedTailorId =
                        (typeof firstItemTailor === 'object' ? (firstItemTailor?._id || firstItemTailor?.id) : firstItemTailor) ||
                        null;

                    payload = {
                        tailorId: resolvedTailorId,
                        items: cartItems.map(item => {
                            const productId = item._id || item.id || item.productId;
                            return {
                                product: (productId && typeof productId === 'string' && productId.length === 24) ? productId : productId,
                                quantity: item.quantity || 1,
                                price: item.price || 0
                            };
                        }),
                        totalAmount: finalTotal,
                        promoCode: appliedCoupon?.code || undefined,
                        specialInstructions: specialInstructions.trim() || undefined,
                        deliveryFee: currentPricing.delivery || 0,
                        platformFee: currentPricing.platformFee || 0,
                        gstAmount: currentPricing.taxes || 0,
                        deliveryAddress: {
                            street: selectedAddress.street,
                            city: selectedAddress.city,
                            state: selectedAddress.state || '',
                            zipCode: selectedAddress.zipCode,
                            location: selectedAddress.location
                        }
                    };
                }

                setLoadingText('Submitting order...');
                const endpoint = isCartAlteration ? '/alterations/request' : '/orders';
                const orderRes = await api.post(endpoint, payload);
                if (!orderRes.data.success) throw new Error(isCartAlteration ? 'Alteration request failed' : 'Order creation failed');
                order = orderRes.data.data;
            }

            const targetOrderId = order?._id || order?.id || order?.orderId;
            const targetOrderNum = order?.orderId || order?.alterationId || targetOrderId;
            if (targetOrderId) {
                try {
                    sessionStorage.setItem('lastCreatedOrderId', targetOrderId);
                    sessionStorage.setItem('lastCreatedOrderNum', targetOrderNum);
                } catch (e) {}
            }

            if (!bulkOrderId) {
                if (requireFullPayment && finalTotal > 0) {
                    setLoadingText('Connecting to Secure Payment...');
                    // Amount is computed by the server from the created order (never from client math)
                    const rzpOrderRes = await api.post('/orders/razorpay/create', { amount: finalTotal, orderObjectId: targetOrderId, paymentType: 'full' });
                    if (!rzpOrderRes.data.success) throw new Error('Razorpay order creation failed');
                    const rzpOrder = rzpOrderRes.data.data;

                    const options = {
                        key: resolveRazorpayKey(rzpOrder),
                        amount: rzpOrder.amount,
                        currency: rzpOrder.currency,
                        name: "SilaiWala",
                        description: "Full Order Payment",
                        order_id: rzpOrder.id,
                        handler: async function (response) {
                            try {
                                const verifyRes = await api.post(`/orders/razorpay/verify`, {
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    orderObjectId: targetOrderId,
                                    paymentType: 'full'
                                });

                                if (verifyRes.data.success) {
                                    if (isServiceCheckout) clearCheckout();
                                    else {
                                        clearCart();
                                        clearAppliedCoupon();
                                    }

                                    navigate('/user/checkout/success', {
                                        replace: true,
                                        state: { orderId: targetOrderId, orderNumber: targetOrderNum, isFullyPaid: true, isNewOrder: true }
                                    });
                                }
                            } catch (err) {
                                console.error('Verification failed:', err);
                                alert('Payment verification failed. Please contact support.');
                            } finally {
                                setIsProcessing(false);
                                setLoadingText('Initializing...');
                            }
                        },
                        prefill: {
                            name: selectedAddress?.receiverName || "",
                            contact: selectedAddress?.phone || ""
                        },
                        theme: { color: "#843D9B" },
                        modal: {
                            // Closing the Razorpay sheet must not leave the button stuck on "processing"
                            ondismiss: () => { setIsProcessing(false); setLoadingText('Initializing...'); toast('Payment cancelled. Your order is saved — you can pay from My Orders.'); }
                        }
                    };

                    const rzp = await createRazorpayInstance(options);
                    rzp.on('payment.failed', function (response) {
                        setIsProcessing(false);
                        setLoadingText('Initializing...');
                        alert('Payment failed: ' + response.error.description);
                    });
                    rzp.open();
                    return;
                }

                // NORMAL STITCHING ORDER: Send to tailor for acceptance and navigate to success screen
                if (isServiceCheckout) clearCheckout();
                else {
                    clearCart();
                    clearAppliedCoupon();
                }
                hasNavigated.current = true;
                navigate('/user/checkout/success', {
                    replace: true,
                    state: { 
                        orderId: targetOrderId, 
                        orderNumber: targetOrderNum, 
                        pendingAcceptance: true,
                        isAlteration: isCartAlteration,
                        isNewOrder: true
                    }
                });
                return;
            }

            // ONLY BULK ORDERS DO DEPOSIT PAYMENT HERE NOW
            if (finalTotal <= 0) {
                const verifyRes = await api.post(`/bulk-orders/${bulkOrderId}/accept`);

                if (verifyRes.data.success) {
                    navigate('/user/checkout/success', {
                        state: { orderId: bulkOrderId, orderNumber: bulkOrder.orderId, isBulk: true, isNewOrder: true }
                    });
                } else {
                    toast.error('Failed to update bulk order');
                    setIsProcessing(false);
                }
                return;
            }

            setLoadingText('Connecting to Secure Payment...');
            // the deposit amount is decided by the server from the quote, not sent by the browser
            const rzpOrderRes = await api.post(`/bulk-orders/${bulkOrderId}/razorpay/create`);
            if (!rzpOrderRes.data.success) throw new Error('Razorpay order creation failed');
            const rzpOrder = rzpOrderRes.data.data;

            const options = {
                key: resolveRazorpayKey(rzpOrder),
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
                name: "SilaiWala",
                description: "Bulk Order Deposit",
                order_id: rzpOrder.id,
                handler: async function (response) {
                    try {
                        const verifyRes = await api.post(`/bulk-orders/${bulkOrderId}/razorpay/verify`, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (verifyRes.data.success) {
                            navigate('/user/checkout/success', {
                                state: { orderId: bulkOrderId, orderNumber: bulkOrder.orderId, isBulk: true, isNewOrder: true }
                            });
                        }
                    } catch (err) {
                        console.error('Verification failed:', err);
                        alert('Payment verification failed. Please contact support.');
                    } finally {
                        setIsProcessing(false);
                        setLoadingText('Initializing...');
                    }
                },
                prefill: {
                    name: selectedAddress?.receiverName || "",
                    contact: selectedAddress?.phone || ""
                },
                theme: { color: "#843D9B" },
                modal: { ondismiss: () => { setIsProcessing(false); setLoadingText('Initializing...'); } }
            };

            const rzp = await createRazorpayInstance(options);
            rzp.on('payment.failed', function (response) {
                setIsProcessing(false);
                setLoadingText('Initializing...');
                alert('Payment failed: ' + response.error.description);
            });
            rzp.open();

        } catch (error) {
            console.error('Payment process failed:', error);
            alert(error.response?.data?.message || 'Payment initialization failed. Please try again.');
            setIsProcessing(false);
            setLoadingText('Initializing...');
        }
    };

    if (!bulkOrderId && currentCheckoutItems.length === 0 && cartItems.length === 0 && !isProcessing && !hasNavigated.current) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <ShoppingBag size={48} className="text-gray-300 mb-3" />
                <h3 className="text-base font-bold text-gray-900 mb-1">Your cart is empty</h3>
                <p className="text-xs text-gray-500 mb-4">Please select a service or product to continue.</p>
                <button
                    onClick={() => navigate('/user/services')}
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-md hover:bg-primary-dark cursor-pointer"
                >
                    Explore Services
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-32 font-sans text-gray-900">
            {/* Full Screen Processing Loader */}
            {isProcessing && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[1000] flex flex-col items-center justify-center text-white">
                    <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                    <h2 className="text-xl font-black uppercase tracking-widest">{loadingText}</h2>
                    <p className="text-xs font-bold text-gray-300 mt-2 opacity-80">Please do not close this window</p>
                </div>
            )}
            {/* 1. Header */}
            <div className="sticky top-0 z-50 bg-white/95 px-4 pb-3 pt-4 backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-xl items-center gap-2">
                    <button onClick={() => navigate(-1)} aria-label="Back" className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center text-[#1A1523] cursor-pointer">
                        <ArrowLeft size={22} />
                    </button>
                    <div className="min-w-0 flex-1 text-left">
                        <h1 className="text-[19px] font-bold leading-tight text-[#1A1523]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Review &amp; Place Order</h1>
                        <p className="truncate text-[11.5px] text-gray-500">
                            {isServiceCheckout && currentCheckoutItems.length > 1
                                ? `${currentCheckoutItems.length} garments · one tailor · one delivery`
                                : 'Final step - confirm your details'}
                        </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F6EEFA] px-2.5 py-1.5 text-[11px] font-semibold text-[#6A2385] ring-1 ring-[#E4D6EC]">
                        <ShieldCheck size={13} /> 100% Secure
                    </span>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pb-4 pt-1 space-y-3.5 animate-in fade-in duration-500">

                {isServiceCheckout && !bulkOrderId && <OrderFlowStepper current={3} />}

                {isCalculatingDistance && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-700 animate-pulse">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-bold">Calculating road distance for Tailor visit...</span>
                    </div>
                )}

                {/* 2. Review Section */}
                {bulkOrderId && bulkOrder ? (
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs mb-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                            <span className="px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/10">Bulk Order Deposit</span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mb-4 tracking-tight">Inquiry Review</h3>
                        <div className="flex gap-5">
                            <div className="w-20 h-24 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 shrink-0">
                                <Package size={24} className="text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-gray-900 leading-tight">{bulkOrder.serviceType}</h4>
                                <p className="text-xs text-gray-500 font-semibold mt-1">{bulkOrder.organizationName || 'Bulk Inquiry'}</p>
                                <div className="mt-4 flex items-center gap-6">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Quantity</p>
                                        <p className="text-sm font-bold text-gray-900">{bulkOrder.estimatedQuantity} Units</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Total Quote</p>
                                        <p className="text-sm font-bold text-gray-900">₹{bulkOrder.quote.totalAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : isServiceCheckout ? (
                    <div className="space-y-4">
                        {currentCheckoutItems.map((item, idx) => (
                            <ServiceReviewCard
                                key={item.basketId || idx}
                                service={item.serviceDetails}
                                config={item.configuration}
                                pricing={item.pricing}
                                onRemove={!isBuyNowMode ? () => removeServiceItem(idx) : undefined}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs mb-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Cart Items ({cartItems.length})</h3>
                        <div className="space-y-4">
                            {cartItems.map((item) => {
                                const isItemAlteration = item.isAlteration;
                                const imageSrc = isItemAlteration ? item.config?.alterationImages?.[0] : (item.images?.[0] || item.image);
                                const title = isItemAlteration ? 'Custom Alteration Request' : item.title;
                                const description = isItemAlteration ? item.config?.alterationDescription : `Size: ${item.selectedSize} • ${item.selectedColor}`;
                                const priceDisplay = isItemAlteration ? 'Awaiting Quote' : `₹${item.price}`;

                                return (
                                    <div key={item.cartId} className="flex gap-4 items-center">
                                        <div className="w-16 h-20 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                                            <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{title}</h4>
                                            <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-1">{description}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-sm font-bold text-primary">{priceDisplay}</span>
                                                {!isItemAlteration && <span className="text-xs font-bold text-gray-400">QTY: {item.quantity}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Delivery Details Card */}
                <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#1A1523]">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3E9F8] text-[#6A2385]"><Truck size={16} /></span>
                            Delivery Details
                        </h3>
                        <button
                            onClick={() => navigate('/user/checkout/address')}
                            className="flex items-center gap-1 rounded-full bg-[#F6EEFA] px-3 py-1 text-[12px] font-semibold text-[#6A2385] ring-1 ring-[#E4D6EC] cursor-pointer"
                        >
                            <Pencil size={12} /> Edit
                        </button>
                    </div>

                    {selectedAddress ? (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {isServiceCheckout && (
                                <div className="flex items-center gap-3 rounded-2xl bg-[#FBF7FD] p-3 ring-1 ring-[#EFE8F4]">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6A2385] ring-1 ring-[#EFE8F4]"><Calendar size={17} /></span>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold capitalize text-[#1A1523]">{checkoutDeliveryType} Delivery</p>
                                        <p className="text-[11.5px] text-gray-500">By {estimatedDeliveryDate} · {checkoutDeliveryDays} days</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3 rounded-2xl bg-[#FBF7FD] p-3 ring-1 ring-[#EFE8F4]">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6A2385] ring-1 ring-[#EFE8F4]"><MapPin size={17} /></span>
                                <div className="min-w-0 text-left">
                                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#1A1523]">
                                        <span className="truncate">Deliver to {selectedAddress?.receiverName || ''}</span>
                                        {selectedAddress?.type && (
                                            <span className="rounded-md bg-[#F3E9F8] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-[#6A2385]">{selectedAddress.type}</span>
                                        )}
                                    </p>
                                    <p className="text-[11.5px] leading-snug text-gray-500">{formatCheckoutAddress(selectedAddress)}</p>
                                    {selectedAddress?.phone && <p className="mt-0.5 text-[11.5px] text-gray-500">Contact: <span className="font-semibold text-[#1A1523]">{selectedAddress.phone}</span></p>}
                                </div>
                            </div>
                            {hasTailorAtHome && (
                                <div className="flex items-center gap-3 rounded-2xl bg-[#FBF7FD] p-3 ring-1 ring-[#EFE8F4] sm:col-span-2">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#6A2385] ring-1 ring-[#EFE8F4]"><Home size={17} /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-[#1A1523]">Home Visit Selected</p>
                                        <p className="text-[11.5px] text-gray-500">Our executive will collect measurements at your home</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 rounded-2xl bg-amber-50 p-5 text-center ring-1 ring-amber-100">
                            <MapPin size={30} className="mx-auto text-amber-500 opacity-60" />
                            <p className="text-xs font-bold text-amber-900">No Address Selected</p>
                            <button
                                onClick={() => navigate('/user/checkout/address')}
                                className="rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                            >
                                Select Address Now
                            </button>
                        </div>
                    )}
                </div>

                {/* 3.5. Measurement Visit Schedule Picker */}
                {hasTailorAtHome && (
                    <MeasurementSchedulePicker
                        value={measurementSchedule}
                        onChange={setMeasurementSchedule}
                    />
                )}

                {/* 4. Coupon / Offers + Bill Details */}
                {!isCartAlteration && !bulkOrderId && !isLoadingPricing && (
                    <CouponOfferSection
                        orderAmount={baseTotal}
                        checkoutType={couponCheckoutType}
                        appliedCoupon={appliedCoupon}
                        onApplied={setAppliedCoupon}
                        onRemoved={clearAppliedCoupon}
                    />
                )}

                {isCartAlteration ? (
                    <div className="bg-primary/5 border border-primary/10 rounded-3xl p-5 text-center">
                        <h3 className="text-sm font-bold text-primary mb-1">Awaiting Quote</h3>
                        <p className="text-xs text-primary/80">The tailor will review your request and send you a custom price quote. You do not need to pay anything right now.</p>
                    </div>
                ) : isLoadingPricing ? (
                    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                    </div>
                ) : (
                    <BillDetails 
                        pricing={displayPricing} 
                        advancePercentage={effectiveAdvancePct} 
                        baseLabel={isCartCheckout ? "Product Charges" : "Stitching Charges"}
                    />
                )}

                {/* 5. Special Instructions (Optional) */}
                <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                    <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[#1A1523]">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3E9F8] text-[#6A2385]"><FileText size={16} /></span>
                        Additional Instructions <span className="text-[11px] font-medium text-gray-400">(Optional)</span>
                    </h3>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-[#E4D6EC] focus-within:ring-2 focus-within:ring-[#B98FCF]">
                        <textarea
                            rows={3}
                            maxLength={300}
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            placeholder="E.g., Use fine finishing and the same neck design as the reference image."
                            className="w-full resize-none bg-transparent text-[13px] text-[#1A1523] outline-none placeholder:text-gray-400"
                        />
                        <p className="text-right text-[11px] text-gray-400">{specialInstructions.length}/300</p>
                    </div>
                </div>

                {/* Trust row */}
                <div className="grid grid-cols-3 divide-x divide-[#EFE8F4] rounded-[22px] bg-[#FBF7FD] py-3 ring-1 ring-[#EFE8F4]">
                    {[
                        { icon: BadgeCheck, title: 'Verified Tailors', sub: 'Checked partners' },
                        { icon: Lock, title: 'Secure Payment', sub: 'Safe & encrypted' },
                        { icon: Headphones, title: 'Support', sub: 'Chat or call' },
                    ].map(({ icon: Icon, title, sub }) => (
                        <div key={title} className="flex flex-col items-center px-1 text-center">
                            <Icon size={20} className="text-[#6A2385]" />
                            <p className="mt-1 text-[11.5px] font-bold text-[#1A1523]">{title}</p>
                            <p className="text-[10px] text-gray-500">{sub}</p>
                        </div>
                    ))}
                </div>

            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] bg-white/95 px-4 py-3 shadow-[0_-12px_36px_-12px_rgba(42,15,56,0.22)] backdrop-blur sm:px-6">
                <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
                    <div className="min-w-0 text-left">
                        <p className="text-[11px] font-semibold text-gray-500">Total Payable</p>
                        <p className="text-[22px] font-bold leading-tight text-[#1A1523]">₹{finalTotal.toLocaleString('en-IN')}</p>
                        {discountAmount > 0 && (
                            <p className="text-[10.5px] font-semibold text-emerald-600">Coupon saved ₹{discountAmount.toLocaleString('en-IN')}</p>
                        )}
                        {effectiveAdvancePct < 100 && (
                            <p className="text-[11px] font-semibold text-[#6A2385]">Advance ({effectiveAdvancePct}%) ₹{advanceAmount.toLocaleString('en-IN')}</p>
                        )}
                    </div>
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing || !selectedAddress}
                        className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-[#8A3FA6] to-[#5A1A78] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_28px_-14px_rgba(90,26,120,0.9)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                        {isProcessing ? (
                            <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                        ) : (
                            <>Place Order <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutSummary;

