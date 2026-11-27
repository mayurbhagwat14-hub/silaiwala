import React from 'react';
import HomeHeader from '../components/HomeHeader';
import HomeHero from '../components/home/HomeHero';
import CategoryRail from '../components/home/CategoryRail';
import PopularServices from '../components/home/PopularServices';
import { ReadymadeCollections, FabricStore } from '../components/home/ShopCollections';
import FeaturedTailors from '../components/home/FeaturedTailors';
import BulkOrderPromo from '../components/home/BulkOrderPromo';
import HomeBottomSections from '../components/home/HomeBottomSections';
import BottomNav from '../components/BottomNav';

const Home = () => (
    <div className="min-h-screen bg-white pb-32 font-sans selection:bg-[#843D9B] selection:text-white md:pb-8">
        {/* 1. Location, notifications, profile & search */}
        <HomeHeader />

        <div className="mx-auto max-w-5xl">
            {/* 2. Banner carousel (admin "Home Page - Top Carousel" banners) */}
            <HomeHero />

            {/* 3. Service shortcuts */}
            <CategoryRail />

            {/* 4. Admin service categories */}
            <PopularServices />

            {/* 5. Store: readymade categories, then fabric categories (hidden when empty) */}
            <ReadymadeCollections />
            <FabricStore />

            {/* 6. Tailors around the selected location */}
            <FeaturedTailors />

            {/* 7. Bulk / event orders promo */}
            <BulkOrderPromo />

            {/* 8. How it works, doorstep tailoring, trending designs, reviews, partner & suggest a tailor */}
            <HomeBottomSections />
        </div>

        <BottomNav />
    </div>
);

export default Home;
