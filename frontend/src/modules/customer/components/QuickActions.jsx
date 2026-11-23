import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/** One compact strip with three shortcuts, split by hairline dividers. */
const QuickActions = () => {
    const navigate = useNavigate();

    const actions = [
        {
            title: 'Upload design',
            subtitle: 'from Pinterest',
            Icon: ImageIcon,
            onClick: () => window.open('https://www.pinterest.com/', '_blank', 'noopener,noreferrer'),
        },
        {
            title: 'Repeat',
            subtitle: 'last order',
            Icon: RotateCcw,
            onClick: () => navigate('/user/orders'),
        },
        {
            title: 'Home',
            subtitle: 'dashboard',
            Icon: LayoutGrid,
            onClick: () => navigate('/user'),
        },
    ];

    return (
        <div className="px-4 md:px-6 lg:px-8 mt-1 mb-4">
            <div className="grid grid-cols-3 divide-x divide-[#F0EFF2] rounded-[20px] bg-white ring-1 ring-[#ECEAEF] shadow-[0_12px_26px_-22px_rgba(20,16,26,0.45)]">
                {actions.map(({ title, subtitle, Icon, onClick }) => (
                    <motion.button
                        key={title}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={onClick}
                        className="group flex min-w-0 flex-col items-center gap-1.5 px-1.5 py-3"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F3F6] text-[#1A1523] transition-colors group-hover:bg-[#ECEAEF]">
                            <Icon size={17} strokeWidth={2} />
                        </span>
                        <span className="flex min-w-0 max-w-full flex-col items-center">
                            <span className="truncate text-[12px] font-semibold leading-tight text-[#1A1523]">{title}</span>
                            <span className="truncate text-[10px] font-medium leading-tight text-[#8C8794]">{subtitle}</span>
                        </span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;
