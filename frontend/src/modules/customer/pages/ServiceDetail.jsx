import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useRequireAuth } from '../../../hooks/useRequireAuth';
import OrderFlowStepper from '../components/OrderFlowStepper';
import { ArrowLeft, ChevronDown, ChevronUp, ChevronRight, Clock, ShoppingBag, Ruler, CheckCircle2, ShieldCheck, Info, Tag, Scissors, Wand2, MapPin, X, Upload, Camera, Image as ImageIcon, Loader2, Shirt, SlidersHorizontal, Eye, Pencil, Maximize2, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import ServiceHero from '../components/service-detail/ServiceHero';
import DeliverySelector from '../components/service-detail/DeliverySelector';
import MeasurementSelector from '../components/service-detail/MeasurementSelector';
import MeasurementSchedulePicker, { formatYYYYMMDD } from '../components/checkout/summary/MeasurementSchedulePicker';
import FabricSelector from '../components/service-detail/FabricSelector';
import CustomizationSelector from '../components/service-detail/CustomizationSelector';
import DesignUpload from '../components/service-detail/DesignUpload';
import PriceSummary from '../components/service-detail/PriceSummary';
import StyleAddonModal from '../components/service-detail/StyleAddonModal';
import useCheckoutStore from '../../../store/checkoutStore';
import useCartStore from '../../../store/cartStore';
import useMeasurementStore from '../../../store/measurementStore';
import useLocationStore from '../../../store/locationStore';
import useAddressStore from '../../../store/userStore';
import { calculateDistance } from '../../../utils/distance';
import api from '../../../utils/api';
import { getImageUrl } from '../../../utils/imageUrl';
import { sanitizeMeasurementFields } from '../../../utils/measurementFields';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                className="w-full flex justify-between items-center py-3 text-left group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-base font-bold text-gray-800 group-hover:text-primary transition-colors">{question}</span>
                {isOpen ? <ChevronUp size={16} className="text-primary" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            <motion.div
                initial={false}
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                className="overflow-hidden"
            >
                <p className="text-[11px] text-gray-500 pb-4 leading-relaxed font-medium">{answer}</p>
            </motion.div>
        </div>
    );
};

const ServiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { 
        initializeCheckout, 
        addServiceItem,
        selectServiceIntoBasket,
        serviceItems,
        removeServiceItem,
        updateServiceItem,
        setBuyNowMode,
        serviceDetails: storedDetails 
    } = useCheckoutStore(state => state);
    const cartItems = useCartStore(state => state.items);
    const addMeasurement = useMeasurementStore(state => state.addMeasurement);
    const { requireAuth } = useRequireAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [serviceData, setServiceData] = useState(null);
    const [preSelectedTailor, setPreSelectedTailor] = useState(null);
    const [storeHydrated, setStoreHydrated] = useState(
        () => useCheckoutStore.persist?.hasHydrated?.() ?? true
    );
    const [activeBasketIndex, setActiveBasketIndex] = useState(
        typeof location.state?.editBasketIndex === 'number' ? location.state.editBasketIndex : null
    );

    // Only restore draft if explicitly editing a basket item or navigating back with restoredState
    const isExplicitBasketRestore = Boolean(
        location.state?.restoreBasketItem ||
        typeof location.state?.editBasketIndex === 'number' ||
        location.state?.restoredState
    );
    const getSavedDraft = () => {
        if (!id || !isExplicitBasketRestore) return {};
        try {
            const saved = sessionStorage.getItem(`service_draft_${id}`);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    };
    const savedDraft = getSavedDraft();
    const restored = location.state?.restoredState || (Object.keys(savedDraft).length > 0 ? savedDraft : {});
    const editBasketIndex =
        activeBasketIndex != null
            ? activeBasketIndex
            : (typeof location.state?.editBasketIndex === 'number' ? location.state.editBasketIndex : null);
    const restoreBasketItem = location.state?.restoreBasketItem || null;

    // Wait for zustand persist so basket items don't "disappear" on first paint
    useEffect(() => {
        const persistApi = useCheckoutStore.persist;
        if (!persistApi?.onFinishHydration) {
            setStoreHydrated(true);
            return undefined;
        }
        if (persistApi.hasHydrated?.()) {
            setStoreHydrated(true);
            return undefined;
        }
        const unsub = persistApi.onFinishHydration(() => setStoreHydrated(true));
        return unsub;
    }, []);

    // Arriving to edit a specific item from basket
    useEffect(() => {
        if (typeof location.state?.editBasketIndex === 'number') {
            setActiveBasketIndex(location.state.editBasketIndex);
        }
    }, [location.state?.editBasketIndex]);

    // Clean up any stale unconfirmed pending items or duplicate items from previous visits
    useEffect(() => {
        if (!storeHydrated) return;
        const currentItems = useCheckoutStore.getState().serviceItems;
        const seen = new Set();
        const deduplicated = [];
        let hadDuplicates = false;
        for (const it of currentItems) {
            const sid = String(it.serviceDetails?._id || it.serviceDetails?.id || '');
            if (it.configuration?.pending) {
                hadDuplicates = true;
                continue;
            }
            if (sid && seen.has(sid)) {
                hadDuplicates = true;
                continue; // Deduplicate accidental double adds
            }
            if (sid) seen.add(sid);
            deduplicated.push(it);
        }
        if (hadDuplicates) {
            useCheckoutStore.setState({ serviceItems: deduplicated });
        }
    }, [storeHydrated]);

    const [currentStep, setCurrentStep] = useState(restored.currentStep || 'fabric'); // fabric -> details -> review

    const [deliveryType, setDeliveryType] = useState(
        restoreBasketItem?.configuration?.deliveryType || restored.deliveryType || 'standard'
    );
    const [measurementType, setMeasurementType] = useState(
        restoreBasketItem?.configuration?.measurements?.type || restored.measurementType || null
    );
    const [selectedStyle, setSelectedStyle] = useState(
        restoreBasketItem?.configuration?.selectedStyle || restored.selectedStyle || null
    );
    const [isTailorAtHome, setIsTailorAtHome] = useState(
        restoreBasketItem?.configuration?.isTailorAtHome || restored.isTailorAtHome || false
    );
    const [measurementSchedule, setMeasurementSchedule] = useState(() => ({
        scheduledDate: restoreBasketItem?.configuration?.scheduledDate || restored.measurementSchedule?.scheduledDate || restored.scheduledDate || '',
        scheduledTimeSlot: restoreBasketItem?.configuration?.scheduledTimeSlot || restored.measurementSchedule?.scheduledTimeSlot || restored.scheduledTimeSlot || 'ASAP',
        scheduledTime: restoreBasketItem?.configuration?.scheduledTime || restored.measurementSchedule?.scheduledTime || restored.scheduledTime || null,
        isAsap: restoreBasketItem?.configuration?.isAsap ?? (restored.measurementSchedule?.isAsap ?? (restored.isAsap ?? true)),
    }));
    const [selectedAddons, setSelectedAddons] = useState(
        restoreBasketItem?.configuration?.addons || restored.selectedAddons || []
    );
    const [selectedCustomizations, setSelectedCustomizations] = useState(
        restoreBasketItem?.configuration?.customizations || restored.selectedCustomizations || {}
    );
    const [catalogCustomizations, setCatalogCustomizations] = useState([]);
    const [isUploadingCustomStyle, setIsUploadingCustomStyle] = useState(false);

    const handleCustomStyleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingCustomStyle(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('image', file);

            let imageUrl = null;

            // 1. Try protected /upload endpoint
            try {
                const res = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data?.success && res.data?.data) {
                    imageUrl = res.data.data;
                }
            } catch (authErr) {
                console.warn('Protected /upload failed, attempting public upload:', authErr);
                // 2. Try public upload endpoint as fallback
                try {
                    const pubRes = await api.post('/upload/public', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (pubRes.data?.success && pubRes.data?.data) {
                        imageUrl = pubRes.data.data;
                    }
                } catch (pubErr) {
                    console.warn('Public upload endpoint failed:', pubErr);
                }
            }

            // 3. Ultimate Fallback: Base64 FileReader Data URL
            if (!imageUrl) {
                imageUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(file);
                });
            }

            if (imageUrl) {
                setSelectedStyle({
                    name: 'Custom Reference Design',
                    image: imageUrl,
                    isCustom: true,
                    description: 'Customer uploaded reference design photo'
                });
                import('react-hot-toast').then(({ toast }) => {
                    toast.success('Style reference photo uploaded!');
                });
            } else {
                import('react-hot-toast').then(({ toast }) => {
                    toast.error('Failed to upload style photo.');
                });
            }
        } catch (err) {
            console.error('Failed to upload custom style image:', err);
            import('react-hot-toast').then(({ toast }) => {
                toast.error('Upload failed. Please try again.');
            });
        } finally {
            setIsUploadingCustomStyle(false);
        }
    };
    const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
    const [fabricSource, setFabricSource] = useState(
        restoreBasketItem?.configuration?.fabricSource || restored.fabricSource || location.state?.fabricSource || 'customer'
    );
    const [selectedFabric, setSelectedFabric] = useState(
        restoreBasketItem?.configuration?.selectedFabric || restored.selectedFabric || location.state?.selectedFabric || null
    );
    const [selectedSavedProfile, setSelectedSavedProfile] = useState(restored.selectedSavedProfile || null);
    const [measurements, setMeasurements] = useState(
        restoreBasketItem?.configuration?.measurements || restored.measurements || null
    );
    const [visitSettings, setVisitSettings] = useState({ baseFee: 150, perKmFee: 20, freeKm: 3 });
    const [gstPercentage, setGstPercentage] = useState(5);
    const [platformFeePercentage, setPlatformFeePercentage] = useState(5);
    const { addresses, selectedAddressId } = useAddressStore(state => state);
    const selectedAddress = addresses.find(a => a._id === selectedAddressId);
    const storeCoords = useLocationStore(state => state.coordinates);
    const userCoords = selectedAddress?.location?.coordinates ? 
        { lat: selectedAddress.location.coordinates[1], lng: selectedAddress.location.coordinates[0] } : 
        storeCoords;
    const [roadDistanceKm, setRoadDistanceKm] = useState(null);
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

    const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
    const [formEpoch, setFormEpoch] = useState(0);

    /** Restore fabric/style/measurements UI from a basket row (1st vs 2nd garment). */
    const applyBasketItemToForm = (item) => {
        if (!item?.configuration) return;
        const cfg = item.configuration;
        const m = cfg.measurements || {};

        setDeliveryType(cfg.deliveryType || 'standard');
        setFabricSource(cfg.fabricSource || 'customer');
        setSelectedFabric(cfg.selectedFabric || null);
        setSelectedStyle(cfg.selectedStyle || null);
        setSelectedAddons(Array.isArray(cfg.addons) ? cfg.addons : []);
        setSelectedCustomizations(cfg.customizations || {});
        setIsTailorAtHome(!!cfg.isTailorAtHome || m?.type === 'home');
        if (cfg.scheduledDate || cfg.scheduledTimeSlot || cfg.measurementSchedule) {
            setMeasurementSchedule({
                scheduledDate: cfg.scheduledDate || cfg.measurementSchedule?.scheduledDate || '',
                scheduledTimeSlot: cfg.scheduledTimeSlot || cfg.measurementSchedule?.scheduledTimeSlot || 'ASAP',
                scheduledTime: cfg.scheduledTime || cfg.measurementSchedule?.scheduledTime || null,
                isAsap: cfg.isAsap ?? (cfg.measurementSchedule?.isAsap ?? true),
            });
        }
        setSelectedSavedProfile(null);

        if (!m || Object.keys(m).length === 0 || cfg.pending) {
            setMeasurementType(null);
            setMeasurements(null);
            setFormEpoch((e) => e + 1);
            return;
        }

        if (m.type === 'home') {
            setMeasurementType('home');
            setMeasurements({ type: 'home' });
        } else if (m.type === 'sample') {
            setMeasurementType('sample');
            setMeasurements({ ...m, type: 'sample' });
        } else if (m.type === 'slip' || m.slipImage || m.image) {
            setMeasurementType('upload');
            setMeasurements({
                type: 'slip',
                slipImage: m.slipImage || m.image || m.url || m.slipUrl || '',
                notes: m.notes || '',
                ...(m.sampleGarment ? { sampleGarment: true } : {}),
            });
        } else if (m.type === 'saved') {
            setMeasurementType('saved');
            setMeasurements({ ...m, type: 'saved' });
        } else {
            const { type, notes, sampleGarment, slipImage, isConfirmed, data, ...dims } = m;
            const dimSource = data && typeof data === 'object' ? data : dims;
            // Open self form so saved chest/waist/etc. are visible for this basket item
            setMeasurementType('new');
            setMeasurements({
                type: 'self',
                isConfirmed: true,
                data: { ...dimSource, notes: notes || dimSource.notes || '' },
                notes: notes || dimSource.notes || '',
                ...(sampleGarment ? { sampleGarment: true } : {}),
                ...(slipImage ? { slipImage } : {}),
            });
        }
        setFormEpoch((e) => e + 1);
    };

    // Basket item click / navigation → show that garment's saved measurements
    useEffect(() => {
        const item = location.state?.restoreBasketItem;
        const idx = location.state?.editBasketIndex;
        if (!item || typeof idx !== 'number') return;
        setActiveBasketIndex(idx);
        applyBasketItemToForm(item);
        requestAnimationFrame(() => {
            document.getElementById('measurement-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [id, location.state?.editBasketIndex, location.state?.restoreBasketItem?.basketId]);

    // Save draft state to sessionStorage so page refresh retains all inputs & confirmations
    useEffect(() => {
        if (!id) return;
        try {
            const draft = {
                deliveryType,
                measurementType,
                selectedStyle,
                isTailorAtHome,
                measurementSchedule,
                selectedAddons,
                selectedCustomizations,
                fabricSource,
                selectedFabric,
                selectedSavedProfile,
                measurements,
                currentStep
            };
            sessionStorage.setItem(`service_draft_${id}`, JSON.stringify(draft));
        } catch (e) {
            console.error("Failed to save service draft:", e);
        }
    }, [id, deliveryType, measurementType, selectedStyle, isTailorAtHome, measurementSchedule, selectedAddons, selectedCustomizations, fabricSource, selectedFabric, selectedSavedProfile, measurements, currentStep]);

    // Sticky booking bar is always visible (was previously scroll-to-bottom only,
    // which hid "Add Another" / "Book Now" for most users).
    const showFooter = true;

    useEffect(() => {
        let isMounted = true;
        
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const targetTailorId = location.state?.tailorId || null;
                const results = await Promise.allSettled([
                    api.get(`/services/${id}`),
                    targetTailorId ? api.get(`/tailors/${targetTailorId}`) : Promise.resolve(null)
                ]);

                if (!isMounted) return;

                if (results[0].status === 'fulfilled') {
                    const service = results[0].value?.data?.data;
                    if (service) {
                        setServiceData(service);
                        // Default to the service's own tailor
                        if (service.tailor) {
                            setPreSelectedTailor(service.tailor);
                        }
                    }
                }
                if (results[1]?.status === 'fulfilled' && results[1].value?.data?.data) {
                    setPreSelectedTailor(results[1].value.data.data);
                }
                
                if (location.state?.selectedFabric) {
                    setFabricSource('platform');
                    setSelectedFabric(location.state.selectedFabric);
                }

                // Fetch global settings and customization catalog
                const [settingsRes, addonsRes] = await Promise.all([
                    api.get('/cms/settings'),
                    api.get('/style-addons?isActive=true')
                ]);
                
                if (!isMounted) return;

                if (addonsRes.data?.success) {
                    setCatalogCustomizations(addonsRes.data.data || []);
                }
                
                if (settingsRes.data?.success) {
                    if (settingsRes.data.data?.visitFee) {
                        setVisitSettings(settingsRes.data.data.visitFee);
                    }
                    if (settingsRes.data.data?.pricing?.gstPercentage !== undefined) {
                        setGstPercentage(settingsRes.data.data.pricing.gstPercentage);
                    }
                    if (settingsRes.data.data?.walletConfig?.platformFeePercentage !== undefined) {
                        setPlatformFeePercentage(settingsRes.data.data.walletConfig.platformFeePercentage);
                    }
                }

                // Also fetch addresses so we can resolve selectedAddressId
                useAddressStore.getState().fetchAddresses();
            } catch (error) {
                if (isMounted) console.error('Failed to fetch service/tailor detail:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchData();
        
        return () => {
            isMounted = false;
        };
    }, [id, location.state]);

    // Lock tailor as soon as we know it while basket is active
    useEffect(() => {
        if (!serviceItems.length) return;
        useCheckoutStore.getState().ensureLockedTailor({
            tailorId:
                preSelectedTailor?._id ||
                preSelectedTailor?.id ||
                serviceItems[0]?.serviceDetails?.tailorId ||
                (typeof serviceData?.tailor === 'object'
                    ? serviceData.tailor?._id || serviceData.tailor?.id
                    : serviceData?.tailor),
            tailorName:
                preSelectedTailor?.shopName ||
                serviceItems[0]?.serviceDetails?.tailorName ||
                serviceData?.tailor?.shopName ||
                'Tailor Partner',
        });
    }, [serviceItems.length, preSelectedTailor, serviceData]);

    const isAlteration = serviceData?.category?.name?.toLowerCase().includes('alteration') || serviceData?.tags?.some(t => t.toLowerCase().includes('alteration'));

    useEffect(() => {
        if (isAlteration) {
            setFabricSource('customer');
            setMeasurementType('sample');
            setMeasurements({ type: 'sample', notes: 'Partner will pickup garment for alteration' });
        }
    }, [isAlteration]);

    // Live bill from the SAME backend calculation the payment page uses (/orders/price-summary),
    // so the amount shown here always equals what checkout charges (delivery & visit fee depend on
    // the address distance, which only the server knows). Local maths is only a fallback.
    const [serverPricing, setServerPricing] = useState(null);
    useEffect(() => {
        if (!serviceData) return undefined;
        let alive = true;
        const timer = setTimeout(async () => {
            const sid = String(serviceData._id || serviceData.id || id);
            const idx = editBasketIndex != null && editBasketIndex >= 0
                ? editBasketIndex
                : serviceItems.findIndex((row) => String(row.serviceDetails?._id || row.serviceDetails?.id || '') === sid);
            const others = idx >= 0 ? serviceItems.filter((_, i) => i !== idx) : serviceItems;
            const tailorRef = preSelectedTailor?._id || preSelectedTailor?.id ||
                (typeof serviceData.tailor === 'object' ? serviceData.tailor?._id : serviceData.tailor) || null;
            const current = {
                serviceDetails: {
                    _id: sid,
                    id: sid,
                    tailorId: tailorRef,
                    tailorCoordinates: preSelectedTailor?.location?.coordinates || serviceData?.tailor?.location?.coordinates || null,
                },
                configuration: {
                    deliveryType,
                    fabricSource,
                    selectedFabric: fabricSource === 'platform' && selectedFabric
                        ? { _id: selectedFabric._id || selectedFabric.id, price: selectedFabric.price || 0 }
                        : null,
                    isTailorAtHome,
                    addons: (selectedAddons || []).map((a) => ({ _id: a._id || a.id, price: Number(a.price) || 0 })),
                    customizations: selectedCustomizations,
                },
                pricing: {},
            };
            try {
                const res = await api.post('/orders/price-summary', {
                    items: [...others, current],
                    deliveryAddress: selectedAddress,
                    isCartCheckout: false,
                });
                if (alive && res.data?.success) setServerPricing(res.data.data);
            } catch (_) {
                if (alive) setServerPricing(null); // guest / offline → local estimate
            }
        }, 400);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [serviceData, deliveryType, fabricSource, selectedFabric, selectedAddons, selectedCustomizations, isTailorAtHome, serviceItems, editBasketIndex, selectedAddress, preSelectedTailor, id]);

    useEffect(() => {
        let isMounted = true;
        
        const fetchRoadDistance = async () => {
            if (!preSelectedTailor || !userCoords || !isTailorAtHome) return;
            
            try {
                setIsCalculatingDistance(true);
                const [tLng, tLat] = preSelectedTailor.location.coordinates;
                let finalULat = userCoords.lat;
                let finalULng = userCoords.lng;

                // If an address is selected but it had no saved coordinates, let's geocode it on the fly via backend
                if (selectedAddress && (!selectedAddress.location?.coordinates || selectedAddress.location.coordinates.length < 2)) {
                    const addressString = `${selectedAddress.street || ''}, ${selectedAddress.city || ''}, ${selectedAddress.state || ''}, ${selectedAddress.zipCode || ''}`;
                    try {
                        const geoRes = await api.get('/distance/forward-geocode', { params: { address: addressString } });
                        if (geoRes.data?.success && geoRes.data?.data) {
                            finalULat = geoRes.data.data.lat;
                            finalULng = geoRes.data.data.lng;
                        }
                    } catch (geoErr) {
                        console.error("Backend forward geocoding failed", geoErr);
                    }
                }
                
                const res = await api.post('/distance/calculate', {
                    origin: [tLat, tLng],
                    destination: [finalULat, finalULng]
                });
                
                if (res.data?.success && isMounted) {
                    setRoadDistanceKm(res.data.data.distance);
                }
            } catch (err) {
                console.error("Failed to fetch road distance:", err);
            } finally {
                if (isMounted) setIsCalculatingDistance(false);
            }
        };

        fetchRoadDistance();
        
        return () => { isMounted = false; };
    }, [preSelectedTailor, userCoords?.lat, userCoords?.lng, selectedAddress?._id, isTailorAtHome]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white pb-40">
                {/* Header Skeleton */}
                <div className="sticky top-0 z-50 bg-white/80 pt-safe px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                        <div>
                            <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-1" />
                            <div className="w-20 h-2 bg-gray-200 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
                
                <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
                    {/* Stepper Skeleton */}
                    <div className="flex justify-between px-4 mb-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                                <div className="w-12 h-2 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>

                    {/* Fabric Option 1 Skeleton */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
                            <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse" />
                            <div className="w-1/4 h-3 bg-gray-200 rounded animate-pulse mt-2" />
                        </div>
                    </div>
                    
                    {/* Fabric Option 2 Skeleton */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 flex gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
                            <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse" />
                            <div className="w-1/4 h-3 bg-gray-200 rounded animate-pulse mt-2" />
                        </div>
                    </div>

                    {/* Measurement Skeleton */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 mt-6">
                        <div className="w-1/3 h-4 bg-gray-200 rounded animate-pulse mb-4" />
                        <div className="space-y-3">
                            <div className="w-full h-12 bg-gray-100 rounded-xl animate-pulse" />
                            <div className="w-full h-12 bg-gray-100 rounded-xl animate-pulse" />
                            <div className="w-full h-12 bg-gray-100 rounded-xl animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!serviceData) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Service Not Found</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold underline">Go Back</button>
    </div>;

    // Pricing Logic
    const basePrice = serviceData.basePrice || 0;
    
    const deliveryPrice = deliveryType === 'express' ? 150 : (deliveryType === 'premium' ? 350 : 0);
    const fabricPrice = (fabricSource === 'platform' && selectedFabric) ? selectedFabric.price : 0;
    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const customizationsPrice = Object.values(selectedCustomizations || {}).reduce((sum, item) => {
        if (item && item.enabled && item.price) {
            return sum + (Number(item.price) || 0);
        }
        return sum;
    }, 0);
    
    const calculateVisitPrice = () => {
        if (!isTailorAtHome) return 0;
        if (!preSelectedTailor || !userCoords) return visitSettings.baseFee;

        // Use road distance if available, else fallback to Haversine
        let distance = roadDistanceKm;
        
        if (distance === null) {
            try {
                const [tLng, tLat] = preSelectedTailor.location.coordinates;
                distance = calculateDistance(userCoords.lat, userCoords.lng, tLat, tLng);
            } catch (err) {
                return visitSettings.baseFee;
            }
        }
        
        if (distance <= visitSettings.freeKm) return visitSettings.baseFee || 99;
        
        const calculated = Math.round((visitSettings.baseFee || 99) + (distance - visitSettings.freeKm) * (visitSettings.perKmFee || 8));
        const maxFee = visitSettings.maxFee || 299;
        return Math.min(calculated, maxFee);
    };

    const tailorAtHomePrice = calculateVisitPrice();

    // Check if this service is already present in the basket
    const existingIndex = serviceItems.findIndex((row) => {
        const sid = String(row.serviceDetails?._id || row.serviceDetails?.id || '');
        return sid === String(serviceData?._id || id);
    });

    // Active item index in basket
    const activeIndex = editBasketIndex != null && editBasketIndex >= 0
        ? editBasketIndex
        : existingIndex;

    // Other items in basket (excluding current item being edited/viewed)
    const otherBasketItems = activeIndex >= 0
        ? serviceItems.filter((_, idx) => idx !== activeIndex)
        : serviceItems;

    // Check if another basket item already covers the Home Visit fee for this order
    const isVisitCoveredInOrder = otherBasketItems.some(
        i => i.configuration?.isTailorAtHome || i.isTailorAtHome || (Number(i.pricing?.tailorAtHome) > 0)
    );
    const activeItemVisitFee = (isTailorAtHome && !isVisitCoveredInOrder) ? tailorAtHomePrice : 0;
    
    // Match backend calculation: Platform fee on base + addons + customizations
    const platformFee = Math.round((basePrice + addonsPrice + customizationsPrice) * (platformFeePercentage / 100));
    const taxableAmount = basePrice + addonsPrice + customizationsPrice + fabricPrice + activeItemVisitFee + platformFee;
    const taxes = Math.round(taxableAmount * (gstPercentage / 100));
    
    // Delivery fee is outside GST calculation on backend
    // Current Total for active service configuration

    // Accurately compute order totals matching backend checkoutPricing.js exactly:
    const otherBase = otherBasketItems.reduce((sum, item) => sum + (Number(item.pricing?.base) || 0), 0);
    const otherAddons = otherBasketItems.reduce((sum, item) => sum + (Number(item.pricing?.addons) || 0), 0);
    const otherCustomizations = otherBasketItems.reduce((sum, item) => sum + (Number(item.pricing?.customizations) || 0), 0);
    const otherFabric = otherBasketItems.reduce((sum, item) => sum + (Number(item.pricing?.fabric) || 0), 0);
    const otherBasketTotal = otherBasketItems.reduce((sum, item) => {
        const itemTotal = Number(item.pricing?.total) || Number(item.totalPrice) || 
            ((Number(item.pricing?.base) || 0) + (Number(item.pricing?.addons) || 0) + (Number(item.pricing?.customizations) || 0) + (Number(item.pricing?.fabric) || 0));
        return sum + itemTotal;
    }, 0);

    const totalOrderBase = otherBase + basePrice;
    const totalOrderAddons = otherAddons + addonsPrice;
    const totalOrderCusts = otherCustomizations + customizationsPrice;
    const totalOrderFabric = otherFabric + fabricPrice;

    // Visit fee is charged once if any item in basket (or current form) has tailor at home
    const hasOrderHomeVisit = isTailorAtHome || otherBasketItems.some(i => i.configuration?.isTailorAtHome || i.isTailorAtHome || (Number(i.pricing?.tailorAtHome) > 0));
    const effectiveVisitFee = hasOrderHomeVisit ? tailorAtHomePrice : 0;

    // Delivery fee is charged once if any item needs delivery
    const hasOrderDelivery = (deliveryPrice > 0) || otherBasketItems.some(i => i.configuration?.deliveryType && i.configuration.deliveryType !== 'self');
    const effectiveDeliveryFee = hasOrderDelivery ? deliveryPrice : 0;

    const totalOrderPlatformFee = Math.round((totalOrderBase + totalOrderAddons + totalOrderCusts) * (platformFeePercentage / 100));
    const totalOrderTaxable = totalOrderBase + totalOrderAddons + totalOrderCusts + totalOrderFabric + effectiveVisitFee + totalOrderPlatformFee;
    const totalOrderTaxes = Math.round(totalOrderTaxable * (gstPercentage / 100));

    // Grand Total (Accurate across all basket items without double-counting shared fees)
    const localGrandTotal = Math.round(totalOrderTaxable + totalOrderTaxes + effectiveDeliveryFee);
    const grandTotal = serverPricing ? Math.round(Number(serverPricing.total) || 0) : localGrandTotal;
    const bill = serverPricing
        ? {
            base: Number(serverPricing.base) || 0,
            fabric: Number(serverPricing.fabric) || 0,
            addons: Number(serverPricing.addons) || 0,
            visit: Number(serverPricing.tailorAtHome) || 0,
            delivery: Number(serverPricing.delivery) || 0,
            platformFee: Number(serverPricing.platformFee) || 0,
            taxes: Number(serverPricing.taxes) || 0,
            gst: serverPricing.gstPercentage ?? gstPercentage,
            discount: Number(serverPricing.membershipDiscount) || 0,
        }
        : null;

    const getDeliveryDays = () => {
        if (deliveryType === 'express') return 10;
        if (deliveryType === 'premium') return 7;
        return 15;
    };

    const resetDraftForm = () => {
        setMeasurementType(null);
        setMeasurements(null);
        setSelectedStyle(null);
        setSelectedAddons([]);
        setSelectedCustomizations({});
        setSelectedSavedProfile(null);
        setIsTailorAtHome(false);
        setFabricSource('customer');
        setSelectedFabric(null);
        setDeliveryType('standard');
        setMeasurementSchedule({
            scheduledDate: '',
            scheduledTimeSlot: 'ASAP',
            scheduledTime: null,
            isAsap: true,
        });
        try {
            sessionStorage.removeItem(`service_draft_${id}`);
        } catch (e) {}
    };

    const handleRemoveBasketItem = (index) => {
        removeServiceItem(index);
        import('react-hot-toast').then(({ toast }) => {
            toast.success('Removed from basket');
        });
    };

    const prepareDraftItem = async () => {
        let finalMeasurements = measurements;
        const measurementLayout = sanitizeMeasurementFields(
            serviceData?.category?.measurementFields || []
        );

        // If user requested to save this measurement profile
        if (measurements?.saveProfile) {
            try {
                const { notes, ...pureMeasurements } = measurements.data;
                await addMeasurement({
                    profileName: measurements.saveProfile.name,
                    garmentType: serviceData.category?.name || "Other",
                    categoryId: serviceData.category?._id || serviceData.category || null,
                    measurements: pureMeasurements,
                    notes: notes
                });
                finalMeasurements = {
                    ...measurements.data,
                    type: 'self',
                    notes: notes || measurements.data?.notes,
                    ...(measurementLayout.length ? { measurementLayout } : {}),
                };
            } catch (err) {
                console.error("Failed to save measurement profile:", err);
            }
        } else if (measurements?.type === 'self' || measurements?.isConfirmed) {
            finalMeasurements = {
                ...(measurements.data || {}),
                type: 'self',
                notes: measurements.data?.notes || measurements.notes || '',
                ...(measurements.sampleGarment ? { sampleGarment: true } : {}),
                ...(measurements.slipAttached || measurements.slipImage || measurements.image
                    ? {
                        slipImage:
                            measurements.slipImage ||
                            measurements.image ||
                            measurements.url ||
                            measurements.slipUrl,
                    }
                    : {}),
                ...(measurementLayout.length ? { measurementLayout } : {}),
            };
        } else if (measurements?.type === 'slip') {
            finalMeasurements = {
                type: 'slip',
                slipImage:
                    measurements.slipImage ||
                    measurements.image ||
                    measurements.url ||
                    measurements.slipUrl ||
                    '',
                notes: measurements.notes || '',
                ...(measurements.sampleGarment ? { sampleGarment: true } : {}),
            };
        } else if (measurements?.type === 'saved') {
            finalMeasurements = {
                ...(measurements.measurements || measurements),
                type: 'saved',
                ...(measurementLayout.length ? { measurementLayout } : {}),
            };
        } else if (measurements?.type === 'sample') {
            finalMeasurements = {
                type: 'sample',
                notes: measurements.notes || 'Partner will pickup sample garment with fabric',
                sampleGarment: true,
            };
        } else if (finalMeasurements && typeof finalMeasurements === 'object' && measurementLayout.length) {
            finalMeasurements = { ...finalMeasurements, measurementLayout };
        }

        return {
            serviceDetails: {
                _id: serviceData._id || serviceData.id,
                id: serviceData._id || serviceData.id,
                title: serviceData.title,
                image: serviceData.image || serviceData.images?.[0] || null,
                basePrice: serviceData.basePrice || 0,
                tags: serviceData.tags || [],
                category: serviceData.category
                    ? {
                        _id: serviceData.category._id,
                        name: serviceData.category.name,
                        measurementFields: serviceData.category.measurementFields || [],
                    }
                    : null,
                tailorId:
                    preSelectedTailor?._id ||
                    preSelectedTailor?.id ||
                    (typeof serviceData?.tailor === 'object'
                        ? (serviceData.tailor?._id || serviceData.tailor?.id || serviceData.tailor?.user?._id)
                        : serviceData?.tailor) ||
                    null,
                tailorName: preSelectedTailor?.shopName || serviceData?.tailor?.shopName || 'Tailor Partner',
                tailorCoordinates: preSelectedTailor?.location?.coordinates || serviceData?.tailor?.location?.coordinates || null
            },
            configuration: { 
                deliveryType, 
                fabricSource,
                // The backend charges whatever fabric is sent — only send it when the platform supplies it
                selectedFabric: (fabricSource === 'platform' && selectedFabric)
                    ? {
                        _id: selectedFabric._id || selectedFabric.id,
                        id: selectedFabric._id || selectedFabric.id,
                        name: selectedFabric.name,
                        price: selectedFabric.price || 0,
                        image: selectedFabric.image || selectedFabric.images?.[0] || null,
                    }
                    : null,
                measurements: finalMeasurements,
                isTailorAtHome,
                scheduledDate: isTailorAtHome ? (measurementSchedule.scheduledDate || formatYYYYMMDD(new Date())) : null,
                scheduledTimeSlot: isTailorAtHome ? (measurementSchedule.isAsap ? 'ASAP' : (measurementSchedule.scheduledTimeSlot || 'ASAP')) : null,
                scheduledTime: isTailorAtHome ? (measurementSchedule.isAsap ? null : measurementSchedule.scheduledTime) : null,
                isAsap: isTailorAtHome ? !!measurementSchedule.isAsap : true,
                measurementSchedule: isTailorAtHome ? measurementSchedule : null,
                selectedStyle: selectedStyle
                    ? {
                        name: selectedStyle.name,
                        image: selectedStyle.image,
                        description: selectedStyle.description,
                        isCustom: !!selectedStyle.isCustom,
                    }
                    : null,
                addons: (selectedAddons || []).map((a) => ({
                    _id: a._id || a.id,
                    name: a.name || a.title,
                    price: Number(a.price) || 0,
                })),
                customizations: selectedCustomizations,
                pending: false,
            },
            pricing: { 
                base: basePrice, 
                delivery: deliveryPrice, 
                fabric: fabricPrice, 
                addons: addonsPrice,
                customizations: customizationsPrice,
                tailorAtHome: activeItemVisitFee,
                platformFee,
                taxes, 
                gstPercentage,
                platformFeePercentage,
                total: basePrice + addonsPrice + customizationsPrice + fabricPrice, 
                deliveryDays: getDeliveryDays() 
            },
            basketId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        };
    };

    const checkCartConflict = () => {
        const isCurrentAlteration = serviceData?.category?.name?.toLowerCase().includes('alteration') || serviceData?.tags?.some(t => t.toLowerCase().includes('alteration'));

        if (serviceItems && serviceItems.length > 0) {
            const existingItem = serviceItems[0];
            const isExistingAlteration = existingItem.serviceDetails?.category?.name?.toLowerCase().includes('alteration') || existingItem.serviceDetails?.tags?.some(t => t.toLowerCase().includes('alteration'));

            if (isCurrentAlteration !== isExistingAlteration) {
                import('react-hot-toast').then(({ toast }) => {
                    toast.error("This cart already contains a different service type. Please complete this order or clear your cart before adding another service category.");
                });
                return true;
            }
        }
        return false;
    };

    const hasSelfMeasurements = Boolean(
        selectedSavedProfile ||
        measurements?.isConfirmed ||
        measurements?.type === 'self' ||
        (measurements?.data && Object.entries(measurements.data).some(([key, val]) => key !== 'notes' && val !== '' && val != null))
    );

    const isMeasurementValid = Boolean(
        isAlteration ||
        measurementType === 'home' ||
        measurementType === 'sample' ||
        measurements?.sampleGarment ||
        selectedSavedProfile ||
        hasSelfMeasurements ||
        measurements?.isConfirmed ||
        measurements?.type === 'slip' ||
        measurements?.image ||
        measurements?.url ||
        measurements?.slipUrl ||
        measurements?.file
    );



    const getLockedTailor = () => {
        const fromPreselect = preSelectedTailor
            ? {
                id: preSelectedTailor._id || preSelectedTailor.id,
                name: preSelectedTailor.shopName || 'Selected Tailor',
            }
            : null;
        if (fromPreselect?.id) return fromPreselect;

        const fromService = serviceData?.tailor
            ? {
                id: serviceData.tailor._id || serviceData.tailor.id,
                name: serviceData.tailor.shopName || 'Selected Tailor',
            }
            : null;
        if (fromService?.id) return fromService;

        const fromBasket = serviceItems.find((item) => item.serviceDetails?.tailorId);
        if (fromBasket?.serviceDetails?.tailorId) {
            return {
                id: fromBasket.serviceDetails.tailorId,
                name: fromBasket.serviceDetails.tailorName || 'Selected Tailor',
            };
        }
        return null;
    };

    const navigateToAddGarment = () => {
        const locked = getLockedTailor();
        const store = useCheckoutStore.getState();
        const ensured = store.ensureLockedTailor({
            tailorId: store.lockedTailorId || locked?.id,
            tailorName: store.lockedTailorName || locked?.name,
        });
        const tailorId = ensured.tailorId || locked?.id;
        const tailorName = ensured.tailorName || locked?.name;

        if (!tailorId) {
            import('react-hot-toast').then(({ toast }) => {
                toast.error('Please confirm a tailor for this order first');
            });
            return;
        }

        navigate('/user/services', {
            state: {
                tailorId,
                tailorName: tailorName || 'Selected Tailor',
                fromMultiItemBasket: true,
            },
        });
    };

    /** Save current garment into basket, then open catalog for next item */
    const handleSaveAndAddAnother = async () => {
        if (!isMeasurementValid) {
            import('react-hot-toast').then(({ toast }) => {
                toast.error('Please complete measurements for this service before adding another');
            });
            document.getElementById('measurement-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (checkCartConflict()) return;
        const item = await prepareDraftItem();
        const idx = editBasketIndex != null && editBasketIndex >= 0 ? editBasketIndex : -1;

        if (idx >= 0 && idx < serviceItems.length) {
            updateServiceItem(idx, item);
        } else {
            addServiceItem(item);
        }
        setBuyNowMode(false, null);
        setActiveBasketIndex(null);
        resetDraftForm();
        import('react-hot-toast').then(({ toast }) => {
            toast.success('Saved — choose another service');
        });
        navigateToAddGarment();
    };

    const goToCheckoutAfterItemsReady = () => {
        const store = useCheckoutStore.getState();
        const targetTailor =
            preSelectedTailor ||
            serviceData?.tailor ||
            store.lockedTailorId ||
            serviceItems[0]?.serviceDetails?.tailorId;
        if (!targetTailor) {
            navigate('/user/checkout/tailor');
        } else {
            navigate('/user/checkout/address');
        }
    };

    const handleAddMore = async () => {
        if (!isMeasurementValid) {
            import('react-hot-toast').then(({ toast }) => {
                toast.error('Please complete measurements for this garment first');
            });
            const elem = document.getElementById('measurement-section');
            if (elem) elem.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (checkCartConflict()) return;
        const item = await prepareDraftItem();

        const existingIdx = serviceItems.findIndex((row) => {
            const sid = String(row.serviceDetails?._id || row.serviceDetails?.id || '');
            return sid === String(serviceData?._id || id);
        });
        const idx = editBasketIndex != null && editBasketIndex >= 0 ? editBasketIndex : existingIdx;

        if (idx >= 0 && idx < serviceItems.length) {
            updateServiceItem(idx, item);
            setBuyNowMode(false, null);
            setActiveBasketIndex(null);
            resetDraftForm();
            import('react-hot-toast').then(({ toast }) => {
                toast.success(`Saved in basket (${useCheckoutStore.getState().serviceItems.length} items)`);
            });
            requestAnimationFrame(() => {
                document.getElementById('order-basket')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            return;
        }

        addServiceItem(item);
        setBuyNowMode(false, null);
        setActiveBasketIndex(null);
        resetDraftForm();
        import('react-hot-toast').then(({ toast }) => {
            toast.success(`Added to basket (${useCheckoutStore.getState().serviceItems.length} items)`, {
                duration: 3500,
            });
        });
        requestAnimationFrame(() => {
            document.getElementById('order-basket')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const handleCheckoutBasket = () => {
        if (!serviceItems.length) return;
        if (!requireAuth('Please login to book these services')) return;
        setBuyNowMode(false, null);
        goToCheckoutAfterItemsReady();
    };

    const handleBuyNow = async () => {
        if (!isMeasurementValid) {
            import('react-hot-toast').then(({ toast }) => {
                toast.error('Please complete measurements or select "Tailor at Home" to proceed');
            });
            const elem = document.getElementById('measurement-section');
            if (elem) elem.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        if (!requireAuth('Please login to book this service')) return;
        if (checkCartConflict()) return;
        const item = await prepareDraftItem();

        const existingIdx = serviceItems.findIndex((row) => {
            const sid = String(row.serviceDetails?._id || row.serviceDetails?.id || '');
            return sid === String(serviceData?._id || id);
        });
        const idx = editBasketIndex != null && editBasketIndex >= 0 ? editBasketIndex : existingIdx;

        if (idx >= 0 && idx < serviceItems.length) {
            updateServiceItem(idx, item);
            setBuyNowMode(false, null);
        } else if (serviceItems.length > 0) {
            addServiceItem(item);
            setBuyNowMode(false, null);
        } else {
            // Direct single service checkout: use buyNowMode so if user presses Back, basket remains clean!
            setBuyNowMode(true, item);
        }
        goToCheckoutAfterItemsReady();
    };

    const openBasketItem = (item, idx) => {
        const sid = item.serviceDetails?._id || item.serviceDetails?.id;
        if (!sid) return;

        // Always use latest row from store (measurements included)
        const fresh = useCheckoutStore.getState().serviceItems[idx] || item;

        // Same service page → just restore form (no navigation)
        if (String(sid) === String(id)) {
            setActiveBasketIndex(idx);
            applyBasketItemToForm(fresh);
            requestAnimationFrame(() => {
                document.getElementById('measurement-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            import('react-hot-toast').then(({ toast }) => {
                toast.success(`Showing measurements for: ${fresh.serviceDetails?.title || 'item'}`);
            });
            return;
        }

        const onServiceDetail = /\/user\/services\/[^/]+$/.test(location.pathname);
        navigate(`/user/services/${sid}`, {
            replace: onServiceDetail,
            state: {
                tailorId: fresh.serviceDetails?.tailorId || useCheckoutStore.getState().lockedTailorId || undefined,
                tailorName: fresh.serviceDetails?.tailorName || useCheckoutStore.getState().lockedTailorName || undefined,
                editBasketIndex: idx,
                restoreBasketItem: fresh,
                fromBasket: true,
                fromMultiItemBasket: true,
            },
        });
    };

    // Add-ons shown inline: category add-ons + active catalog embellishments for this category (same as the add-on sheet)
    const addonCategoryName = String(serviceData?.category?.name || '').toLowerCase().trim();
    const inlineAddons = (() => {
        const list = [];
        (serviceData?.category?.styleAddons || []).filter((a) => a?.name?.trim()).forEach((item, i) => {
            list.push({
                _id: item._id || `cat_addon_${i}_${String(item.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '')}`,
                name: item.name,
                price: item.price || 0,
                description: item.description || '',
                image: item.image || '',
                category: serviceData?.category?.name || 'Service Custom',
                _source: 'schema',
            });
        });
        (catalogCustomizations || []).forEach((a) => {
            if (a?.addonType !== 'embellishment' || a.isActive === false) return;
            const cat = String(a.category || '').toLowerCase().trim();
            const universal = !cat || ['all', 'universal', 'all services', 'all categories'].includes(cat);
            const matches = universal || (addonCategoryName && (cat === addonCategoryName || addonCategoryName.includes(cat) || cat.includes(addonCategoryName)));
            if (!matches || list.some((x) => String(x.name).toLowerCase().trim() === String(a.name).toLowerCase().trim())) return;
            list.push({ ...a, _source: 'catalog' });
        });
        return list;
    })();

    return (
        <div className="min-h-screen bg-white pb-40 font-sans">
            {/* 1. Purple header: title, service card, then the booking steps */}
            <div className="relative bg-gradient-to-br from-[#5A1A78] via-[#6F2A8C] to-[#8A3FA6] px-4 pb-14 pt-4 pt-safe">
                <span className="pointer-events-none absolute -right-12 -top-10 h-44 w-44 rounded-full bg-white/10" />
                <span className="pointer-events-none absolute left-1/3 top-24 h-24 w-24 rounded-full bg-white/5" />
                <div className="relative mx-auto max-w-2xl">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate(-1)}
                            className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-all hover:bg-white/10 active:scale-90"
                            aria-label="Back"
                        >
                            <ArrowLeft size={22} />
                        </button>
                        <div className="min-w-0 flex-1 text-center">
                            <h1 className="truncate text-[18px] font-bold leading-tight text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {isAlteration ? 'Alteration Order' : 'Stitching Order Configuration'}
                            </h1>
                            <p className="mt-0.5 truncate text-[11.5px] text-white/75">Customize your outfit, add details and get it stitched by top tailors</p>
                        </div>
                        {serviceItems.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => document.getElementById('order-basket')?.scrollIntoView({ behavior: 'smooth' })}
                                className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 text-white ring-1 ring-white/25"
                                aria-label={`${serviceItems.length} items in basket`}
                            >
                                <ShoppingBag size={14} />
                                <span className="text-[11px] font-bold">{serviceItems.length}</span>
                            </button>
                        ) : (
                            <span className="w-9 shrink-0" />
                        )}
                    </div>

                    {/* Current service */}
                    <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_14px_30px_-18px_rgba(20,5,30,0.7)]">
                        <div className="h-[84px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-[#F6EEFA]">
                            <img
                                src={getImageUrl(serviceData.image) || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800'}
                                alt={serviceData.title}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800';
                                }}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate text-[16px] font-bold leading-tight text-[#1A1523]">{serviceData.title}</h2>
                            <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-gray-500">
                                <Scissors size={12} className="shrink-0 text-[#6A2385]" />
                                <span className="truncate">{preSelectedTailor?.shopName ? `By ${preSelectedTailor.shopName}` : (isAlteration ? 'Alteration Service' : 'Stitching Service')}</span>
                            </p>
                            <button
                                type="button"
                                onClick={handleSaveAndAddAnother}
                                className="mt-2 flex items-center gap-1 rounded-full bg-[#F6EEFA] px-2.5 py-1 text-[11px] font-semibold text-[#6A2385] ring-1 ring-[#E4D6EC] transition-colors hover:bg-[#EDDDF5]"
                            >
                                <ShoppingBag size={12} /> Add Another Service
                            </button>
                        </div>
                        <div className="shrink-0 self-start text-right">
                            <p className="text-[10.5px] text-gray-500">Starting from</p>
                            <p className="text-[18px] font-bold text-[#5A1A78]">₹{(serviceData.basePrice || 0).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative mx-auto -mt-10 max-w-2xl space-y-3.5 px-4 pb-44">
                {!isAlteration && (
                    <OrderFlowStepper current={isMeasurementValid ? 3 : (measurementType ? 2 : 1)} />
                )}
                {isAlteration && <div className="h-4" />}

                {/* Summary of what's chosen so far */}
                <p className="px-1 text-[11.5px] text-gray-500">
                    {fabricSource === 'platform' ? 'Tailor fabric' : 'Your fabric'}
                    {selectedStyle?.name ? ` · ${selectedStyle.name}` : ''}
                    {isMeasurementValid ? ' · Measurements added ✓' : ' · Measurements required'}
                </p>

                {/* Basket — visible as soon as items exist (incl. auto-pending on open) */}
                {storeHydrated && serviceItems.length > 0 && (
                    <section id="order-basket" className="animate-in fade-in slide-in-from-top-4 scroll-mt-24">
                        <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4] relative overflow-hidden">
                            <div className="flex items-center justify-between mb-3 gap-2">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Your order basket ({serviceItems.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleCheckoutBasket}
                                    className="text-[9px] font-black uppercase tracking-wider bg-primary text-white px-3 py-1.5 rounded-lg active:scale-95"
                                >
                                    Checkout
                                </button>
                            </div>
                            <div className="space-y-2.5">
                                <AnimatePresence mode='popLayout'>
                                    {serviceItems.map((item, idx) => {
                                        const thumbSrc = getImageUrl(
                                            item.configuration?.selectedStyle?.image ||
                                            item.configuration?.selectedFabric?.image ||
                                            item.configuration?.selectedFabric?.images?.[0] ||
                                            item.serviceDetails?.image ||
                                            item.serviceDetails?.images?.[0]
                                        );
                                        const measureType = item.configuration?.pending
                                            ? 'Complete details'
                                            : item.configuration?.isTailorAtHome
                                            ? 'Home visit'
                                            : item.configuration?.measurements?.type || 'Custom';
                                        return (
                                        <motion.div 
                                            key={item.basketId || idx}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-2xl border",
                                                editBasketIndex === idx
                                                    ? "bg-primary/5 border-primary/40 ring-1 ring-primary/30"
                                                    : item.configuration?.pending
                                                    ? "bg-amber-50/80 border-amber-200"
                                                    : "bg-gray-50 border-gray-100"
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => openBasketItem(item, idx)}
                                                className="flex items-center gap-3 min-w-0 flex-1 text-left active:scale-[0.99] transition-transform"
                                            >
                                                <div className="w-14 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-primary overflow-hidden border border-gray-100 shrink-0">
                                                    {thumbSrc ? (
                                                        <img
                                                            src={thumbSrc}
                                                            alt={item.serviceDetails?.title || `Item ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.src = 'https://placehold.co/112x128/e6e8f0/843d9b?text=Item';
                                                            }}
                                                        />
                                                    ) : (
                                                        <Scissors size={18} />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-gray-900 truncate">
                                                        {idx + 1}. {item.serviceDetails?.title}
                                                    </p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                                                        {item.configuration?.pending
                                                            ? 'Pending · tap to fill measurements'
                                                            : `₹${Number(item.pricing?.total || 0).toLocaleString()} · ${String(measureType).replace(/-/g, ' ')}`}
                                                    </p>
                                                    <p className="text-[9px] text-primary font-bold mt-0.5">
                                                        {editBasketIndex === idx
                                                            ? 'Editing this item · measurements below'
                                                            : 'Tap to view / edit measurements →'}
                                                    </p>
                                                </div>
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveBasketItem(idx);
                                                }}
                                                className="px-2.5 py-2 text-[9px] font-black uppercase tracking-wider text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all active:scale-95 shrink-0"
                                            >
                                                Remove
                                            </button>
                                        </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    onClick={handleSaveAndAddAnother}
                                    className="w-full py-3 rounded-xl bg-primary text-white font-black text-[11px] uppercase tracking-wider active:scale-[0.98] hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                                >
                                    <ShoppingBag size={14} />
                                    + Add another service
                                </button>
                            <p className="text-[9px] text-gray-400 font-medium text-center leading-relaxed">
                                Only this tailor’s services can be added. Highlighted row = item you’re editing below.
                            </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* 2. Fabric Choice - The "Fork" */}
                {!isAlteration && (
                    <section className="animate-in fade-in slide-in-from-bottom-2">
                        <FabricSelector
                            selected={fabricSource}
                            onSelect={setFabricSource}
                            selectedFabric={selectedFabric}
                            onSelectFabric={setSelectedFabric}
                            tailor={preSelectedTailor}
                        />
                    </section>
                )}

                {/* 2.5 Browse styles + upload own design */}
                {!isAlteration && (() => {
                    const styleList = (serviceData?.selectedStyles && serviceData.selectedStyles.length > 0)
                        ? serviceData.selectedStyles
                        : serviceData?.category?.styles || [];
                    return (
                        <section id="browse-styles" className="scroll-mt-24 rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                            <div className="mb-3 flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E9F8] text-[#6A2385]">
                                    <Shirt size={18} />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="text-[15px] font-bold leading-tight text-[#1A1523]">Browse Styles</h3>
                                    <p className="text-[11.5px] text-gray-500">Pick a style or upload your own design</p>
                                </div>
                            </div>

                            {styleList.length > 0 && (
                                <div className="mb-3 grid grid-cols-4 gap-2">
                                    {styleList.map((style, idx) => {
                                        const styleName = style.name || style;
                                        const isSelected = selectedStyle?.name === styleName && !selectedStyle?.isCustom;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedStyle(null);
                                                    } else {
                                                        setSelectedStyle({ name: styleName, image: style.image, description: style.description, isCustom: false });
                                                    }
                                                }}
                                                className={`relative overflow-hidden rounded-2xl bg-white text-left transition-all ${isSelected ? 'ring-2 ring-[#6A2385] shadow-[0_10px_22px_-14px_rgba(90,26,120,0.9)]' : 'ring-1 ring-[#EFE8F4] hover:ring-[#D9C2E6]'}`}
                                            >
                                                <div className="aspect-[3/4] bg-[#F6EEFA]">
                                                    {style.image ? (
                                                        <img src={style.image} alt={styleName} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="flex h-full w-full items-center justify-center text-[#C9A8D8]"><Shirt size={28} /></span>
                                                    )}
                                                </div>
                                                <p className={`truncate px-2 py-1.5 text-center text-[11.5px] font-semibold ${isSelected ? 'text-[#5A1A78]' : 'text-[#1A1523]'}`}>{styleName}</p>
                                                {isSelected && (
                                                    <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#6A2385] text-white shadow">
                                                        <CheckCircle2 size={14} />
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Upload own design */}
                            {selectedStyle?.isCustom && selectedStyle.image ? (
                                <div className="flex items-center gap-3 rounded-2xl bg-[#FBF7FD] p-3 ring-2 ring-[#6A2385]">
                                    <img src={selectedStyle.image} alt="Your design" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-bold text-[#1A1523]">Your Design Uploaded</p>
                                        <p className="text-[11.5px] text-gray-500">The tailor will stitch it like this photo</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStyle(null)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-red-500 ring-1 ring-red-100"
                                        aria-label="Remove design photo"
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            ) : (
                                <label className="relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-[#D9C2E6] bg-[#FDFBFE] p-3 transition-colors hover:bg-[#F8F1FB]">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#6A2385] shadow-sm ring-1 ring-[#EFE8F4]">
                                        {isUploadingCustomStyle ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[13px] font-bold text-[#1A1523]">{isUploadingCustomStyle ? 'Uploading...' : 'Upload Your Design'}</span>
                                        <span className="block text-[11.5px] text-gray-500">Have a design? Upload it and get it stitched</span>
                                    </span>
                                    <ChevronRight size={18} className="shrink-0 text-[#6A2385]" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onClick={(e) => { e.target.value = null; }}
                                        onChange={handleCustomStyleUpload}
                                        disabled={isUploadingCustomStyle}
                                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                    />
                                </label>
                            )}
                        </section>
                    );
                })()}

                {/* 2.55 Customize your outfit: live preview of the chosen design */}
                {!isAlteration && (() => {
                    const styleList = (serviceData?.selectedStyles && serviceData.selectedStyles.length > 0)
                        ? serviceData.selectedStyles
                        : serviceData?.category?.styles || [];
                    const previewImg = selectedStyle?.image || getImageUrl(serviceData.image);
                    const thumbs = styleList.filter((st) => st.image && (st.name || st) !== selectedStyle?.name).slice(0, 3);
                    return (
                        <section className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                            <div className="mb-3 flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E9F8] text-[#6A2385]">
                                    <SlidersHorizontal size={18} />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="text-[15px] font-bold leading-tight text-[#1A1523]">Customize Your Outfit</h3>
                                    <p className="text-[11.5px] text-gray-500">Select your design, fit and custom details</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="relative w-[42%] shrink-0 overflow-hidden rounded-2xl bg-[#F6EEFA] ring-1 ring-[#EFE8F4]">
                                    {previewImg ? (
                                        <img src={previewImg} alt={selectedStyle?.name || serviceData.title} className="aspect-[3/4] h-full w-full object-cover" />
                                    ) : (
                                        <span className="flex aspect-[3/4] items-center justify-center text-[#C9A8D8]"><Shirt size={36} /></span>
                                    )}
                                    {selectedStyle?.name && (
                                        <span className="absolute inset-x-2 bottom-2 truncate rounded-full bg-white/95 px-2 py-1 text-center text-[11px] font-semibold text-[#5A1A78] shadow-sm">
                                            {selectedStyle.name}
                                        </span>
                                    )}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col rounded-2xl bg-[#FBF7FD] p-2.5 ring-1 ring-[#EFE8F4]">
                                    <p className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-[#5A1A78]"><Eye size={14} /> Live Design Preview</p>
                                    {thumbs.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {thumbs.map((st) => (
                                                <button
                                                    key={st.name || st}
                                                    type="button"
                                                    onClick={() => setSelectedStyle({ name: st.name || st, image: st.image, description: st.description, isCustom: false })}
                                                    className="overflow-hidden rounded-xl ring-1 ring-[#EFE8F4] hover:ring-[#B98FCF]"
                                                    title={st.name || st}
                                                >
                                                    <img src={st.image} alt={st.name || st} className="aspect-[3/4] w-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11.5px] leading-snug text-gray-500">Pick a style below or upload your own design to see it here.</p>
                                    )}
                                    <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2.5">
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('browse-styles')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                                            className="flex items-center justify-center gap-1 rounded-full bg-white px-2 py-1.5 text-[11px] font-semibold text-[#6A2385] ring-1 ring-[#D9C2E6]"
                                        >
                                            <Pencil size={12} /> Change Design
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => previewImg && window.open(previewImg, '_blank')}
                                            disabled={!previewImg}
                                            className="flex items-center justify-center gap-1 rounded-full bg-white px-2 py-1.5 text-[11px] font-semibold text-[#6A2385] ring-1 ring-[#D9C2E6] disabled:opacity-50"
                                        >
                                            <Maximize2 size={12} /> Full View
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    );
                })()}

                {/* 2.6 Garment Customizations Section */}
                {!isAlteration && (
                    <section className="animate-in fade-in slide-in-from-bottom-3.5 duration-450">
                        <CustomizationSelector
                            categoryName={serviceData?.category?.name || serviceData?.title}
                            catalogAddons={catalogCustomizations}
                            selectedCustomizations={selectedCustomizations}
                            onChange={setSelectedCustomizations}
                        />
                    </section>
                )}

                {/* 2.7 Fit preference (saved with the customizations as "fit") */}
                {!isAlteration && (
                    <section className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                        <div className="mb-3 flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E9F8] text-[#6A2385]">
                                <Shirt size={18} />
                            </span>
                            <h3 className="text-[15px] font-bold leading-tight text-[#1A1523]">Fit Preference</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { name: 'Slim Fit' },
                                { name: 'Regular Fit', note: 'Most Popular' },
                                { name: 'Loose Fit' },
                            ].map((fit) => {
                                const active = selectedCustomizations?.fit?.enabled && selectedCustomizations.fit.name === fit.name;
                                return (
                                    <button
                                        key={fit.name}
                                        type="button"
                                        onClick={() => setSelectedCustomizations((prev) => ({
                                            ...prev,
                                            fit: active
                                                ? { name: '', price: 0, refImage: '', enabled: false, isCustom: false, notes: '' }
                                                : { name: fit.name, price: 0, refImage: '', enabled: true, isCustom: false, notes: '' },
                                        }))}
                                        className={`relative flex items-center gap-2 rounded-2xl px-2.5 py-2.5 text-left transition-all ${active ? 'bg-[#FBF7FD] ring-2 ring-[#6A2385]' : 'bg-white ring-1 ring-[#EFE8F4] hover:ring-[#D9C2E6]'}`}
                                    >
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${active ? 'bg-[#6A2385]' : 'ring-2 ring-gray-300'}`}>
                                            {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[12px] font-semibold text-[#1A1523]">{fit.name}</span>
                                            {fit.note && <span className="block text-[9.5px] text-gray-500">({fit.note})</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {!isAlteration && (
                    <section id="measurement-section" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {editBasketIndex != null && (
                            <p className="mb-2 px-1 text-[11.5px] font-semibold text-[#6A2385]">
                                Editing measurements for {editBasketIndex + 1}. {serviceItems[editBasketIndex]?.serviceDetails?.title || serviceData?.title || 'Item'}
                            </p>
                        )}
                        <MeasurementSelector
                            key={`measure-${id}-${editBasketIndex ?? 'x'}-${formEpoch}`}
                            selectedType={measurementType}
                            visitPrice={isCalculatingDistance ? '...' : (tailorAtHomePrice || visitSettings.baseFee)}
                            isDistanceBased={!!preSelectedTailor}
                            measurementFields={serviceData?.category?.measurementFields || []}
                            categoryName={serviceData?.category?.name || serviceData?.title}
                            categoryId={serviceData?.category?._id || serviceData?.category || null}
                            isVisitCoveredInOrder={isVisitCoveredInOrder}
                            onSelectType={(type) => {
                                if (type === 'home') {
                                    if (hasSelfMeasurements) return;
                                    setMeasurementType('home');
                                    setIsTailorAtHome(true);
                                    setMeasurements({ type: 'home' });
                                } else if (type === 'sample') {
                                    setIsTailorAtHome(false);
                                    setMeasurementType('sample');
                                    setMeasurements((prev) => {
                                        if (prev && (prev.isConfirmed || prev.type === 'self' || prev.type === 'slip' || prev.image || prev.url || prev.slipUrl)) {
                                            return { ...prev, sampleGarment: true };
                                        }
                                        return { type: 'sample', notes: 'Partner will pickup sample garment with fabric' };
                                    });
                                } else if (type) {
                                    setIsTailorAtHome(false);
                                    setMeasurementType(type);
                                } else if (measurementType === 'home') {
                                    setIsTailorAtHome(false);
                                    setMeasurementType(null);
                                    setMeasurements((prev) => (prev?.type === 'home' ? null : prev));
                                } else if (measurementType === 'sample') {
                                    // Tapping "Provide Sample Garment" again removes it
                                    setMeasurementType(null);
                                    setMeasurements((prev) => {
                                        if (!prev || prev.type === 'sample') return null;
                                        const { sampleGarment: _sampleGarment, ...rest } = prev;
                                        return rest;
                                    });
                                } else {
                                    // Collapse the open option (Enter Measurements / Upload Slip / saved);
                                    // entered values stay in `measurements`
                                    setMeasurementType(null);
                                }
                                // Collapse after self/slip complete: keep measurements so Book Now stays enabled
                            }}
                            onMeasurementComplete={(data) => {
                                if (!data) return;
                                setMeasurements((prev) => {
                                    if (prev && (prev.isConfirmed || prev.type === 'self') && data.type === 'slip') {
                                        return { ...prev, ...data, type: 'self', slipAttached: true };
                                    }
                                    if (prev?.sampleGarment) {
                                        return { ...prev, ...data, sampleGarment: true };
                                    }
                                    return data;
                                });
                            }}
                            selectedSavedProfile={selectedSavedProfile}
                            onSelectSavedProfile={setSelectedSavedProfile}
                            disableHomeVisit={hasSelfMeasurements}
                            completedSelfData={measurements?.type === 'self' || measurements?.isConfirmed ? measurements : null}
                            completedSlipData={
                                measurements?.type === 'slip' || measurements?.slipImage || measurements?.image || measurements?.url
                                    ? measurements
                                    : null
                            }
                        />

                        {/* Measurement Schedule Picker when Tailor at Home is chosen */}
                        {isTailorAtHome && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <MeasurementSchedulePicker
                                    value={measurementSchedule}
                                    onChange={setMeasurementSchedule}
                                />
                            </div>
                        )}
                    </section>
                )}

                {/* 4. Delivery Selection */}
                <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <DeliverySelector selected={deliveryType} onSelect={setDeliveryType} />
                </section>

                {/* 4.5 Add-ons (optional) — admin style add-ons as a checklist */}
                {inlineAddons.length > 0 && (
                    <section className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E9F8] text-[#6A2385]">
                                    <Wand2 size={18} />
                                </span>
                                <h3 className="text-[15px] font-bold leading-tight text-[#1A1523]">
                                    Add-Ons <span className="text-[11.5px] font-medium text-gray-400">(Optional)</span>
                                </h3>
                            </div>
                            {inlineAddons.length > 4 && (
                                <button
                                    type="button"
                                    onClick={() => setIsAddonModalOpen(true)}
                                    className="shrink-0 text-[12px] font-semibold text-[#6A2385]"
                                >
                                    View All
                                </button>
                            )}
                        </div>
                        <div className="divide-y divide-[#F3ECF7]">
                            {inlineAddons.slice(0, 4).map((addon) => {
                                const checked = selectedAddons.some((a) => a._id === addon._id || (a.name && a.name === addon.name));
                                return (
                                    <label key={addon._id} className="flex cursor-pointer items-center gap-3 py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => setSelectedAddons((prev) => (checked
                                                ? prev.filter((a) => a._id !== addon._id && a.name !== addon.name)
                                                : [...prev, addon]))}
                                            className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-[#6A2385]"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-semibold text-[#1A1523]">{addon.name}</span>
                                            {addon.description && <span className="block truncate text-[11px] text-gray-500">{addon.description}</span>}
                                        </span>
                                        <span className={`shrink-0 text-[13px] font-bold ${Number(addon.price) > 0 ? 'text-[#5A1A78]' : 'text-emerald-600'}`}>
                                            {Number(addon.price) > 0 ? `+₹${Number(addon.price)}` : 'FREE'}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {selectedAddons.filter((a) => !inlineAddons.slice(0, 4).some((x) => x._id === a._id || x.name === a.name)).length > 0 && (
                            <p className="mt-1 text-[11px] text-gray-500">
                                Also selected: {selectedAddons.filter((a) => !inlineAddons.slice(0, 4).some((x) => x._id === a._id || x.name === a.name)).map((a) => a.name).join(', ')}
                            </p>
                        )}
                    </section>
                )}

                {/* 5. Order summary for this garment */}
                <section className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
                    <div className="mb-3 flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E9F8] text-[#6A2385]">
                            <ClipboardList size={18} />
                        </span>
                        <h3 className="text-[15px] font-bold leading-tight text-[#1A1523]">Order Summary</h3>
                    </div>
                    <div className="space-y-1.5 text-[12.5px] text-[#2A1F33]">
                        <div className="flex justify-between gap-3"><span className="truncate">{serviceData.title} (Stitching)</span><span className="shrink-0">₹{basePrice.toLocaleString('en-IN')}</span></div>
                        {Object.entries(selectedCustomizations || {})
                            .filter(([, c]) => c && c.enabled && Number(c.price) > 0)
                            .map(([key, c]) => (
                                <div key={key} className="flex justify-between gap-3"><span className="truncate">{c.name}</span><span className="shrink-0">₹{Number(c.price).toLocaleString('en-IN')}</span></div>
                            ))}
                        {selectedAddons.filter((a) => Number(a.price) > 0).map((a) => (
                            <div key={a._id || a.name} className="flex justify-between gap-3"><span className="truncate">{a.name}</span><span className="shrink-0">₹{Number(a.price).toLocaleString('en-IN')}</span></div>
                        ))}
                        {fabricPrice > 0 && <div className="flex justify-between gap-3"><span>Fabric</span><span>₹{fabricPrice.toLocaleString('en-IN')}</span></div>}
                        {deliveryPrice > 0 && <div className="flex justify-between gap-3"><span className="capitalize">{deliveryType} Delivery</span><span>₹{deliveryPrice.toLocaleString('en-IN')}</span></div>}
                        {isTailorAtHome && !isVisitCoveredInOrder && tailorAtHomePrice > 0 && (
                            <div className="flex justify-between gap-3"><span>Home Visit</span><span>₹{tailorAtHomePrice.toLocaleString('en-IN')}</span></div>
                        )}
                        {otherBasketItems.length > 0 && (
                            <div className="flex justify-between gap-3 text-[#6A2385]"><span>Other basket items ({otherBasketItems.length})</span><span>₹{otherBasketTotal.toLocaleString('en-IN')}</span></div>
                        )}
                        <div className="flex justify-between gap-3 text-gray-500"><span>Platform fee &amp; GST</span><span>Included in total</span></div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#F8F1FB] to-[#F1E4F7] px-3 py-2.5">
                        <span className="text-[14px] font-bold text-[#5A1A78]">Total Estimated Price</span>
                        <span className="text-[18px] font-bold text-[#5A1A78]">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                </section>
            </div>

            {/* 7. LIVE BILL - Sticky Transparent Footer */}
            <AnimatePresence>
                {showFooter && (
                    <motion.div 
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[24px] bg-white/95 px-4 pb-4 pt-3.5 shadow-[0_-12px_36px_-12px_rgba(42,15,56,0.22)] backdrop-blur-2xl"
                    >
                        <div className="mx-auto max-w-2xl">
                            {/* Estimated price + breakdown toggle */}
                            <div className="mb-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                                        Estimated Price
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <span className="flex items-center gap-0.5 text-[#6A2385]"><Clock size={10} /> {getDeliveryDays()} days</span>
                                    </p>
                                    <p className="text-[22px] font-bold leading-tight text-[#1A1523]">
                                        ₹{grandTotal.toLocaleString('en-IN')}
                                        <span className="ml-1 text-[10px] font-semibold text-gray-400">incl. GST</span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                                    className="flex shrink-0 items-center gap-1 rounded-full bg-[#F6EEFA] px-3 py-1.5 text-[12px] font-semibold text-[#6A2385] ring-1 ring-[#E4D6EC]"
                                >
                                    View Breakdown {showPriceBreakdown ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <AnimatePresence>
                                {showPriceBreakdown && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden mb-3"
                                    >
                                        <div className="space-y-1.5 rounded-2xl bg-[#FBF7FD] p-3 text-xs text-gray-600 ring-1 ring-[#EFE8F4]">
                                            {bill ? (
                                                <>
                                                    <div className="flex justify-between"><span>{otherBasketItems.length > 0 ? `Stitching (${otherBasketItems.length + 1} items)` : 'Stitching'}</span><span>₹{bill.base.toLocaleString()}</span></div>
                                                    {bill.fabric > 0 && <div className="flex justify-between text-indigo-600"><span>Fabric</span><span>+₹{bill.fabric.toLocaleString()}</span></div>}
                                                    {bill.addons > 0 && <div className="flex justify-between text-emerald-600"><span>Styles & customizations</span><span>+₹{bill.addons.toLocaleString()}</span></div>}
                                                    {bill.visit > 0 && <div className="flex justify-between text-sky-600"><span>Tailor At Home Visit</span><span>+₹{bill.visit.toLocaleString()}</span></div>}
                                                    {bill.platformFee > 0 && <div className="flex justify-between text-gray-500"><span>Platform Fee</span><span>+₹{bill.platformFee.toLocaleString()}</span></div>}
                                                    <div className="flex justify-between text-gray-400"><span>GST ({bill.gst}%)</span><span>+₹{bill.taxes.toLocaleString()}</span></div>
                                                    {bill.delivery > 0 && <div className="flex justify-between text-amber-600"><span>Delivery</span><span>+₹{bill.delivery.toLocaleString()}</span></div>}
                                                    {bill.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Membership discount</span><span>-₹{bill.discount.toLocaleString()}</span></div>}
                                                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total Amount</span><span>₹{grandTotal.toLocaleString()}</span></div>
                                                </>
                                            ) : (<>
                                            {otherBasketItems.length > 0 && (
                                                <div className="flex justify-between font-medium text-primary">
                                                    <span>Other Basket Items ({otherBasketItems.length})</span>
                                                    <span>₹{otherBasketTotal.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span>Current Item Base</span>
                                                <span>₹{basePrice.toLocaleString()}</span>
                                            </div>
                                            {fabricPrice > 0 && (
                                                <div className="flex justify-between text-indigo-600">
                                                    <span>Fabric</span>
                                                    <span>+₹{fabricPrice.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {deliveryPrice > 0 && (
                                                <div className="flex justify-between text-amber-600">
                                                    <span>{deliveryType} Delivery</span>
                                                    <span>+₹{deliveryPrice.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {addonsPrice > 0 && (
                                                <div className="flex justify-between text-emerald-600">
                                                    <span>Style Addons</span>
                                                    <span>+₹{addonsPrice.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {customizationsPrice > 0 && (
                                                <div className="flex justify-between text-purple-600">
                                                    <span>Customizations</span>
                                                    <span>+₹{customizationsPrice.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {isTailorAtHome && (
                                                <div className="flex justify-between text-sky-600">
                                                    <span>Tailor At Home Visit</span>
                                                    <span>
                                                        {isVisitCoveredInOrder ? (
                                                            <span className="text-emerald-600 font-bold">Covered in Order (₹0)</span>
                                                        ) : (
                                                            `+₹${tailorAtHomePrice.toLocaleString()}`
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            {platformFee > 0 && (
                                                <div className="flex justify-between text-gray-500">
                                                    <span>Platform Fee</span>
                                                    <span>+₹{platformFee.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-gray-400 pb-1 border-b border-gray-200">
                                                <span>GST ({gstPercentage}%)</span>
                                                <span>+₹{taxes.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-gray-900 pt-1">
                                                <span>Total Amount</span>
                                                <span>₹{grandTotal.toLocaleString()}</span>
                                            </div>
                                            </>)}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <button
                                    onClick={handleBuyNow}
                                    className={cn(
                                        "w-full py-3.5 rounded-full font-bold text-[14.5px] flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[52px]",
                                        isMeasurementValid
                                            ? "bg-gradient-to-r from-[#8A3FA6] to-[#5A1A78] text-white shadow-[0_14px_28px_-14px_rgba(90,26,120,0.9)] active:scale-[0.98]"
                                            : "bg-gradient-to-r from-[#8A3FA6] to-[#5A1A78] text-white opacity-90 shadow-[0_14px_28px_-14px_rgba(90,26,120,0.9)]"
                                    )}
                                >
                                    {isMeasurementValid ? (
                                        editBasketIndex != null ? (
                                            <>Save Changes <ChevronRight size={16} /></>
                                        ) : location.state?.fromMultiItemBasket && serviceItems.length > 0 ? (
                                            <>Book All ({serviceItems.length + 1}) <ChevronRight size={16} /></>
                                        ) : (
                                            <>Book Now <ChevronRight size={16} /></>
                                        )
                                    ) : (
                                        <>Continue to Measurements <ChevronRight size={16} /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <StyleAddonModal
                isOpen={isAddonModalOpen}
                onClose={() => setIsAddonModalOpen(false)}
                selectedAddons={selectedAddons}
                onUpdate={setSelectedAddons}
                category={serviceData.category}
                serviceTitle={serviceData.title}
                directStyleAddons={serviceData.category?.styleAddons || []}
            />
        </div>
    );
};

export default ServiceDetail;
