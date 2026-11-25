import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronRight, ArrowRight, Calendar, Layers, Gem, Zap, Sparkles, Check, Clock, Truck, Scissors,
    ShieldCheck, PackageCheck, XCircle, Ruler, ShoppingBag, Loader, Package,
} from 'lucide-react';
import { getImageUrl } from '../../../../utils/imageUrl';
import ReviewModal from './ReviewModal';
import { formatOrderItemsTitle, getItemImage, getItemLabel, getOrderItemCount } from '../../../../utils/orderItems';

const DEFAULT_GARMENT_IMAGE = 'https://res.cloudinary.com/dfpnrwpib/image/upload/v1790608227/tailor_platform/z9cukm3gosnibmiv3ysk.jpg';

const DONE = ['delivered', 'product-delivered', 'order-completed'];

/** Badge (label, icon, colours) for an order status. */
const statusBadge = (raw) => {
    const s = String(raw || 'pending').toLowerCase();
    const pretty = s.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    if (DONE.includes(s)) return { label: 'Delivered', icon: PackageCheck, cls: 'bg-emerald-50 text-emerald-700' };
    if (s === 'cancelled' || s === 'failed-delivery') return { label: pretty, icon: XCircle, cls: 'bg-red-50 text-red-600' };
    if (s === 'out-for-delivery') return { label: 'Out for Delivery', icon: Truck, cls: 'bg-sky-50 text-sky-700' };
    if (['completed', 'ready', 'ready-for-pickup', 'ready-for-delivery'].includes(s)) return { label: pretty, icon: PackageCheck, cls: 'bg-emerald-50 text-emerald-700' };
    if (s === 'quality-check') return { label: 'Quality Check', icon: ShieldCheck, cls: 'bg-[#F3E9F8] text-[#6A2385]' };
    if (['stitching', 'cutting', 'finishing', 'pattern-making'].includes(s)) return { label: pretty, icon: Scissors, cls: 'bg-[#F3E9F8] text-[#6A2385]' };
    if (s === 'fabric-picked-up') return { label: 'Fabric Picked Up', icon: Truck, cls: 'bg-[#F3E9F8] text-[#6A2385]' };
    if (s.startsWith('fabric-')) return { label: pretty, icon: Truck, cls: 'bg-[#F3E9F8] text-[#6A2385]' };
    if (s.startsWith('measurement')) return { label: pretty, icon: Ruler, cls: 'bg-[#F3E9F8] text-[#6A2385]' };
    if (s === 'in-progress') return { label: 'In Progress', icon: Loader, cls: 'bg-amber-50 text-amber-700' };
    if (s === 'accepted') return { label: 'Accepted', icon: Check, cls: 'bg-emerald-50 text-emerald-700' };
    return { label: pretty, icon: Clock, cls: 'bg-amber-50 text-amber-700' };
};

const DELIVERY = {
    standard: { label: 'Standard', icon: Layers },
    express: { label: 'Express', icon: Zap },
    premium: { label: 'Premium', icon: Gem },
};

// Stitching orders: Placed -> Fabric -> Stitching -> Delivery. Fabric-store orders: Placed -> Confirmed -> Shipped -> Delivered.
const STITCH_STEPS = [
    { label: 'Order Placed', icon: ShoppingBag },
    { label: 'Fabric', icon: Package },
    { label: 'Stitching', icon: Scissors },
    { label: 'Delivery', icon: Truck },
];
const PRODUCT_STEPS = [
    { label: 'Order Placed', icon: ShoppingBag },
    { label: 'Confirmed', icon: Check },
    { label: 'Shipped', icon: Truck },
    { label: 'Delivered', icon: PackageCheck },
];

/** Which step the order is on; `done` = every step finished. */
const stepOf = (raw, productOnly) => {
    const s = String(raw || 'pending').toLowerCase();
    if (DONE.includes(s)) return { current: 4 };
    if (productOnly) {
        if (s === 'out-for-delivery') return { current: 2 };
        if (s === 'pending') return { current: 0 };
        return { current: 1 };
    }
    if (s === 'out-for-delivery') return { current: 3 };
    if (['pattern-making', 'in-progress', 'cutting', 'stitching', 'finishing', 'quality-check', 'completed', 'ready', 'ready-for-pickup', 'ready-for-delivery', 'measurement-verification'].includes(s)) return { current: 2 };
    if (['fabric-picked-up', 'fabric-delivered', 'fabric-received'].includes(s)) return { current: 1 };
    return { current: 0 };
};

const Stepper = ({ steps, current }) => (
    <div className="flex min-w-0 flex-1 items-start">
        {steps.map((step, i) => {
            const done = i < current;
            const active = i === current;
            const Icon = step.icon;
            return (
                <React.Fragment key={step.label}>
                    {i > 0 && (
                        <span className={`mt-[10px] h-[2px] min-w-[8px] flex-1 rounded-full ${i <= current ? 'bg-[#6A2385]' : 'bg-gray-200'}`} />
                    )}
                    <div className="flex w-[60px] shrink-0 flex-col items-center sm:w-[68px]">
                        <span
                            className={`flex h-[22px] w-[22px] items-center justify-center rounded-full ${
                                done
                                    ? 'bg-[#6A2385] text-white'
                                    : active
                                        ? 'bg-white text-[#6A2385] ring-2 ring-[#6A2385] ring-offset-1'
                                        : 'bg-white text-gray-300 ring-1 ring-gray-300'
                            }`}
                        >
                            {done ? <Check size={12} strokeWidth={3} /> : <Icon size={11} />}
                        </span>
                        <span className={`mt-1 whitespace-nowrap text-center text-[9.5px] leading-tight ${active ? 'font-semibold text-[#6A2385]' : done ? 'font-medium text-[#2A1F33]' : 'text-gray-400'}`}>
                            {step.label}
                        </span>
                    </div>
                </React.Fragment>
            );
        })}
    </div>
);

const OrderCard = ({ order }) => {
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    const items = order.items || [];
    const serviceTitle = formatOrderItemsTitle(items, { fallback: 'Custom Stitching Order' });
    const displayId = order.orderId || 'ORD-0000';
    const itemCount = getOrderItemCount(items);
    const statusKey = String(order.status || 'pending').toLowerCase();
    const badge = statusBadge(statusKey);
    const BadgeIcon = badge.icon;
    const delivery = DELIVERY[String(items[0]?.deliveryType || 'standard').toLowerCase()] || DELIVERY.standard;
    const DeliveryIcon = delivery.icon;
    const productOnly = items.length > 0 && items.every((i) => i.product && !i.service);
    const cancelled = statusKey === 'cancelled' || statusKey === 'failed-delivery';
    const { current } = stepOf(statusKey, productOnly);
    const trackUrl = `/user/orders/${order._id || order.orderId}/track`;

    const formattedDate = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Date Unknown';

    const itemRawImg = getItemImage(items[0]);
    const mainImage = (itemRawImg && getImageUrl(itemRawImg)) || DEFAULT_GARMENT_IMAGE;

    return (
        <div className="group rounded-[18px] bg-white p-3 shadow-[0_6px_20px_-14px_rgba(42,15,56,0.35)] ring-1 ring-[#EFE8F4] transition-shadow hover:shadow-[0_10px_26px_-14px_rgba(42,15,56,0.45)]">
            <Link to={trackUrl} className="flex gap-3">
                {/* Image */}
                <div className="relative h-[96px] w-[84px] shrink-0 overflow-hidden rounded-[14px] bg-[#F6EEFA]">
                    <img
                        src={mainImage}
                        alt={serviceTitle}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_GARMENT_IMAGE; }}
                    />
                    {items.length > 1 && (
                        <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                            {items.length} items
                        </span>
                    )}
                </div>

                {/* Details */}
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className={`inline-flex w-fit max-w-full items-center gap-1 truncate rounded-md px-2 py-[3px] text-[10.5px] font-semibold ${badge.cls}`}>
                        <BadgeIcon size={11} className="shrink-0" /> {badge.label}
                    </span>
                    <h3 className="mt-1.5 line-clamp-1 text-[15px] font-bold capitalize leading-tight text-[#1A1523]">
                        {serviceTitle.toLowerCase()}
                    </h3>
                    <p className="mt-0.5 truncate text-[11.5px] text-gray-400">
                        #{displayId}
                        {order.createdByAdmin && <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-600"><Sparkles size={10} /> Admin assisted</span>}
                    </p>
                    <div className="mt-auto flex items-center gap-3 pt-1.5 text-[11.5px] text-[#4B4453]">
                        <span className="flex shrink-0 items-center gap-1"><Calendar size={12} className="text-[#6A2385]" />{formattedDate}</span>
                        <span className="flex min-w-0 items-center gap-1"><DeliveryIcon size={12} className="shrink-0 text-[#6A2385]" /><span className="truncate">{delivery.label}</span></span>
                    </div>
                </div>

                {/* Price + action */}
                <div className="flex shrink-0 flex-col items-end">
                    <span className="text-[16px] font-bold text-[#1A1523]">₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</span>
                    <ChevronRight size={17} className="mt-1 text-gray-300 transition-colors group-hover:text-[#6A2385]" />
                    <span className="mt-auto flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] py-1.5 pl-3 pr-2.5 text-[11.5px] font-semibold text-white shadow-[0_6px_14px_-8px_rgba(90,26,120,0.8)]">
                        View Details <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>
            </Link>

            {/* Items + progress */}
            <div className="mt-3 flex items-center gap-2">
                <span className="w-[84px] shrink-0 truncate text-[11.5px] text-[#2A1F33]">
                    {items.length > 1 ? `${items.length} items · ${itemCount} pcs` : `${getItemLabel(items[0])} × ${items[0]?.quantity || 1}`}
                </span>
                {cancelled ? (
                    <span className="flex flex-1 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[11.5px] font-medium text-red-600">
                        <XCircle size={13} /> {statusKey === 'cancelled' ? 'This order was cancelled' : 'Delivery attempt failed'}
                    </span>
                ) : (
                    <Stepper steps={productOnly ? PRODUCT_STEPS : STITCH_STEPS} current={current} />
                )}
            </div>

            {/* Leave review (only when delivered) */}
            {DONE.includes(statusKey) && !order.isReviewed && (
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setIsReviewModalOpen(true); }}
                    className="mt-3 w-full rounded-xl bg-amber-50 py-2 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100"
                >
                    Rate Order &amp; Tailor
                </button>
            )}

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                orderId={order._id || order.orderId}
                tailorId={order.tailor?._id || order.tailor}
                deliveryPartnerId={order.deliveryPartner?._id || order.deliveryPartner}
                onSuccess={() => setIsReviewModalOpen(false)}
            />
        </div>
    );
};

export default OrderCard;
