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
        className="group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[3px] py-2"
    >
        {/* short bar on the top edge marks the active tab */}
        {active && (
            <motion.span
                layoutId="customerBottomNavBar"
                className="absolute top-0 h-[3px] w-6 rounded-b-full bg-[#843D9B]"
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            />
        )}
        <motion.span whileTap={{ scale: 0.85 }} className="flex">
            <Icon
                size={20}
                strokeWidth={active ? 2.3 : 1.8}
                className={`transition-colors duration-200 ${active ? 'text-[#843D9B]' : 'text-[#9A93A3] group-hover:text-[#5E5768]'}`}
            />
        </motion.span>
        <span className={`truncate text-[10.5px] leading-none ${active ? 'font-semibold text-[#843D9B]' : 'font-medium text-[#9A93A3]'}`}>
            {label}
        </span>
    </Link>
);

/** Raised round button in the middle of the bar (the main action). */
const CenterItem = ({ to, icon: Icon, label, active }) => (
    <Link
        to={to}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-[3px] pb-2"
    >
        <motion.span
            whileTap={{ scale: 0.9 }}
            className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-white ring-4 ring-white transition-shadow ${
                active
                    ? 'bg-gradient-to-br from-[#A055B8] to-[#6A2C80] shadow-[0_8px_18px_-6px_rgba(106,44,128,0.7)]'
                    : 'bg-gradient-to-br from-[#9A4DB3] to-[#7A3592] shadow-[0_6px_14px_-6px_rgba(106,44,128,0.55)]'
            }`}
        >
            <Icon size={21} strokeWidth={2.2} />
        </motion.span>
        <span className={`text-[10.5px] leading-none ${active ? 'font-semibold text-[#843D9B]' : 'font-medium text-[#5E5768]'}`}>
            {label}
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
            className="fixed inset-x-0 bottom-0 z-50 border-t border-[#EFEAF3] bg-white/95 shadow-[0_-6px_20px_-14px_rgba(42,15,56,0.25)] backdrop-blur-md md:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="mx-auto flex h-[58px] max-w-md items-stretch px-1">
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
