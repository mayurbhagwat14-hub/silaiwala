import React from 'react';
import { CreditCard, Info } from 'lucide-react';
import { splitAdvanceRemaining } from '../../../../../utils/checkoutBilling';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const Row = ({ label, sub, value, valueClassName = 'text-[#1A1523]', labelClassName = 'text-[#2A1F33]' }) => (
    <div className="flex items-start justify-between gap-3 border-b border-[#F3ECF7] py-2 text-[13.5px] last:border-b-0">
        <div className={`min-w-0 flex-1 break-words ${labelClassName}`}>
            {label}
            {sub}
        </div>
        <span className={`shrink-0 whitespace-nowrap text-right font-medium ${valueClassName}`}>{value}</span>
    </div>
);

/**
 * Price Breakdown card. Amounts come from the server price summary (`pricing`); when `items` are
 * passed, stitching and customization lines are itemised by garment — but only if those lines add up
 * to the server's figures, otherwise the combined line is shown so the bill always matches the total.
 */
const BillDetails = ({ pricing, advancePercentage = 30, baseLabel = 'Stitching Charges', items = [] }) => {
    if (!pricing) return null;

    const {
        base = 0,
        delivery = 0,
        taxes = 0,
        total = 0,
        addons = 0,
        fabric = 0,
        tailorAtHome = 0,
        platformFee = 0,
        platformFeePercentage = 0,
        gstPercentage = 0,
        discountAmount = 0,
        couponCode = '',
        membershipDiscount = 0,
        freeDeliveryMinOrder = 0,
        freeDeliveryApplied = false,
        isMembershipPerkApplied = false,
    } = pricing;

    const finalTotal = Math.round(Number(total) || 0);
    const couponDiscount = Math.round(Number(discountAmount) || 0);
    const memberDiscount = Math.round(Number(membershipDiscount) || 0);
    const { advanceAmount, remainingAmount } = splitAdvanceRemaining(finalTotal, advancePercentage);
    const fullAdvance = advancePercentage >= 100;
    const minOrder = Math.round(Number(freeDeliveryMinOrder) || 0);

    // Itemised stitching lines (one per garment) when they match the server's base
    const stitchLines = items.map((it) => ({
        label: `${it.serviceDetails?.title || 'Garment'} (Stitching)`,
        amount: Math.round(Number(it.pricing?.base) || 0),
    }));
    const showStitchLines = stitchLines.length > 0 && stitchLines.reduce((s, l) => s + l.amount, 0) === Math.round(base);

    // Itemised customization + add-on lines when they match the server's add-ons amount
    const extraLines = items.flatMap((it) => {
        const c = it.configuration || {};
        const custs = Object.entries(c.customizations || {})
            .filter(([, v]) => v && v.enabled !== false && Number(v.price) > 0)
            .map(([, v]) => ({ label: v.name, amount: Math.round(Number(v.price)) }));
        const adds = (Array.isArray(c.addons) && c.addons.length ? c.addons : c.styleAddons || [])
            .filter((a) => Number(a.price) > 0)
            .map((a) => ({ label: a.name || a.title, amount: Math.round(Number(a.price)) }));
        return [...custs, ...adds];
    });
    const showExtraLines = extraLines.length > 0 && extraLines.reduce((s, l) => s + l.amount, 0) === Math.round(addons);

    return (
        <section id="price-breakdown" className="scroll-mt-28 rounded-[18px] bg-white p-4 shadow-[0_6px_20px_-14px_rgba(60,20,80,0.35)] ring-1 ring-[#EFE8F4]">
            <div className="mb-1.5 flex items-center gap-2.5">
                <CreditCard size={22} strokeWidth={1.7} className="text-[#6A2385]" />
                <h3 className="text-[16px] font-bold text-[#1A1523]">Price Breakdown</h3>
            </div>

            <div>
                {showStitchLines
                    ? stitchLines.map((l, i) => <Row key={`s${i}`} label={l.label} value={inr(l.amount)} />)
                    : <Row label={baseLabel} value={inr(base)} />}

                {addons > 0 && (showExtraLines
                    ? extraLines.map((l, i) => <Row key={`a${i}`} label={l.label} value={inr(l.amount)} />)
                    : <Row label="Customizations & Add-ons" value={inr(addons)} />)}

                {fabric > 0 && <Row label="Fabric" value={inr(fabric)} />}
                {tailorAtHome > 0 && <Row label="Home Visit (Measurement)" value={inr(tailorAtHome)} />}

                <Row
                    label={<span className="inline-flex items-center gap-1.5">Convenience Fee{platformFeePercentage ? ` (${platformFeePercentage}%)` : ''} <Info size={13} className="text-gray-400" /></span>}
                    value={inr(platformFee)}
                />
                {memberDiscount > 0 && <Row label="Membership Discount" value={`-${inr(memberDiscount)}`} labelClassName="text-emerald-700" valueClassName="text-emerald-700" />}
                <Row label={`GST (${gstPercentage}%)`} value={inr(taxes)} />
                <Row
                    label="Delivery"
                    sub={freeDeliveryApplied && minOrder > 0
                        ? <p className="mt-0.5 text-[11px] text-emerald-600">Free on orders {inr(minOrder)} &amp; above</p>
                        : freeDeliveryApplied && isMembershipPerkApplied
                            ? <p className="mt-0.5 text-[11px] text-emerald-600">Free with your membership</p>
                            : (!freeDeliveryApplied && minOrder > 0)
                                ? <p className="mt-0.5 text-[11px] text-gray-400">Free on orders {inr(minOrder)} &amp; above</p>
                                : null}
                    value={delivery > 0 ? inr(delivery) : 'FREE'}
                    valueClassName={delivery > 0 ? 'text-[#1A1523]' : 'font-bold text-emerald-600'}
                />
                {couponDiscount > 0 && (
                    <Row label={`Coupon Discount${couponCode ? ` (${couponCode})` : ''}`} value={`-${inr(couponDiscount)}`} labelClassName="font-semibold text-emerald-700" valueClassName="font-bold text-emerald-700" />
                )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-[#F3E6F9] to-[#EBDDF4] px-3 py-2.5">
                <span className="text-[17px] font-bold text-[#5A1A78]">Total Payable</span>
                <span className="text-[19px] font-bold text-[#5A1A78]">{inr(finalTotal)}</span>
            </div>

            {!fullAdvance && (
                <div className="mt-2.5 space-y-1 px-1 text-[12px] text-[#4B4453]">
                    <div className="flex justify-between"><span className="font-semibold text-[#6A2385]">Pay now (advance {advancePercentage}%)</span><span className="font-bold text-[#6A2385]">{inr(advanceAmount)}</span></div>
                    <div className="flex justify-between"><span>Pay on delivery</span><span className="font-semibold">{inr(remainingAmount)}</span></div>
                </div>
            )}
        </section>
    );
};

export default BillDetails;
