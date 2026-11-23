import React from 'react';
import HomeHeader from '../components/HomeHeader';
import HomeHero from '../components/home/HomeHero';
import CategoryRail from '../components/home/CategoryRail';
import ExploreMore from '../components/home/ExploreMore';
import PopularTailors from '../components/PopularTailors';
import BottomNav from '../components/BottomNav';

const Home = () => (
    <div className="min-h-screen bg-white pb-28 font-sans selection:bg-[#843D9B] selection:text-white md:pb-8">
        {/* 1. Brand, location & search */}
        <HomeHeader />

        {/* 2. Hero */}
        <HomeHero />

        {/* 3. Categories */}
        <CategoryRail />

        <div className="mx-auto max-w-5xl space-y-7 pt-3">
            {/* 4. Explore more shortcuts */}
            <ExploreMore />

            {/* 5. Featured tailors with filter chips */}
            <PopularTailors />
        </div>

        <BottomNav />
    </div>
);

export default Home;
