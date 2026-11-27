import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Layers } from 'lucide-react';
import api from '../../../../utils/api';
import { getImageUrl } from '../../../../utils/imageUrl';
import { SectionHeader } from './PopularServices';

const titleCase = (str) => String(str).trim().toLowerCase().replace(/(^|[\s/&(-])([a-z])/g, (m, p, c) => p + c.toUpperCase());

/**
 * Admin-managed home shelves: one tile per active category from Admin → Store → Categories
 * (name + image set there). Readymade = categories of type "Readymade (Store Item)",
 * Fabric = type "Fabric (Product)". Hidden when the admin has no such categories.
 */
const useCategories = (types) => {
    const [tiles, setTiles] = useState([]);
    useEffect(() => {
        let alive = true;
        api.get('/products/categories', { params: { type: types, exact: true } })
            .then((res) => {
                const list = (res.data?.data || [])
                    .filter((c) => c?.name && c.isActive !== false)
                    .map((c) => ({ id: c._id, name: titleCase(c.name), image: c.image ? getImageUrl(c.image) : '' }));
                if (alive) setTiles(list);
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [types]);
    return tiles;
};

const storeLink = (type, tile) => {
    const params = new URLSearchParams();
    if (type === 'fabric') params.set('type', 'fabric');
    params.set('category', tile.id);
    params.set('categoryName', tile.name);
    return `/user/store?${params.toString()}`;
};

const TileImage = ({ tile, className }) => (
    tile.image ? (
        <img src={tile.image} alt="" loading="lazy" className={`h-full w-full object-cover ${className || ''}`} />
    ) : (
        <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#843D9B] to-[#4A1560] text-2xl font-semibold text-white/40">
            {tile.name.charAt(0)}
        </span>
    )
);

export const ReadymadeCollections = () => {
    const tiles = useCategories('store_item');
    if (!tiles.length) return null;
    return (
        <section className="mt-6">
            <SectionHeader title="Readymade Collections" subtitle="Shop ready-to-wear suits, kurtis, co-ord sets & more" to="/user/store" icon={ShoppingBag} />
            <div className="no-scrollbar flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 md:px-6">
                {tiles.map((t) => (
                    <Link
                        key={t.id}
                        to={storeLink('store_item', t)}
                        className="flex w-[92px] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_8px_20px_-14px_rgba(42,15,56,0.6)] ring-1 ring-[#EFE8F4] sm:w-[130px]"
                    >
                        <span className="block aspect-[4/5] overflow-hidden bg-[#F6EEFA]">
                            <TileImage tile={t} className="object-top" />
                        </span>
                        <span className="truncate px-1.5 py-1.5 text-center text-[11.5px] font-semibold text-[#1A1523]">{t.name}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export const FabricStore = () => {
    const tiles = useCategories('product,fabric');
    if (!tiles.length) return null;
    return (
        <section className="mt-6">
            <SectionHeader title="Fabric Store" subtitle="Explore premium fabrics for your custom designs" to="/user/store?type=fabric" icon={Layers} />
            <div className="no-scrollbar flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 md:px-6">
                {tiles.map((t) => (
                    <Link
                        key={t.id}
                        to={storeLink('fabric', t)}
                        className="flex w-[84px] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_8px_20px_-14px_rgba(42,15,56,0.6)] ring-1 ring-[#EFE8F4] sm:w-[120px]"
                    >
                        <span className="block aspect-square overflow-hidden bg-[#F6EEFA]">
                            <TileImage tile={t} />
                        </span>
                        <span className="truncate px-1.5 py-1.5 text-center text-[11.5px] font-semibold text-[#1A1523]">{t.name}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
};
