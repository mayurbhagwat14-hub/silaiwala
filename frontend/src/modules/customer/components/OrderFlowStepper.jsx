import React from 'react';
import { Check, Scissors, PencilRuler, Ruler, ClipboardCheck } from 'lucide-react';

/** Stitching booking flow shared by the service configuration and checkout summary pages. */
// `sub` while the step is pending / active, `doneSub` once it is finished
const STEPS = [
    { label: 'Service', sub: 'Selected', doneSub: 'Selected', icon: Scissors },
    { label: 'Configure', sub: 'Add Details', doneSub: 'Customized', icon: PencilRuler },
    { label: 'Measurements', sub: 'Provide Size', doneSub: 'Provided', icon: Ruler },
    { label: 'Review', sub: 'Place Order', doneSub: 'Placed', icon: ClipboardCheck },
];

/** `current` = index of the active step (0-3); earlier steps show as done. */
const OrderFlowStepper = ({ current = 0, className = '' }) => (
    <div className={`rounded-[20px] bg-white px-3 py-3 shadow-[0_10px_28px_-18px_rgba(42,15,56,0.55)] ring-1 ring-[#EFE8F4] ${className}`}>
        <div className="flex items-start">
            {STEPS.map((step, i) => {
                const done = i < current;
                const active = i === current;
                const Icon = step.icon;
                return (
                    <React.Fragment key={step.label}>
                        {i > 0 && (
                            <span className={`mt-[17px] h-[2px] min-w-[10px] flex-1 rounded-full ${i <= current ? 'bg-[#6A2385]' : 'border-t-2 border-dashed border-[#DCCBE6] bg-transparent'}`} />
                        )}
                        <div className="flex w-[68px] shrink-0 flex-col items-center text-center sm:w-[84px]">
                            <span
                                className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold ${
                                    done
                                        ? 'bg-gradient-to-br from-[#8A3FA6] to-[#5A1A78] text-white'
                                        : active
                                            ? 'bg-gradient-to-br from-[#8A3FA6] to-[#5A1A78] text-white ring-4 ring-[#EBDDF3]'
                                            : 'bg-white text-gray-400 ring-2 ring-[#E4D6EC]'
                                }`}
                            >
                                {done ? <Check size={16} strokeWidth={3} /> : active ? <Icon size={16} /> : i + 1}
                            </span>
                            <span className={`mt-1.5 whitespace-nowrap text-[11.5px] leading-tight ${done || active ? 'font-bold text-[#1A1523]' : 'font-semibold text-gray-400'}`}>
                                {step.label}
                            </span>
                            <span className={`whitespace-nowrap text-[9.5px] leading-tight ${active ? 'font-semibold text-[#6A2385]' : 'text-gray-400'}`}>
                                {done ? step.doneSub : step.sub}
                            </span>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    </div>
);

export default OrderFlowStepper;
