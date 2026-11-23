import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shirt, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { motion } from 'framer-motion';

const NavItem = ({ to, icon, label }) => {
    const Icon = icon;
    const location = useLocation();
    
    let isActive = false;
    const path = location.pathname;

    if (to === '/user') {
        isActive = path === '/user' || 
                   path === '/user/' || 
                   path.startsWith('/user/services') || 
                   path.startsWith('/user/what-we-offer') || 
                   path.startsWith('/user/embellishments') || 
                   path.startsWith('/user/embroidery') || 
                   path.startsWith('/user/tailor');
    } else if (to === '/user/store') {
        isActive = path.startsWith('/user/store') || 
                   path.startsWith('/user/fabric');
    } else if (to === '/user/orders') {
        isActive = path.startsWith('/user/orders') || 
                   path.startsWith('/user/alteration') || 
                   path.startsWith('/user/custom-design') || 
                   path.startsWith('/user/bulk-order');
    } else if (to === '/user/profile') {
        isActive = path.startsWith('/user/profile') || 
                   path.startsWith('/user/wallet') || 
                   path.startsWith('/user/refer') || 
                   path.startsWith('/user/coupons') || 
                   path.startsWith('/user/language') || 
                   path.startsWith('/user/notifications') || 
                   path.startsWith('/user/payments') || 
                   path.startsWith('/user/faq') || 
                   path.startsWith('/user/support') || 
                   path.startsWith('/user/activity') || 
                   path.startsWith('/user/wishlist') || 
                   path.startsWith('/user/reviews') || 
                   path.startsWith('/user/membership') || 
                   path.startsWith('/user/loyalty');
    } else {
        isActive = path === to || path.startsWith(to + '/');
    }

    return (
        <Link
            to={to}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className="group flex min-w-0 flex-1 flex-col items-center gap-1 pb-1 pt-2"
        >
            {/* Material-style indicator: soft pill behind the active icon */}
            <motion.span
                whileTap={{ scale: 0.88 }}
                className="relative isolate flex h-8 w-14 items-center justify-center"
            >
                {isActive && (
                    <motion.span
                        layoutId="customerBottomNavActive"
                        className="absolute inset-0 -z-10 rounded-full bg-[#F1E4F7]"
                        transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    />
                )}
                <Icon
                    size={21}
                    strokeWidth={isActive ? 2.3 : 1.8}
                    className={`transition-colors duration-200 ${
                        isActive ? 'text-[#843D9B]' : 'text-[#8E8699] group-hover:text-[#5E5768]'
                    }`}
                />
            </motion.span>
            <span
                className={`truncate text-[11px] leading-none transition-colors duration-200 ${
                    isActive ? 'font-bold text-[#843D9B]' : 'font-medium text-[#8E8699]'
                }`}
            >
                {label}
            </span>
        </Link>
    );
};

const BottomNav = () => {
    return (
        <nav
            aria-label="Main"
            className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-[#EEE9F2] bg-white/95 shadow-[0_-6px_20px_-12px_rgba(42,15,56,0.18)] backdrop-blur-xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}
        >
            <div className="mx-auto flex max-w-md items-stretch px-2">
                <NavItem to="/user" icon={Shirt} label="Services" />
                <NavItem to="/user/store" icon={ShoppingBag} label="Store" />
                <NavItem to="/user/orders" icon={ClipboardList} label="Orders" />
                <NavItem to="/user/profile" icon={User} label="Profile" />
            </div>
        </nav>
    );
};

export default BottomNav;
