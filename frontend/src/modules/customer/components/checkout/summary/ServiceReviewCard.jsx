import React, { useState, useEffect } from 'react';
import { Ruler, Scissors, Shirt, X, Star, ChevronRight, BadgeCheck, Sparkles, Layers, Home, CheckCircle2, Wand2, StickyNote } from 'lucide-react';
import api from '../../../../../utils/api';
import SafeImage from '../../../../../components/Common/SafeImage';
import AboutShopModal from './AboutShopModal';

const SLOT_LABELS = {
    neck: 'Neck Design',
    sleeve: 'Sleeve Style',
    bottom: 'Bottom Style',
    embroidery: 'Embroidery Work',
    lacePiping: 'Lace / Piping',
    lining: 'Inner Lining',
    fit: 'Fit Preference',
    other: 'Customization',
};
const NON_MEASURE_KEYS = ['type', 'notes', 'slipImage', 'image', 'url', 'slipUrl', 'file', 'isConfirmed', 'saveProfile', 'sampleGarment', 'slipAttached', 'data', 'option'];

const SectionHead = ({ icon: Icon, title, right }) => (
    <div className="mb-2.5 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-[14px] font-bold text-[#1A1523]">
            <Icon size={16} className="text-[#6A2385]" /> {title}
        </h4>
        {right}
    </div>
);

/** One garment on the checkout summary: item, customizations, fabric, measurements and tailor. */
const ServiceReviewCard = ({ service, config, pricing, onRemove }) => {
    const [tailorData, setTailorData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const tailorId = service?.tailorId || (typeof service?.tailor === 'object' ? (service?.tailor?._id || service?.tailor?.id) : service?.tailor);

    useEffect(() => {
        if (!tailorId) return undefined;

        let isMounted = true;
        const fetchTailorInfo = async () => {
            try {
                const res = await api.get(`/tailors/${tailorId}`);
                if (res.data.success && isMounted) {
                    setTailorData(res.data.data);
                }
            } catch (err) {
                if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
                    console.log('Tailor info fetch notice:', err?.message || err);
                }
            }
        };

        fetchTailorInfo();
        return () => { isMounted = false; };
    }, [tailorId]);

    if (!service) return null;

    // Tailor (shop name only — privacy). Rating / experience only when real data exists.
    const shopName = tailorData?.shopName || service.tailorName || 'Tailor Partner';
    const avatarImg = tailorData?.user?.profileImage;
    const rating = Number(tailorData?.rating) || 0;
    const totalReviews = Number(tailorData?.totalReviews) || 0;
    const hasRating = rating > 0 && totalReviews > 0;
    const experience = Number(tailorData?.experienceInYears) || 0;

    const isHomeVisitSelected = Boolean(
        config?.isTailorAtHome ||
        config?.measurements?.option === 'visit' ||
        (pricing?.tailorAtHome && pricing.tailorAtHome > 0)
    );

    const garmentPrice = (Number(pricing?.base) || 0) + (Number(pricing?.addons) || 0) + (Number(pricing?.fabric) || 0) + (Number(pricing?.customizations) || 0);
    const displayGarmentPrice = Math.round(garmentPrice > 0 ? garmentPrice : (Number(pricing?.total) || 0));

    const measureType = config?.measurements?.type;
    const measureLabel = isHomeVisitSelected
        ? 'Home visit by our executive'
        : measureType === 'slip' ? 'Measurement slip uploaded'
            : measureType === 'sample' ? 'Sample garment pickup'
                : measureType === 'saved' ? 'Saved measurement profile'
                    : 'Measurements provided';
    const measureValues = !isHomeVisitSelected && config?.measurements
        ? Object.entries(config.measurements).filter(([key, val]) => !NON_MEASURE_KEYS.includes(key) && val !== '' && val != null && typeof val !== 'object')
        : [];

    const custs = Object.entries(config?.customizations || {})
        .filter(([, val]) => val && val.enabled !== false && (val.name || val.refImage || Number(val.price) > 0));
    const addonsList = Array.isArray(config?.addons) && config.addons.length > 0
        ? config.addons
        : (Array.isArray(config?.styleAddons) ? config.styleAddons : []);

    const fabric = config?.selectedFabric;
    const fabricName = config?.fabricSource === 'customer' ? 'My Own Fabric' : (fabric?.name || "Tailor's Fabric");
    const fabricSub = config?.fabricSource === 'customer' ? 'I will provide the fabric · picked up from you' : "Bought from the tailor's store";
    const fabricImage = config?.fabricSource !== 'customer' ? (fabric?.image || fabric?.images?.[0]) : null;

    return (
        <div className="relative overflow-hidden rounded-[22px] bg-white shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
            {/* Order details */}
            <div className="p-4">
                <SectionHead
                    icon={Shirt}
                    title="Order Details"
                    right={onRemove && (
                        <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
                            className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-100 cursor-pointer"
                            title="Remove item"
                        >
                            <X size={12} /> Remove
                        </button>
                    )}
                />
                <div className="flex gap-3">
                    <img
                        src={service.image}
                        alt={service.title}
                        className="h-[100px] w-[84px] shrink-0 rounded-2xl object-cover ring-1 ring-[#EFE8F4]"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[15px] font-bold leading-snug text-[#1A1523]">{service.title}</h3>
                            <span className="shrink-0 text-[16px] font-bold text-[#1A1523]">₹{displayGarmentPrice.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-gray-500">
                            <Scissors size={12} className="text-[#6A2385]" /> Stitching Service
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {config?.selectedStyle && (
                                <span className="rounded-full bg-[#F3E9F8] px-2 py-0.5 text-[10.5px] font-semibold text-[#6A2385]">
                                    {config.selectedStyle.isCustom ? 'Custom Design' : config.selectedStyle.name}
                                </span>
                            )}
                            {custs.some(([key]) => key === 'embroidery') && (
                                <span className="rounded-full bg-[#F3E9F8] px-2 py-0.5 text-[10.5px] font-semibold text-[#6A2385]">With Embroidery</span>
                            )}
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-medium text-gray-600">Qty: 1</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Customization summary */}
            {(custs.length > 0 || addonsList.length > 0) && (
                <div className="border-t border-[#F3ECF7] p-4">
                    <SectionHead icon={Wand2} title="Customization Summary" />
                    {custs.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                            {custs.map(([key, val]) => (
                                <div key={key} className="flex min-w-0 gap-2">
                                    {val.refImage ? (
                                        <img src={val.refImage} alt={val.name || key} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg object-cover ring-1 ring-[#EFE8F4]" onClick={() => window.open(val.refImage, '_blank')} />
                                    ) : (
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F6EEFA] text-[#6A2385]"><Scissors size={15} /></span>
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate text-[12px] font-semibold text-[#1A1523]">{SLOT_LABELS[key] || key}</p>
                                        <p className="truncate text-[11px] capitalize text-gray-500">
                                            {val.name || 'Custom spec'}{Number(val.price) > 0 ? ` · +₹${val.price}` : ''}
                                        </p>
                                        {val.notes && <p className="line-clamp-2 text-[10.5px] text-amber-700">Note: {val.notes}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {addonsList.length > 0 && (
                        <div className={`flex flex-wrap gap-1.5 ${custs.length > 0 ? 'mt-3' : ''}`}>
                            {addonsList.map((addon, aIdx) => (
                                <span key={addon._id || aIdx} className="flex items-center gap-1 rounded-full bg-[#F6EEFA] px-2.5 py-1 text-[11px] font-semibold text-[#6A2385]">
                                    <Sparkles size={11} /> {addon.name || addon.title}
                                    {Number(addon.price) > 0 && <span className="text-[#5A1A78]">+₹{Number(addon.price)}</span>}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Style reference photo */}
            {config?.selectedStyle?.image && (
                <div className="flex items-center gap-3 border-t border-[#F3ECF7] px-4 py-3">
                    <img
                        src={config.selectedStyle.image}
                        alt="Style"
                        className="h-11 w-11 shrink-0 cursor-pointer rounded-xl object-cover ring-1 ring-[#EFE8F4]"
                        onClick={() => window.open(config.selectedStyle.image, '_blank')}
                    />
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#1A1523]">{config.selectedStyle.name || 'Custom Style'}</p>
                        <p className="text-[11px] text-gray-500">{config.selectedStyle.isCustom ? 'Your reference photo' : 'Selected style'}</p>
                    </div>
                </div>
            )}

            {/* Fabric */}
            <div className="border-t border-[#F3ECF7] p-4">
                <SectionHead icon={Layers} title="Fabric Details" />
                <div className="flex items-center gap-3">
                    {fabricImage ? (
                        <img src={fabricImage} alt={fabricName} className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-[#EFE8F4]" />
                    ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#B66DD0] to-[#6A2385] text-white"><Layers size={20} /></span>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#1A1523]">{fabricName}</p>
                        <p className="text-[11.5px] text-gray-500">{fabricSub}</p>
                    </div>
                </div>
            </div>

            {/* Measurements */}
            <div className="border-t border-[#F3ECF7] p-4">
                <SectionHead icon={Ruler} title="Measurements" />
                <div className="flex items-start gap-2.5 rounded-2xl bg-[#FBF7FD] p-3 ring-1 ring-[#EFE8F4]">
                    {isHomeVisitSelected ? <Home size={17} className="mt-0.5 shrink-0 text-[#6A2385]" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" />}
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[#1A1523]">{measureLabel}</p>
                        {isHomeVisitSelected ? (
                            <p className="text-[11.5px] text-gray-500">Our executive will take measurements at your home (one visit for the whole order).</p>
                        ) : measureValues.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                {measureValues.slice(0, 6).map(([key, val]) => (
                                    <span key={key} className="rounded-md bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-[#2A1F33] ring-1 ring-[#EFE8F4]">
                                        {key}: {val}
                                    </span>
                                ))}
                                {measureValues.length > 6 && <span className="px-1 text-[10.5px] text-gray-400">+{measureValues.length - 6} more</span>}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Tailor */}
            <div className="flex items-center gap-3 border-t border-[#F3ECF7] p-4">
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#F6EEFA] ring-2 ring-[#EFE8F4]">
                    <SafeImage src={avatarImg} alt={shopName} className="h-full w-full object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[13.5px] font-bold text-[#1A1523]">
                        <span className="truncate">{shopName}</span>
                        <BadgeCheck size={15} className="shrink-0 fill-[#6A2385] text-white" />
                    </p>
                    <p className="flex items-center gap-1 text-[11.5px] text-gray-500">
                        {hasRating ? (
                            <><Star size={11} className="fill-[#F5A623] text-[#F5A623]" /> {rating.toFixed(1)} ({totalReviews})</>
                        ) : (
                            <><Sparkles size={11} className="text-[#6A2385]" /> New tailor</>
                        )}
                        {experience > 0 && <span>· {experience}+ yrs exp.</span>}
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#F6EEFA] px-3 py-1.5 text-[11.5px] font-semibold text-[#6A2385] ring-1 ring-[#E4D6EC] cursor-pointer"
                >
                    View Profile <ChevronRight size={13} />
                </button>
            </div>

            {/* Instructions saved with the item */}
            {config?.instructions && typeof config.instructions === 'string' && (
                <div className="mx-4 mb-4 flex gap-2 rounded-xl bg-amber-50 p-2.5 text-[12px] text-amber-900 ring-1 ring-amber-100">
                    <StickyNote size={14} className="mt-0.5 shrink-0" /> {config.instructions}
                </div>
            )}

            <AboutShopModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tailor={tailorData}
                tailorId={tailorId}
            />
        </div>
    );
};

export default ServiceReviewCard;
