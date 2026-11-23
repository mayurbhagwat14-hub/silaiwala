import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Scissors, ClipboardList, Store, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Which routes light up each tab.
const ACTIVE_MATCHERS = {
    '/user': (p) =>
        p === '/user' || p === '/user/' ||
        ['/user/services', '/user/what-we-offer', '/user/embellishments', '/user/embroidery'].some((r) => p.startsWith(r)),
    '/user/tailors': (p) => p.startsWith('/user/tailor'),
    '/user/orders': (p) =>
        ['/user/orders', '/user/alteration', '/user/custom-design', '/user/bulk-order'].some((r) => p.startsWith(r)),
    '/user/store': (p) => p.startsWith('/user/store') || p.startsWith('/user/fabric'),
    '/user/profile': (p) =>
        [
            '/user/profile', '/user/wallet', '/user/refer', '/user/coupons', '/user/language', '/user/notifications',
            '/user/payments', '/user/faq', '/user/support', '/user/activity', '/user/wishlist', '/user/reviews',
            '/user/membership', '/user/loyalty', '/user/legal',
        ].some((r) => p.startsWith(r)),
};

const isActivePath = (to, path) => (ACTIVE_MATCHERS[to] ? ACTIVE_MATCHERS[to](path) : path === to || path.startsWith(`${to}/`));

const NavItem = ({ to, icon: Icon, label, active }) => (
    <Link
        to={to}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className="group flex min-w-0 flex-1 flex-col items-center pb-1.5 pt-2.5"
    >
        <motion.span whileTap={{ scale: 0.85 }} className="flex h-7 items-center justify-center">
            <Icon
                size={22}
                strokeWidth={active ? 2.3 : 1.8}
                className={`transition-colors duration-200 ${active ? 'text-[#843D9B]' : 'text-[#8E8699] group-hover:text-[#5E5768]'}`}
            />
        </motion.span>
        <span className={`mt-1 truncate text-[11px] leading-none transition-colors ${active ? 'font-semibold text-[#843D9B]' : 'font-medium text-[#8E8699]'}`}>
            {label}
        </span>
        <span className="mt-1 flex h-1.5 items-center">
            {active && (
                <motion.span
                    layoutId="customerBottomNavDot"
                    className="h-1.5 w-1.5 rounded-full bg-[#843D9B]"
                    transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                />
            )}
        </span>
    </Link>
);

/** Raised round button in the middle of the bar (the main action). */
const CenterItem = ({ to, icon: Icon, label, active }) => (
    <Link
        to={to}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className="relative flex min-w-0 flex-1 flex-col items-center pb-1.5"
    >
        <motion.span
            whileTap={{ scale: 0.9 }}
            className="-mt-7 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-br from-[#A055B8] to-[#6A2C80] text-white shadow-[0_10px_22px_-6px_rgba(106,44,128,0.65)] ring-[5px] ring-white"
        >
            <Icon size={24} strokeWidth={2.2} />
        </motion.span>
        <span className={`mt-1.5 text-[11px] leading-none ${active ? 'font-semibold text-[#843D9B]' : 'font-semibold text-[#5E5768]'}`}>
            {label}
        </span>
        <span className="mt-1 flex h-1.5 items-center">
            {active && <motion.span layoutId="customerBottomNavDot" className="h-1.5 w-1.5 rounded-full bg-[#843D9B]" />}
        </span>
    </Link>
);

const BottomNav = () => {
    const { pathname } = useLocation();
    const items = [
        { to: '/user', icon: Home, label: 'Home' },
        { to: '/user/tailors', icon: Scissors, label: 'Tailors' },
        { to: '/user/orders', icon: ClipboardList, label: 'Orders', center: true },
        { to: '/user/store', icon: Store, label: 'Store' },
        { to: '/user/profile', icon: User, label: 'Profile' },
    ];

    return (
        <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[26px] bg-white shadow-[0_-10px_30px_-12px_rgba(42,15,56,0.22)] md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="mx-auto flex max-w-md items-end px-2">
                {items.map((item) => {
                    const active = isActivePath(item.to, pathname);
                    return item.center ? (
                        <CenterItem key={item.to} {...item} active={active} />
                    ) : (
                        <NavItem key={item.to} {...item} active={active} />
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
