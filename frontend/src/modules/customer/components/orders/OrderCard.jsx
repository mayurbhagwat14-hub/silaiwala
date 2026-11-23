import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, Truck, Home, Sparkles } from 'lucide-react';
import { getImageUrl } from '../../../../utils/imageUrl';
import ReviewModal from './ReviewModal';
import {
    formatOrderItemsTitle,
    getItemImage,
    getItemLabel,
    getOrderItemCount,
    orderHasTailorAtHome,
} from '../../../../utils/orderItems';

const DEFAULT_GARMENT_IMAGE = 'https://res.cloudinary.com/dfpnrwpib/image/upload/v1790608227/tailor_platform/z9cukm3gosnibmiv3ysk.jpg';

const OrderCard = ({ order }) => {
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    
    const items = order.items || [];
    const serviceTitle = formatOrderItemsTitle(items, { fallback: 'Custom Stitching Order' });
    const deliveryType = items[0]?.deliveryType || 'Standard Delivery';
    const displayId = order.orderId || "ORD-0000";
    const status = (order.status || 'Pending').replace(/-/g, ' ').toUpperCase();
    const itemCount = getOrderItemCount(items);

    const getStatusBadgeStyle = (statusStr) => {
        const s = statusStr?.toLowerCase() || '';
        if (['accepted', 'delivered', 'completed', 'product-delivered', 'order-completed'].includes(s)) {
            return 'bg-emerald-50 text-emerald-700';
        }
        if (['pending', 'in-progress', 'in progress', 'fabric-ready-for-pickup'].includes(s)) {
            return 'bg-amber-50 text-amber-700';
        }
        if (['cancelled'].includes(s)) {
            return 'bg-red-50 text-red-600';
        }
        return 'bg-[#843D9B]/10 text-[#843D9B]';
    };

    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }) : "Date Unknown";

    const itemRawImg = getItemImage(items[0]);
    const mainImage = (itemRawImg && getImageUrl(itemRawImg)) ? getImageUrl(itemRawImg) : DEFAULT_GARMENT_IMAGE;
    
    const isTailorAtHome = orderHasTailorAtHome(items);

    const measureLabel = isTailorAtHome
        ? 'Doorstep visit'
        : items[0]?.measurements?.type === 'sample' ? 'Sample pickup' : 'Saved measurements';
    const prettyStatus = status.charAt(0) + status.slice(1).toLowerCase();
    const deliveryLabel = String(deliveryType).replace(/^w/, (c) => c.toUpperCase());

    return (
        <div className="group rounded-2xl border border-gray-100 bg-white p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md">
            <Link to={`/user/orders/${order._id || order.orderId}/track`} className="flex gap-3.5">
                {/* Image */}
                <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-gray-50">
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
                    <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${getStatusBadgeStyle(order.status)}`}>
                            {prettyStatus}
                        </span>
                        <span className="shrink-0 text-[15px] font-bold text-gray-900">₹{order.totalAmount || 0}</span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                        <h3 className="line-clamp-1 text-[14.5px] font-semibold capitalize text-gray-900">
                            {serviceTitle.toLowerCase()}
                        </h3>
                        <ChevronRight size={16} className="shrink-0 text-gray-300 transition-colors group-hover:text-[#843D9B]" />
                    </div>

                    <p className="mt-0.5 truncate text-[11.5px] text-gray-400">
                        #{displayId}
                        {order.createdByAdmin && <span className="ml-1.5 inline-flex items-center gap-0.5 text-amber-600"><Sparkles size={10} /> Admin assisted</span>}
                    </p>

                    <div className="mt-auto flex items-center gap-3 pt-2 text-[11.5px] text-gray-500">
                        <span className="flex shrink-0 items-center gap-1"><Calendar size={12} className="text-gray-400" />{formattedDate}</span>
                        <span className="flex min-w-0 items-center gap-1"><Truck size={12} className="shrink-0 text-gray-400" /><span className="truncate">{deliveryLabel}</span></span>
                    </div>
                </div>
            </Link>

            {/* Footer: items + measurement method */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
                <span className="min-w-0 truncate text-[12px] text-gray-600">
                    {items.length > 1
                        ? `${items.length} garments · qty ${itemCount}`
                        : <>{getItemLabel(items[0])} <span className="text-gray-400">× {items[0]?.quantity || 1}</span></>}
                </span>
                <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${isTailorAtHome ? 'bg-[#843D9B]/10 text-[#843D9B]' : 'bg-gray-100 text-gray-600'}`}>
                    {isTailorAtHome && <Home size={11} />} {measureLabel}
                </span>
            </div>

            {/* Leave Review Action Button (Only when delivered) */}
            {['delivered', 'product-delivered', 'order-completed'].includes((order.status || '').toLowerCase()) && !order.isReviewed && (
                <div className="mt-2.5 flex justify-end">
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            setIsReviewModalOpen(true);
                        }}
                        className="w-full rounded-xl border border-amber-200 bg-amber-50 py-2 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                    >
                        Rate Order & Tailor
                    </button>
                </div>
            )}

            {/* Review Modal */}
            <ReviewModal 
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                orderId={order._id || order.orderId}
                tailorId={order.tailor?._id || order.tailor}
                deliveryPartnerId={order.deliveryPartner?._id || order.deliveryPartner}
                onSuccess={() => {
                    setIsReviewModalOpen(false);
                }}
            />
        </div>
    );
};

export default OrderCard;
