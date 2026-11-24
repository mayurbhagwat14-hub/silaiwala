import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const SERIF = "'Playfair Display', Georgia, serif";

/** Promo strip for group / event stitching: silk photo on the left, serif headline, "Learn More" pill. */
const BulkOrderPromo = () => (
    <section className="mt-5 px-4 md:px-6">
        <Link
            to="/user/bulk-order"
            className="relative flex h-[92px] items-center overflow-hidden rounded-[18px] bg-gradient-to-r from-[#5A1A78] via-[#6A2385] to-[#4A1560] shadow-[0_14px_28px_-18px_rgba(74,21,96,0.9)] sm:h-[110px]"
        >
            <img
                src="/images/home/measure-tape.jpg"
                alt=""
                loading="lazy"
                className="absolute inset-y-0 left-0 h-full w-[34%] object-cover"
                style={{
                    WebkitMaskImage: 'linear-gradient(90deg, #000 55%, transparent 100%)',
                    maskImage: 'linear-gradient(90deg, #000 55%, transparent 100%)',
                }}
            />
            <span className="relative ml-[30%] min-w-0 flex-1 text-center">
                <span
                    className="block text-[15.5px] font-medium italic leading-[1.15] text-white sm:text-[20px]"
                    style={{ fontFamily: SERIF }}
                >
                    Wedding or Event?
                    <br />
                    Stitch for the Whole Group
                </span>
                <span className="mt-1 block text-[9.5px] font-medium text-white/85 sm:text-[11px]">
                    Bulk Orders • Matching Outfits • Best Price
                </span>
            </span>
            <span className="relative mr-3 flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1A1523] shadow-md sm:mr-5 sm:text-[12.5px]">
                Learn More <ArrowRight size={13} />
            </span>
        </Link>
    </section>
);

export default BulkOrderPromo;
