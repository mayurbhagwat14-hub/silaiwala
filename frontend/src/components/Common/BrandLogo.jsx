import React from 'react';

/**
 * Sewzella mark (sewing machine) with the name beside it, for light backgrounds.
 * Images in /public/brand were made from the official logo with a transparent background:
 *   sewzella-mark.png — machine only, sewzella-logo.png — full stacked logo.
 */
const BrandLogo = ({ size = 'md', showTagline = true, className = '' }) => {
    const s = size === 'sm'
        ? { mark: 'h-8', name: 'text-[20px]', tag: 'text-[7.5px]' }
        : size === 'lg'
            ? { mark: 'h-14', name: 'text-[32px]', tag: 'text-[10px]' }
            : { mark: 'h-10', name: 'text-[25px]', tag: 'text-[8.5px]' };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <img src="/brand/sewzella-mark.png" alt="" aria-hidden="true" className={`${s.mark} w-auto shrink-0 object-contain`} />
            <div className="leading-none">
                <p className={`${s.name} font-semibold leading-none tracking-tight text-[#660882]`} style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    SewZella
                </p>
                {showTagline && (
                    <p className={`${s.tag} mt-1 font-semibold uppercase tracking-[0.18em] text-[#660882]/80`}>
                        The Future of Tailoring
                    </p>
                )}
            </div>
        </div>
    );
};

export default BrandLogo;
