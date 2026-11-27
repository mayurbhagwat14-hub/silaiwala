import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight, Shirt, UserCheck, Gift, Home as HomeIcon, Star, Heart, Store, MapPin, X, Loader2, Send, Scissors,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../utils/api';
import { getImageUrl } from '../../../../utils/imageUrl';
import useAuthStore from '../../../../store/authStore';

const SANS = "'Plus Jakarta Sans', sans-serif";
const CARD = 'rounded-[18px] bg-white shadow-[0_8px_22px_-16px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]';

const realImage = (src) => (src && src !== 'no-photo.jpg' ? getImageUrl(src) : '');

const timeAgo = (date) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (!Number.isFinite(days)) return '';
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months < 12 ? `${months} mo ago` : `${Math.floor(months / 12)} yr ago`;
};

const Head = ({ title, icon, to, linkLabel }) => (
    <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[17px] font-bold text-[#1A1523]" style={{ fontFamily: SANS }}>
            {title} {icon}
        </h2>
        {to && (
            <Link to={to} className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[#6A2385]">
                {linkLabel} <ArrowRight size={14} />
            </Link>
        )}
    </div>
);

/** 1. How it works — three steps. */
const HowItWorks = () => {
    const steps = [
        { icon: Shirt, title: 'Choose', sub: 'Your Service' },
        { icon: UserCheck, title: 'Select a', sub: 'Verified Tailor' },
        { icon: Gift, title: 'Get Your', sub: 'Perfect Fit Delivered' },
    ];
    return (
        <section className="px-4 md:px-6">
            <div className="text-center">
                <h2 className="text-[18px] font-bold text-[#1A1523]" style={{ fontFamily: SANS }}>How Sewzella Works</h2>
                <p className="text-[12px] text-gray-500">Get your perfect outfit in 3 simple steps</p>
            </div>
            <div className={`mt-3 flex items-center justify-between bg-gradient-to-r from-[#FBF7FD] to-[#F4EAF9] px-3 py-3.5 ${CARD}`}>
                {steps.map(({ icon: Icon, title, sub }, i) => (
                    <React.Fragment key={sub}>
                        {i > 0 && <ArrowRight size={16} className="shrink-0 text-[#B98FCF]" />}
                        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#6A2385] shadow-sm ring-1 ring-[#EFE8F4]">
                                <Icon size={19} strokeWidth={1.8} />
                            </span>
                            <p className="mt-1.5 text-[12px] font-bold leading-tight text-[#1A1523]">{title}</p>
                            <p className="text-[11px] font-semibold leading-tight text-[#1A1523]">{sub}</p>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </section>
    );
};

/** 2. Doorstep tailoring promo — home measurement is chosen while booking a service. */
const DoorstepPromo = () => (
    <section className="px-4 md:px-6">
        <Link to="/user/services" className={`relative flex h-[112px] items-center overflow-hidden bg-gradient-to-r from-[#F8F1FB] to-[#EFE2F7] ${CARD}`}>
            <img
                src="/images/home/banner-perfect-fit.jpg"
                alt=""
                loading="lazy"
                className="absolute inset-y-0 left-0 h-full w-[40%] object-cover"
                style={{ WebkitMaskImage: 'linear-gradient(90deg,#000 60%,transparent)', maskImage: 'linear-gradient(90deg,#000 60%,transparent)' }}
            />
            <div className="relative ml-[38%] min-w-0 flex-1 pr-3">
                <p className="flex items-center gap-1.5 text-[16px] font-bold text-[#5A1A78]" style={{ fontFamily: SANS }}>
                    <HomeIcon size={17} /> Doorstep Tailoring
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#4B4453]">Home Measurement • Fabric Pickup • Stitching • Doorstep Delivery</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] px-3.5 py-1.5 text-[11.5px] font-semibold text-white">
                    Book Home Visit <ArrowRight size={13} />
                </span>
            </div>
        </Link>
    </section>
);

/** 3. Trending designs — latest work photos uploaded by tailors. */
const TrendingDesigns = () => {
    const [items, setItems] = useState([]);
    useEffect(() => {
        let alive = true;
        api.get('/tailors/work-samples/feed')
            .then((res) => {
                if (!alive) return;
                setItems((res.data?.data || []).map((s) => ({
                    id: s._id,
                    title: s.title,
                    image: realImage(s.image || s.images?.[0]),
                    tailorId: s.tailor?._id,
                    shop: s.tailor?.shopName,
                })).filter((s) => s.image));
            })
            .catch(() => {});
        return () => { alive = false; };
    }, []);
    if (!items.length) return null;
    return (
        <section className="px-4 md:px-6">
            <Head title="Trending Designs" to="/user/tailors" linkLabel="Explore Tailors" />
            <p className="-mt-2 mb-2.5 text-[11.5px] text-gray-500">Latest work from tailors on Sewzella</p>
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6">
                {items.slice(0, 12).map((d) => (
                    <Link
                        key={d.id}
                        to={d.tailorId ? `/user/tailor/${d.tailorId}` : '/user/tailors'}
                        className="w-[92px] shrink-0 overflow-hidden rounded-xl ring-1 ring-[#EFE8F4]"
                        title={[d.title, d.shop].filter(Boolean).join(' · ')}
                    >
                        <img src={d.image} alt={d.title || 'Design'} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                    </Link>
                ))}
            </div>
        </section>
    );
};

/** 4. Loved by our customers — real recent 4-5 star tailor reviews. */
const CustomerLove = () => {
    const [reviews, setReviews] = useState([]);
    useEffect(() => {
        let alive = true;
        api.get('/reviews/featured', { params: { limit: 8 } })
            .then((res) => { if (alive) setReviews(res.data?.data || []); })
            .catch(() => {});
        return () => { alive = false; };
    }, []);
    if (!reviews.length) return null;
    return (
        <section className="px-4 md:px-6">
            <Head title="Loved by Our Customers" icon={<Heart size={16} className="fill-[#E64980] text-[#E64980]" />} />
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6">
                {reviews.map((r) => {
                    const photo = realImage(r.profileImage);
                    return (
                        <div key={r._id} className={`w-[230px] shrink-0 p-3 ${CARD}`}>
                            <div className="flex items-center gap-2.5">
                                {photo ? (
                                    <img src={photo} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                                ) : (
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#843D9B] to-[#4A1560] text-[13px] font-semibold text-white">
                                        {String(r.name || 'C').charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <div className="min-w-0">
                                    <p className="truncate text-[13px] font-bold text-[#1A1523]">{r.name}</p>
                                    <p className="flex items-center gap-1.5">
                                        <span className="flex">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <Star key={i} size={11} className={i <= Math.round(r.rating) ? 'fill-[#F5A623] text-[#F5A623]' : 'fill-gray-200 text-gray-200'} />
                                            ))}
                                        </span>
                                        <span className="text-[10.5px] text-gray-400">{timeAgo(r.createdAt)}</span>
                                    </p>
                                </div>
                            </div>
                            <p className="mt-2 line-clamp-3 text-[12px] leading-snug text-[#4B4453]">“{r.comment}”</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

/** 5. Become a partner — opens the tailor registration. */
const PartnerPromo = () => (
    <section className="px-4 md:px-6">
        <div className={`flex items-center gap-3 bg-gradient-to-r from-[#F8F1FB] to-[#F1E4F7] p-3.5 ${CARD}`}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#6A2385] shadow-sm">
                <Store size={24} strokeWidth={1.7} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-bold text-[#5A1A78]" style={{ fontFamily: SANS }}>Become a Sewzella Partner</p>
                <p className="text-[11.5px] leading-snug text-[#4B4453]">Join our network of verified tailors &amp; boutiques and grow your business online.</p>
            </div>
            <Link to="/partner/signup" className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] px-3 py-2 text-[11.5px] font-semibold text-white">
                Register as Tailor <ArrowRight size={13} />
            </Link>
        </div>
    </section>
);

/** 6. Suggest a tailor — sends a support ticket the admin sees under Support. */
const SuggestTailor = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [form, setForm] = useState({ shop: '', area: '', phone: '', note: '', name: '', email: '' });

    const openForm = () => {
        setForm((f) => ({ ...f, name: f.name || user?.name || '', email: f.email || user?.email || '' }));
        setOpen(true);
    };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        const shop = form.shop.trim();
        const area = form.area.trim();
        const name = form.name.trim();
        const email = form.email.trim();
        if (!shop || !area) { toast.error('Add the tailor/boutique name and area'); return; }
        if (!name || !/^\S+@\S+\.\S+$/.test(email)) { toast.error('Add your name and a valid email'); return; }
        const phone = form.phone.replace(/\D/g, '');
        if (phone && phone.length !== 10) { toast.error('Tailor phone should be 10 digits'); return; }
        setSending(true);
        try {
            await api.post('/support', {
                name,
                email,
                subject: `Tailor suggestion: ${shop}`,
                message: [
                    `Tailor / boutique: ${shop}`,
                    `Area: ${area}`,
                    phone && `Phone: ${phone}`,
                    form.note.trim() && `Note: ${form.note.trim()}`,
                ].filter(Boolean).join('\n'),
            });
            toast.success('Thanks! We will reach out to them.');
            setOpen(false);
            setForm((f) => ({ ...f, shop: '', area: '', phone: '', note: '' }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const input = 'w-full rounded-xl bg-white px-3 py-2.5 text-[13px] text-[#1A1523] outline-none ring-1 ring-[#E4D6EC] placeholder:text-gray-400 focus:ring-2 focus:ring-[#B98FCF]';

    return (
        <section className="px-4 md:px-6">
            <div className={`flex items-center gap-3 p-3.5 ${CARD}`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6EEFA] text-[#6A2385]">
                    <MapPin size={24} strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-bold text-[#5A1A78]" style={{ fontFamily: SANS }}>Suggest a Tailor or Boutique</p>
                    <p className="text-[11.5px] leading-snug text-[#4B4453]">Know a great tailor or boutique? Help us grow the Sewzella network in your area.</p>
                </div>
                <button type="button" onClick={openForm} className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-[11.5px] font-semibold text-[#6A2385] ring-1 ring-[#6A2385]">
                    Suggest Now <ArrowRight size={13} />
                </button>
            </div>

            {open && (
                <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
                    <form
                        onSubmit={submit}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-t-[24px] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-[24px]"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <p className="flex items-center gap-2 text-[16px] font-bold text-[#1A1523]"><Scissors size={18} className="text-[#6A2385]" /> Suggest a Tailor</p>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-2.5">
                            <input className={input} placeholder="Tailor / boutique name *" value={form.shop} onChange={set('shop')} maxLength={80} />
                            <input className={input} placeholder="Area / city *" value={form.area} onChange={set('area')} maxLength={80} />
                            <input className={input} placeholder="Their phone (optional)" inputMode="numeric" value={form.phone} onChange={set('phone')} maxLength={14} />
                            <textarea className={`${input} resize-none`} rows={2} placeholder="Why do you recommend them? (optional)" value={form.note} onChange={set('note')} maxLength={300} />
                            <div className="grid grid-cols-2 gap-2.5">
                                <input className={input} placeholder="Your name *" value={form.name} onChange={set('name')} maxLength={60} />
                                <input className={input} placeholder="Your email *" type="email" value={form.email} onChange={set('email')} maxLength={80} />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={sending}
                            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7B2D93] to-[#5A1A78] text-[14px] font-bold text-white disabled:opacity-60"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />} Send Suggestion
                        </button>
                        {!user && (
                            <button type="button" onClick={() => navigate('/user/login')} className="mt-2 w-full text-center text-[11.5px] text-gray-500">
                                Have an account? Log in to fill your details automatically
                            </button>
                        )}
                    </form>
                </div>
            )}
        </section>
    );
};

/** Bottom of the customer home page. Sections with no data (designs, reviews) hide themselves. */
const HomeBottomSections = () => (
    <div className="mt-6 space-y-6">
        <HowItWorks />
        <DoorstepPromo />
        <TrendingDesigns />
        <CustomerLove />
        <PartnerPromo />
        <SuggestTailor />
    </div>
);

export default HomeBottomSections;
