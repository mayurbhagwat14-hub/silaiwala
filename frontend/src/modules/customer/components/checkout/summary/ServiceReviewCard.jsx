import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shirt, Scissors, Pencil, Search, Trash2, SlidersHorizontal, Layers, ArrowLeftRight, Ruler,
    CheckCircle2, Eye, EyeOff, PersonStanding, Sparkles, MoveVertical, Star, BadgeCheck, ChevronRight, Home,
} from 'lucide-react';
import api from '../../../../../utils/api';
import SafeImage from '../../../../../components/Common/SafeImage';
import AboutShopModal from './AboutShopModal';
import {
    NecklineIcon, SleeveIcon, BottomIcon, EmbroideryIcon, LaceIcon, LiningIcon,
} from '../../service-detail/CustomizationSelector';

const SLOTS = {
    neck: { label: 'Neck Design', Icon: NecklineIcon },
    sleeve: { label: 'Sleeve Style', Icon: SleeveIcon },
    bottom: { label: 'Bottom Style', Icon: BottomIcon },
    length: { label: 'Length', Icon: ({ className }) => <MoveVertical className={className} strokeWidth={1.8} /> },
    embroidery: { label: 'Embroidery Work', Icon: EmbroideryIcon },
    lacePiping: { label: 'Lace / Piping', Icon: LaceIcon },
    lining: { label: 'Inner Lining', Icon: LiningIcon },
    other: { label: 'Customization', Icon: ({ className }) => <Scissors className={className} strokeWidth={1.8} /> },
};
const NON_MEASURE_KEYS = ['type', 'notes', 'slipImage', 'image', 'url', 'slipUrl', 'file', 'isConfirmed', 'saveProfile', 'sampleGarment', 'slipAttached', 'data', 'option', 'categoryId', 'garmentType'];
const DELIVERY_DAYS = { express: 10, premium: 7, standard: 15 };

/** White section card with the reference header: purple icon, title, "Edit" on the right. */
export const ReviewCard = ({ icon: Icon, title, optional, onEdit, extra, children, id }) => (
    <section id={id} className="scroll-mt-28 rounded-[18px] bg-white p-4 shadow-[0_6px_20px_-14px_rgba(60,20,80,0.35)] ring-1 ring-[#EFE8F4]">
        <div className="mb-3 flex items-center gap-2.5">
            <Icon size={22} strokeWidth={1.7} className="shrink-0 text-[#6A2385]" />
            <h3 className="min-w-0 flex-1 truncate text-[16px] font-bold text-[#1A1523]">
                {title}
                {optional && <span className="ml-1 text-[11px] font-medium text-gray-500">(Optional)</span>}
            </h3>
            {extra}
            {onEdit && (
                <button type="button" onClick={onEdit} className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#6A2385] hover:underline cursor-pointer">
                    <Pencil size={14} /> Edit
                </button>
            )}
        </div>
        {children}
    </section>
);

/** One garment on the checkout summary: Order Details, Customization Summary, Fabric Details and Measurements cards. */
const ServiceReviewCard = ({ service, config, pricing, onRemove }) => {
    const navigate = useNavigate();
    const [tailorData, setTailorData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showMeasurements, setShowMeasurements] = useState(false);

    const tailorId = service?.tailorId || (typeof service?.tailor === 'object' ? (service?.tailor?._id || service?.tailor?.id) : service?.tailor);

    useEffect(() => {
        if (!tailorId) return undefined;
        let isMounted = true;
        api.get(`/tailors/${tailorId}`)
            .then((res) => { if (res.data.success && isMounted) setTailorData(res.data.data); })
            .catch((err) => {
                if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
                    console.log('Tailor info fetch notice:', err?.message || err);
                }
            });
        return () => { isMounted = false; };
    }, [tailorId]);

    if (!service) return null;

    // Back to this service's configuration page
    const editService = () => {
        const sid = service._id || service.id;
        if (sid) navigate(`/user/services/${sid}`);
        else navigate(-1);
    };

    const shopName = tailorData?.shopName || service.tailorName || 'Tailor Partner';
    const rating = Number(tailorData?.rating) || 0;
    const totalReviews = Number(tailorData?.totalReviews) || 0;

    const isHomeVisitSelected = Boolean(
        config?.isTailorAtHome ||
        config?.measurements?.option === 'visit' ||
        config?.measurements?.type === 'home' ||
        (pricing?.tailorAtHome && pricing.tailorAtHome > 0)
    );

    const garmentPrice = (Number(pricing?.base) || 0) + (Number(pricing?.addons) || 0) + (Number(pricing?.fabric) || 0) + (Number(pricing?.customizations) || 0);
    const basePrice = Math.round(Number(pricing?.base) || garmentPrice || Number(pricing?.total) || 0);

    const custs = Object.entries(config?.customizations || {})
        .filter(([key, val]) => key !== 'fit' && val && val.enabled !== false && (val.name || val.refImage || Number(val.price) > 0));
    const fitName = config?.customizations?.fit?.enabled ? String(config.customizations.fit.name || '').replace(/\s*fit$/i, '') : '';
    const addonsList = Array.isArray(config?.addons) && config.addons.length > 0
        ? config.addons
        : (Array.isArray(config?.styleAddons) ? config.styleAddons : []);
    const hasEmbroidery = custs.some(([key]) => key === 'embroidery');
    const style = config?.selectedStyle;
    const deliveryDays = DELIVERY_DAYS[String(config?.deliveryType || 'standard').toLowerCase()] || DELIVERY_DAYS.standard;

    const fabric = config?.selectedFabric;
    const ownFabric = config?.fabricSource !== 'platform';
    const fabricName = ownFabric ? 'My Own Fabric' : (fabric?.name || "Tailor's Fabric");
    const fabricSub = ownFabric ? 'I will provide the fabric' : `Bought from ${shopName}`;
    const fabricImage = !ownFabric ? (fabric?.image || fabric?.images?.[0]) : null;

    const m = config?.measurements || {};
    const measureSub = isHomeVisitSelected
        ? 'Our executive will take them at your home'
        : m.type === 'slip' || m.slipImage ? 'Using uploaded measurement slip'
            : m.type === 'sample' || m.sampleGarment ? 'Using your sample garment'
                : m.type === 'saved' ? 'Using your saved measurement profile'
                    : 'Entered by you';
    const measureValues = !isHomeVisitSelected
        ? Object.entries(m.data && typeof m.data === 'object' ? { ...m, ...m.data } : m)
            .filter(([key, val]) => !NON_MEASURE_KEYS.includes(key) && val !== '' && val != null && typeof val !== 'object')
        : [];

    return (
        <>
            {/* Order details */}
            <ReviewCard
                icon={Shirt}
                title="Order Details"
                onEdit={editService}
                extra={onRemove && (
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onRemove(); }}
                        className="mr-1 flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-red-500 hover:underline cursor-pointer"
                        title="Remove item"
                    >
                        <Trash2 size={13} /> Remove
                    </button>
                )}
            >
                <div className="flex gap-3.5">
                    <button
                        type="button"
                        onClick={() => service.image && window.open(service.image, '_blank')}
                        className="relative h-[118px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-[#F6EEFA]"
                        aria-label="View photo"
                    >
                        {service.image && <img src={service.image} alt={service.title} className="h-full w-full object-cover" />}
                        <span className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#1A1523] shadow">
                            <Search size={13} />
                        </span>
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[16px] font-bold leading-snug text-[#1A1523]">{service.title}</h4>
                            <span className="shrink-0 text-[18px] font-bold text-[#1A1523]">₹{basePrice.toLocaleString('en-IN')}</span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#4B4453]">
                            <Scissors size={14} className="text-[#6A2385]" /> Stitching Service
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {style && (
                                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${style.isCustom ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F3E9F8] text-[#6A2385]'}`}>
                                    <Sparkles size={12} /> {style.isCustom ? 'Custom Design' : style.name}
                                </span>
                            )}
                            {hasEmbroidery && (
                                <span className="flex items-center gap-1 rounded-full bg-[#F3E9F8] px-2.5 py-1 text-[11.5px] font-semibold text-[#6A2385]">
                                    <EmbroideryIcon className="h-3 w-3" /> With Embroidery
                                </span>
                            )}
                        </div>
                        <p className="mt-auto pt-2 text-[12px] text-[#4B4453]">
                            Qty: 1
                            {fitName && <><span className="mx-2 text-gray-300">|</span>Fit: {fitName}</>}
                            <span className="mx-2 text-gray-300">|</span>Est. Delivery: {deliveryDays} Days
                        </p>
                    </div>
                </div>

                {/* Tailor */}
                <div className="mt-3 flex items-center gap-2.5 border-t border-[#F3ECF7] pt-3">
                    <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#F6EEFA]">
                        <SafeImage src={tailorData?.user?.profileImage} alt={shopName} className="h-full w-full object-cover" />
                    </span>
                    <p className="flex min-w-0 flex-1 items-center gap-1 text-[12.5px] text-[#4B4453]">
                        <span className="truncate">Tailored by <span className="font-semibold text-[#1A1523]">{shopName}</span></span>
                        <BadgeCheck size={14} className="shrink-0 fill-[#6A2385] text-white" />
                        {rating > 0 && totalReviews > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5 text-[11.5px]"><Star size={11} className="fill-[#F5A623] text-[#F5A623]" />{rating.toFixed(1)}</span>
                        )}
                    </p>
                    <button type="button" onClick={() => setIsModalOpen(true)} className="flex shrink-0 items-center text-[12px] font-semibold text-[#6A2385] cursor-pointer">
                        Profile <ChevronRight size={13} />
                    </button>
                </div>
            </ReviewCard>

            {/* Customization summary */}
            <ReviewCard icon={SlidersHorizontal} title="Customization Summary" onEdit={editService}>
                {custs.length > 0 ? (
                    <div className="grid grid-cols-2 gap-x-4">
                        {custs.map(([key, val]) => {
                            const slot = SLOTS[key] || { label: key, Icon: SLOTS.other.Icon };
                            const SlotIcon = slot.Icon;
                            return (
                                <div key={key} className="flex min-w-0 items-center gap-2.5 border-b border-[#F3ECF7] py-2.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[#6A2385]">
                                        <SlotIcon className="h-7 w-7" strokeWidth={1.5} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-[13px] font-bold text-[#1A1523]">{slot.label}</p>
                                        <p className="truncate text-[12px] capitalize text-[#4B4453]">{val.name || 'Custom spec'}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-[12.5px] text-gray-500">No customizations selected — standard design.</p>
                )}
                {addonsList.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {addonsList.map((addon, i) => (
                            <span key={addon._id || i} className="rounded-full bg-[#F6EEFA] px-2.5 py-1 text-[11.5px] font-semibold text-[#6A2385]">
                                + {addon.name || addon.title}
                            </span>
                        ))}
                    </div>
                )}
            </ReviewCard>

            {/* Fabric */}
            <ReviewCard icon={Layers} title="Fabric Details" onEdit={editService}>
                <div className="flex items-center gap-3.5">
                    {fabricImage ? (
                        <img src={fabricImage} alt={fabricName} className="h-[66px] w-[104px] shrink-0 rounded-xl object-cover" />
                    ) : (
                        <span className="relative h-[66px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#C27BD8] via-[#8E3FA8] to-[#5A1A78]">
                            <span className="absolute -left-4 top-2 h-16 w-28 rotate-12 rounded-[50%] bg-white/15" />
                            <span className="absolute -right-6 bottom-0 h-12 w-24 -rotate-12 rounded-[50%] bg-black/10" />
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-[#1A1523]">{fabricName}</p>
                        <p className="text-[12px] text-[#4B4453]">{fabricSub}</p>
                    </div>
                    <button
                        type="button"
                        onClick={editService}
                        className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold text-[#6A2385] ring-1 ring-[#6A2385] hover:bg-[#F8F1FB] cursor-pointer"
                    >
                        <ArrowLeftRight size={14} /> Change
                    </button>
                </div>
            </ReviewCard>

            {/* Measurements */}
            <ReviewCard icon={Ruler} title="Measurements" onEdit={editService}>
                <div className="rounded-2xl p-3 ring-1 ring-[#EFE8F4]">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[#6A2385]">
                            {isHomeVisitSelected ? <Home size={26} strokeWidth={1.5} /> : <PersonStanding size={28} strokeWidth={1.5} />}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#1A1523]">
                                <CheckCircle2 size={16} className="shrink-0 fill-emerald-500 text-white" />
                                {isHomeVisitSelected ? 'Home Visit Booked' : 'Measurements Provided'}
                            </p>
                            <p className="text-[12px] text-[#4B4453]">{measureSub}</p>
                        </div>
                        {measureValues.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowMeasurements((v) => !v)}
                                className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F6EEFA] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#6A2385] cursor-pointer"
                            >
                                {showMeasurements ? <EyeOff size={14} /> : <Eye size={14} />} {showMeasurements ? 'Hide' : 'View'}
                            </button>
                        )}
                    </div>
                    {showMeasurements && (
                        <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-[#F3ECF7] pt-3">
                            {measureValues.map(([key, val]) => (
                                <div key={key} className="rounded-lg bg-[#FBF7FD] px-2 py-1.5">
                                    <p className="truncate text-[10.5px] capitalize text-gray-500">{key.replace(/_/g, ' ')}</p>
                                    <p className="text-[12.5px] font-semibold text-[#1A1523]">{String(val)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ReviewCard>

            <AboutShopModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tailor={tailorData}
                tailorId={tailorId}
            />
        </>
    );
};

export default ServiceReviewCard;
