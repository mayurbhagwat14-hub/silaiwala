import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, CalendarDays, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Which routes light up each tab.
const ACTIVE_MATCHERS = {
    '/user': (p) => p === '/user' || p === '/user/',
    '/user/services': (p) =>
        ['/user/services', '/user/what-we-offer', '/user/embellishments', '/user/embroidery', '/user/store', '/user/fabric'].some((r) =>
            p.startsWith(r),
        ),
    '/user/tailors': (p) => p.startsWith('/user/tailor') || p.startsWith('/user/checkout'),
    '/user/orders': (p) =>
        ['/user/orders', '/user/alteration', '/user/custom-design', '/user/bulk-order'].some((r) => p.startsWith(r)),
    '/user/profile': (p) =>
        [
            '/user/profile', '/user/wallet', '/user/refer', '/user/coupons', '/user/language', '/user/notifications',
            '/user/payments', '/user/faq', '/user/support', '/user/activity', '/user/wishlist', '/user/reviews',
            '/user/membership', '/user/loyalty', '/user/legal',
        ].some((r) => p.startsWith(r)),
};

const isActivePath = (to, path) => (ACTIVE_MATCHERS[to] ? ACTIVE_MATCHERS[to](path) : path === to || path.startsWith(`${to}/`));

const ITEMS = [
    { to: '/user', icon: Home, label: 'Home' },
    { to: '/user/services', icon: LayoutGrid, label: 'Categories' },
    { to: '/user/tailors', icon: CalendarDays, label: 'Book Service' },
    { to: '/user/orders', icon: ShoppingBag, label: 'Orders' },
    { to: '/user/profile', icon: User, label: 'Profile' },
];

/** Floating rounded tab bar; the active tab becomes a filled purple pill. */
const BottomNav = () => {
    const { pathname } = useLocation();

    return (
        <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-50 px-2.5 md:hidden"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
        >
            <div className="mx-auto flex h-[64px] max-w-md items-stretch rounded-[26px] bg-white px-1 shadow-[0_-4px_24px_-8px_rgba(42,15,56,0.25)] ring-1 ring-[#F1ECF4]">
                {ITEMS.map(({ to, icon: NavIcon, label }) => {
                    const active = isActivePath(to, pathname);
                    return (
                        <Link
                            key={to}
                            to={to}
                            aria-label={label}
                            aria-current={active ? 'page' : undefined}
                            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pb-1"
                        >
                            <NavIcon
                                size={22}
                                strokeWidth={active ? 2 : 1.6}
                                className={active ? 'fill-[#5A1A78]/15 text-[#5A1A78]' : 'text-[#2A1F33]'}
                            />
                            <span
                                className={`max-w-full truncate px-0.5 text-[10px] leading-none sm:text-[11px] ${
                                    active ? 'font-semibold text-[#5A1A78]' : 'font-medium text-[#2A1F33]'
                                }`}
                            >
                                {label}
                            </span>
                            {active && (
                                <motion.span
                                    layoutId="customerBottomNavBar"
                                    className="absolute bottom-1.5 h-[3px] w-7 rounded-full bg-[#5A1A78]"
                                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
