import React from 'react';
import HomeHeader from '../components/HomeHeader';
import HomeHero from '../components/home/HomeHero';
import CategoryRail from '../components/home/CategoryRail';
import PopularServices from '../components/home/PopularServices';
import FeaturedTailors from '../components/home/FeaturedTailors';
import BulkOrderPromo from '../components/home/BulkOrderPromo';
import BottomNav from '../components/BottomNav';

const Home = () => (
    <div className="min-h-screen bg-white pb-32 font-sans selection:bg-[#843D9B] selection:text-white md:pb-8">
        {/* 1. Location, brand, home visit, profile & search */}
        <HomeHeader />

        <div className="mx-auto max-w-5xl">
            {/* 2. Banner carousel (admin "Home Page - Top Carousel" banners) */}
            <HomeHero />

            {/* 3. Service shortcuts */}
            <CategoryRail />

            {/* 4. Admin service categories */}
            <PopularServices />

            {/* 5. Tailors around the selected location */}
            <FeaturedTailors />

            {/* 6. Bulk / event orders promo */}
            <BulkOrderPromo />
        </div>

        <BottomNav />
    </div>
);

export default Home;
