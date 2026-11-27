import React from 'react';
import { CalendarDays, Zap, Crown, Check } from 'lucide-react';
import { cn } from '../../../../utils/cn';

// Days and charges must stay in step with the price summary / checkout estimate.
const options = [
    { id: 'standard', label: 'Standard', days: 15, price: 0, icon: CalendarDays },
    { id: 'express', label: 'Express', days: 10, price: 150, icon: Zap, badge: 'POPULAR' },
    { id: 'premium', label: 'Premium', days: 7, price: 350, icon: Crown },
];

const DeliverySelector = ({ selected, onSelect }) => {
    const getEstimatedDate = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
            <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3E9F8] text-[#6A2385]">
                    <CalendarDays size={18} />
                </span>
                <div className="min-w-0">
                    <h3 className="text-[15px] font-bold leading-tight text-[#1A1523]">Delivery Speed</h3>
                    <p className="text-[11.5px] text-gray-500">When do you need it?</p>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
                {options.map((opt) => {
                    const isSelected = selected === opt.id;
                    const Icon = opt.icon;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => onSelect(opt.id)}
                            className={cn(
                                'relative flex flex-col items-center rounded-2xl px-1.5 py-3 text-center transition-all cursor-pointer',
                                isSelected ? 'bg-[#FBF7FD] ring-2 ring-[#6A2385]' : 'bg-white ring-1 ring-[#EFE8F4] hover:ring-[#D9C2E6]'
                            )}
                        >
                            {isSelected && (
                                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#6A2385] text-white">
                                    <Check size={12} strokeWidth={3} />
                                </span>
                            )}
                            {opt.badge && !isSelected && (
                                <span className="absolute -top-2 rounded-full bg-[#6A2385] px-1.5 py-0.5 text-[8px] font-bold text-white">{opt.badge}</span>
                            )}
                            <Icon size={20} className="text-[#6A2385]" />
                            <p className="mt-1.5 text-[13px] font-bold text-[#1A1523]">{opt.label}</p>
                            <p className="text-[11px] text-gray-500">{opt.days} Days · by {getEstimatedDate(opt.days)}</p>
                            <p className={cn('mt-1 text-[12.5px] font-bold', opt.price > 0 ? 'text-[#5A1A78]' : 'text-emerald-600')}>
                                {opt.price > 0 ? `+ ₹${opt.price}` : 'FREE'}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DeliverySelector;
