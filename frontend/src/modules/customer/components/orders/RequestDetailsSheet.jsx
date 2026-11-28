import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, MapPin, Store, IndianRupee, FileText } from 'lucide-react';

const STATUS_STYLES = {
    accepted: 'bg-green-50 text-green-600 ring-green-100',
    paid: 'bg-green-50 text-green-600 ring-green-100',
    pending: 'bg-orange-50 text-orange-500 ring-orange-100',
    quoted: 'bg-blue-50 text-blue-600 ring-blue-100',
    rejected: 'bg-red-50 text-red-500 ring-red-100',
};

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const Row = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-3 py-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F6EEFA] text-[#6A2385]">
            <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <div className="mt-0.5 break-words text-[13px] font-medium text-[#1A1523]">{children}</div>
        </div>
    </div>
);

/**
 * Bottom sheet with the full details of an alteration / custom-design request.
 * Used for requests that don't have a trackable order yet.
 */
const RequestDetailsSheet = ({ open, onClose, title, requestId, request, paymentStatus, footer }) => {
    const [activeImg, setActiveImg] = useState(0);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open || !request) return null;

    const images = request.images?.length ? request.images : [];
    const status = String(request.quotationStatus || 'pending').toLowerCase();
    const addr = request.pickupAddress;
    const addressText = addr ? [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') : '';

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-black/45" onClick={onClose} />
            <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-[#F1EAF5] px-5 py-4">
                    <div className="min-w-0">
                        <h3 className="truncate text-[16px] font-bold text-[#1A1523]">{title}</h3>
                        {requestId && <p className="text-[11px] font-semibold text-gray-400">#{requestId}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F6EEFA] text-[#6A2385]"
                        aria-label="Close details"
                    >
                        <X size={17} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
                    {images.length > 0 && (
                        <div className="mb-4">
                            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-100">
                                <img src={images[activeImg]} alt={`${title} ${activeImg + 1}`} className="h-full w-full object-cover" />
                            </div>
                            {images.length > 1 && (
                                <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
                                    {images.map((src, i) => (
                                        <button
                                            key={src + i}
                                            type="button"
                                            onClick={() => setActiveImg(i)}
                                            className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 ${i === activeImg ? 'border-[#6A2385]' : 'border-transparent'}`}
                                        >
                                            <img src={src} alt="" className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${STATUS_STYLES[status] || 'bg-[#F8F5FF] text-[#843D9B] ring-[#843D9B]/10'}`}>
                            {status.replace(/-/g, ' ')}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${paymentStatus === 'paid' ? STATUS_STYLES.paid : 'bg-gray-50 text-gray-500 ring-gray-200'}`}>
                            Payment: {paymentStatus || 'pending'}
                        </span>
                    </div>

                    <div className="divide-y divide-[#F4EEF7]">
                        {request.description && (
                            <Row icon={FileText} label="Your request">{request.description}</Row>
                        )}
                        <Row icon={Store} label="Tailor">{request.tailor?.shopName || request.tailor?.name || 'Assigned'}</Row>
                        <Row icon={Calendar} label="Requested on">{formatDate(request.createdAt)}</Row>
                        <Row icon={IndianRupee} label="Quote">
                            {request.quoteAmount ? `₹${request.quoteAmount}` : <span className="text-gray-400">Waiting for tailor to send a quote</span>}
                        </Row>
                        {request.estimatedCompletionTime && (
                            <Row icon={Clock} label="Estimated completion">{request.estimatedCompletionTime}</Row>
                        )}
                        {addressText && <Row icon={MapPin} label="Pickup address">{addressText}</Row>}
                    </div>
                </div>

                {footer && <div className="border-t border-[#F1EAF5] px-5 py-3">{footer}</div>}
            </div>
        </div>,
        document.body
    );
};

export default RequestDetailsSheet;
