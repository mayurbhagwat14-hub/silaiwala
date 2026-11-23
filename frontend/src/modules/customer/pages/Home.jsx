import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Wand2 } from 'lucide-react';
import api from '../../../utils/api';
// Top part (original design)
import HomeHeader from '../components/HomeHeader';
import PromoBanner from '../components/PromoBanner';
import AIMeasurementCard from '../components/AIMeasurementCard';
import QuickActions from '../components/QuickActions';
import ServiceGrid from '../components/ServiceGrid';
// Bottom part (new design)
import PopularTailors from '../components/PopularTailors';
import ExploreBento from '../components/home/ExploreBento';
import BottomNav from '../components/BottomNav';
import { EASE } from '../components/home/homeTokens';

import useAuthStore from '../../../store/authStore';

const Home = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const [activeCustomDesign, setActiveCustomDesign] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) return;
        api.get('/custom-designs')
            .then((res) => {
                if (!res.data?.success) return;
                const active = (res.data.data || []).find(
                    (d) => !['completed', 'cancelled', 'rejected'].includes((d.status || '').toLowerCase())
                );
                if (active) setActiveCustomDesign(active);
            })
            .catch((error) => console.error('Failed to fetch custom designs', error));
    }, [isAuthenticated]);

    return (
        <div className="min-h-screen bg-[#F7F8FC] pb-24 md:pb-8 font-sans selection:bg-[#843D9B] selection:text-white">
            <div className="fixed inset-0 bg-white -z-10" />

            {/* 1. Header & Location */}
            <HomeHeader />

            {/* White Overlapping Container — sits cleanly below header */}
            <div className="bg-white relative z-0 pt-2">
                {/* ── Top part: original design ── */}
                {/* 2. Hero Banner */}
                <PromoBanner />

                {/* 3. AI Measurement */}
                <AIMeasurementCard />

                {/* 4. Quick Actions */}
                <QuickActions />

                {/* 5. What We Offer */}
                <ServiceGrid />

                {/* ── Bottom part: new design ── */}
                <div className="mx-auto max-w-5xl space-y-7 pb-4 pt-3">
                    {activeCustomDesign && (
                        <div className="px-4 md:px-6">
                            <motion.button
                                type="button"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
                                whileTap={{ scale: 0.985 }}
                                onClick={() => navigate('/user/orders')}
                                className="flex w-full items-center gap-3 rounded-[22px] bg-white p-4 text-left ring-1 ring-[#ECEAEF] shadow-[0_14px_30px_-24px_rgba(20,16,26,0.45)]"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4F3F6] text-[#1A1523]">
                                    <Wand2 size={19} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[14px] font-bold leading-tight text-[#1A1523]">
                                        Custom design {activeCustomDesign.status === 'quote_received' ? '· quote received' : 'update'}
                                    </span>
                                    <span className="mt-0.5 block text-[12px] leading-snug text-[#6B6575]">
                                        {activeCustomDesign.status === 'quote_received'
                                            ? `Your tailor quoted ₹${activeCustomDesign.quote?.price || 0}. Tap to review & pay.`
                                            : `Status: ${(activeCustomDesign.status || 'pending').replace(/_/g, ' ')}`}
                                    </span>
                                </span>
                                <ChevronRight size={18} className="shrink-0 text-[#B5ADBF]" />
                            </motion.button>
                        </div>
                    )}

                    <PopularTailors />
                    <ExploreBento />
                </div>

                {/* Bottom Navigation */}
                <BottomNav />
            </div>
        </div>
    );
};

export default Home;
