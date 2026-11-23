import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Headphones, 
    Phone, 
    Mail, 
    Copy, 
    Check, 
    Clock, 
    PhoneCall,
    MessageCircle,
    ShieldCheck, 
    Sparkles, 
    Search, 
    X, 
    ChevronDown, 
    HelpCircle, 
    Scissors, 
    Ruler, 
    CreditCard, 
    RotateCcw, 
    Package, 
    CheckCircle2 
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import api from '../../../utils/api';
import useAuthStore from '../../../store/authStore';
import useBrandingStore from '../../../store/brandingStore';
import { openAdminWhatsApp } from '../../../utils/whatsapp';
import { sanitizeCmsHtml } from '../../../utils/formatHtml';

// Static categorized FAQs as fallback & instant render
const FALLBACK_FAQS = [
    {
        _id: 'faq-1',
        categoryTag: 'general',
        categoryLabel: 'General',
        title: 'What is Sewzella?',
        content: '<p>Sewzella is an all-in-one digital custom tailoring platform connecting you with verified master tailors, boutiques, and fashion designers. We manage doorstep fabric pickup, expert measurements, custom stitching, quality inspection, and doorstep delivery with a 100% Perfect Fit Guarantee.</p>'
    },
    {
        _id: 'faq-2',
        categoryTag: 'orders',
        categoryLabel: 'Orders & Delivery',
        title: 'How do I place an order on Sewzella?',
        content: '<p>Placing an order is simple and takes just 4 steps:</p><ol className="list-decimal ml-5 space-y-1.5 mt-2"><li><strong>Select Service:</strong> Choose your garment type (Kurti, Suit, Lehenga, Blouse, Shirt, Alteration, etc.).</li><li><strong>Customize Design:</strong> Pick your neck styles, sleeves, linings, and upload reference design photos.</li><li><strong>Choose Measurement:</strong> Schedule a doorstep executive visit, send a sample garment, or use saved profile.</li><li><strong>Confirm & Pay:</strong> Provide your pickup address and pay securely online or via COD.</li></ol>'
    },
    {
        _id: 'faq-3',
        categoryTag: 'orders',
        categoryLabel: 'Orders & Delivery',
        title: 'How can I track my order live?',
        content: '<p>You can follow every single stage in real-time under <strong>My Orders → Track Order</strong>. You will receive live status milestones: Fabric Picked Up, Received at Boutique, Cutting in Progress, Stitching, Quality Inspection, and Out for Delivery.</p>'
    },
    {
        _id: 'faq-4',
        categoryTag: 'orders',
        categoryLabel: 'Orders & Delivery',
        title: 'Do you offer doorstep fabric pickup and delivery?',
        content: '<p>Yes! Our dedicated delivery partner visits your address to collect your fabric and reference garments safely in a sealed bag. Once your outfit is handcrafted and passed through multi-point quality checks, it is delivered back to your doorstep.</p>'
    },
    {
        _id: 'faq-5',
        categoryTag: 'measurements',
        categoryLabel: 'Measurements & Fit',
        title: 'How do I provide my measurements?',
        content: '<p>We provide 3 convenient measurement methods:</p><ul className="list-disc ml-5 space-y-1.5 mt-2"><li><strong>Doorstep Executive Visit:</strong> A certified measurement professional visits your home with a sanitized measuring kit.</li><li><strong>Sample Garment Pickup:</strong> Hand over your best-fitting sample garment during fabric pickup; our tailor replicates the exact fit.</li><li><strong>Saved Measurement Profile:</strong> Enter your custom body measurements once in your app profile and reuse anytime.</li></ul>'
    },
    {
        _id: 'faq-6',
        categoryTag: 'alterations',
        categoryLabel: 'Alterations & Guarantee',
        title: 'What if my stitched outfit does not fit properly?',
        content: '<p>Every order is backed by our <strong>100% Perfect Fit Guarantee</strong>. If any fitting adjustment is needed, simply request a free alteration within 7 days of delivery through the app. We will pick up the garment, adjust the fit, and return it to you at zero extra charge.</p>'
    },
    {
        _id: 'faq-7',
        categoryTag: 'stitching',
        categoryLabel: 'Stitching & Design',
        title: 'Can I choose my own tailor or boutique?',
        content: '<p>Yes, absolutely! You can browse tailor profiles, check their real work samples, ratings, verified badges, and specialized crafts (e.g. Bridal Lehengas, Designer Blouses, Suits). You can pick your favorite tailor or choose our Smart Auto-Assign feature.</p>'
    },
    {
        _id: 'faq-8',
        categoryTag: 'stitching',
        categoryLabel: 'Stitching & Design',
        title: 'Can I upload my own design or reference photo?',
        content: '<p>Yes! When customizing any garment, you can upload photos from Pinterest, Instagram, or sketches. You can also attach voice notes or detailed stitching preferences for the tailor.</p>'
    },
    {
        _id: 'faq-9',
        categoryTag: 'payments',
        categoryLabel: 'Payments & Refunds',
        title: 'Which payment methods are accepted and is it secure?',
        content: '<p>We accept UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards (Visa, MasterCard, RuPay), Net Banking, and Wallets. All transactions are protected by 256-bit bank-grade SSL encryption.</p>'
    },
    {
        _id: 'faq-10',
        categoryTag: 'payments',
        categoryLabel: 'Payments & Refunds',
        title: 'Can I cancel my order or get a refund?',
        content: '<p>You can cancel your order anytime before fabric cutting starts for a full refund. Once cutting has commenced, cancellation depends on workshop progress. Refunds are processed back to your original payment method or wallet within 3-5 business days.</p>'
    },
    {
        _id: 'faq-11',
        categoryTag: 'general',
        categoryLabel: 'General',
        title: 'Where is Sewzella service available?',
        content: '<p>Sewzella operates across major urban cities and suburbs. Enable location in the app or enter your pin code on the home screen to check instant availability in your area.</p>'
    }
];

const CATEGORIES = [
    { id: 'all', label: 'All Topics', icon: Sparkles },
    { id: 'orders', label: 'Orders & Delivery', icon: Package },
    { id: 'measurements', label: 'Measurements', icon: Ruler },
    { id: 'stitching', label: 'Stitching & Styles', icon: Scissors },
    { id: 'payments', label: 'Payments & Refunds', icon: CreditCard },
    { id: 'alterations', label: 'Alterations & Returns', icon: RotateCcw }
];

const FAQAccordion = ({ item, isExpanded, onToggle, searchQuery }) => {
    const [feedback, setFeedback] = useState(null);

    const highlightText = (text, query) => {
        if (!query || !query.trim()) return text;
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() ? (
                <mark key={i} className="bg-yellow-200 text-gray-900 rounded-xs px-0.5 font-bold">
                    {part}
                </mark>
            ) : part
        );
    };

    return (
        <div className="border-b border-gray-100 last:border-b-0">
            <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50/70"
                onClick={onToggle}
                aria-expanded={isExpanded}
            >
                <span className={`text-[13.5px] font-semibold leading-snug ${isExpanded ? 'text-[#843D9B]' : 'text-gray-900'}`}>
                    {highlightText(item.title, searchQuery)}
                </span>
                <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#843D9B]' : 'text-gray-400'}`}
                />
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 text-[13px] leading-relaxed text-gray-600">
                    <div
                        className="space-y-2 break-words [overflow-wrap:anywhere] [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-gray-800 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
                        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(item.content) }}
                    />

                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <span>Was this helpful?</span>
                        {feedback ? (
                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
                                <CheckCircle2 size={13} /> Thanks for your feedback
                            </span>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                {['Yes', 'No'].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setFeedback(v); }}
                                        className="rounded-lg border border-gray-200 px-3 py-1 font-semibold text-gray-600 transition-colors hover:border-[#843D9B] hover:text-[#843D9B]"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Support = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { appName } = useBrandingStore();

    const [faqs, setFaqs] = useState(FALLBACK_FAQS);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaqId, setExpandedFaqId] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

    // Fetch dynamic FAQs and CMS Settings
    useEffect(() => {
        const fetchSupportData = async () => {
            try {
                const [faqRes, settingsRes] = await Promise.allSettled([
                    api.get('/cms/content?type=faq'),
                    api.get('/cms/settings')
                ]);

                if (faqRes.status === 'fulfilled' && faqRes.value?.data?.data) {
                    const rawList = faqRes.value.data.data;
                    const uniqueMap = new Map();
                    rawList.forEach(item => {
                        const key = (item.title || item.slug || '').toLowerCase().trim();
                        if (key && !uniqueMap.has(key)) {
                            let tag = 'general';
                            const titleLower = item.title?.toLowerCase() || '';
                            if (titleLower.includes('order') || titleLower.includes('track') || titleLower.includes('pickup') || titleLower.includes('delivery')) tag = 'orders';
                            else if (titleLower.includes('measure') || titleLower.includes('fit')) tag = 'measurements';
                            else if (titleLower.includes('tailor') || titleLower.includes('stitch') || titleLower.includes('design') || titleLower.includes('fabric')) tag = 'stitching';
                            else if (titleLower.includes('pay') || titleLower.includes('refund') || titleLower.includes('cancel')) tag = 'payments';
                            else if (titleLower.includes('alter') || titleLower.includes('return')) tag = 'alterations';

                            uniqueMap.set(key, { ...item, categoryTag: tag });
                        }
                    });

                    const deduplicated = Array.from(uniqueMap.values());
                    if (deduplicated.length > 0) {
                        setFaqs(deduplicated);
                    }
                }

                if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.data) {
                    setSettings(settingsRes.value.data.data);
                }
            } catch (err) {
                console.error('Error fetching support page data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSupportData();
    }, [isAuthenticated]);

    // Support Contact Credentials
    const supportEmail = settings?.general?.supportEmail || 'support@sewzella.com';
    const supportPhone = settings?.general?.supportPhone || '+91 9429692921';
    const cleanPhone = supportPhone.replace(/[^+\d]/g, '');

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleEmailClick = () => {
        const subject = encodeURIComponent(`Support Request - ${appName || 'Sewzella'}`);
        const bodyLines = [
            `Hello Support Team,`,
            ``,
            `I need assistance with Sewzella service:`,
            ``,
            `Issue details:`,
            `[Please describe your issue here]`,
            ``,
            `Thank you!`
        ].join('\n');
        window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${encodeURIComponent(bodyLines)}`;
    };

    const handleCallClick = () => {
        if (!cleanPhone) return;
        window.location.href = `tel:${cleanPhone}`;
    };

    const handleWhatsAppClick = () => {
        openAdminWhatsApp(`Hi ${appName || 'Sewzella'} Admin, I need help with your service.`);
    };

    // Filter FAQs by Category and Search Query
    const filteredFaqs = useMemo(() => {
        return faqs.filter(faq => {
            const matchesCategory = selectedCategory === 'all' || faq.categoryTag === selectedCategory;
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                faq.title?.toLowerCase().includes(query) || 
                faq.content?.toLowerCase().includes(query);
            return matchesCategory && matchesSearch;
        });
    }, [faqs, selectedCategory, searchQuery]);

    const handleToggleFaq = (id) => {
        setExpandedFaqId(prev => prev === id ? null : id);
    };

    const quickActions = [
        { id: 'whatsapp', label: 'WhatsApp', sub: 'Chat with us', icon: MessageCircle, onClick: handleWhatsAppClick, tone: 'bg-emerald-50 text-emerald-600' },
        { id: 'call', label: 'Call Us', sub: '9 AM – 9 PM', icon: PhoneCall, onClick: handleCallClick, tone: 'bg-[#843D9B]/10 text-[#843D9B]' },
        { id: 'email', label: 'Email', sub: 'Reply in 2–4 hrs', icon: Mail, onClick: handleEmailClick, tone: 'bg-sky-50 text-sky-600' },
    ];

    const contactRows = [
        { id: 'phone', icon: Phone, label: 'Helpline', value: supportPhone },
        { id: 'email', icon: Mail, label: 'Email', value: supportEmail },
    ];

    return (
        <div className="min-h-screen bg-[#F7F5FA] pb-32 font-sans text-gray-900">
            {/* ═══ Header ═══ */}
            <div className="relative overflow-hidden rounded-b-[28px] bg-[#5E2373] px-4 pb-16 pt-4 text-white sm:px-6">
                {/* Soft layered background */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,#A657BF_0%,transparent_55%),radial-gradient(90%_80%_at_0%_100%,#7A2F93_0%,transparent_60%)]" />
                <div className="pointer-events-none absolute -right-10 top-10 h-40 w-40 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -right-2 top-20 h-24 w-24 rounded-full border border-white/10" />

                <div className="relative mx-auto max-w-xl">
                    {/* Top bar */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20 backdrop-blur-md transition-colors hover:bg-white/25"
                            aria-label="Go Back"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <span className="text-[14px] font-semibold tracking-wide text-white/90">Help Center</span>
                        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-semibold ring-1 ring-white/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                        </span>
                    </div>

                    {/* Greeting */}
                    <div className="mt-6 flex items-center gap-3.5 px-0.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-md">
                            <Headphones size={22} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-[21px] font-semibold leading-tight tracking-tight">How can we help you?</h1>
                            <p className="mt-0.5 text-[12.5px] text-white/70">The {appName || 'Sewzella'} team is here for you</p>
                        </div>
                    </div>

                    <div className="relative mt-5">
                        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#843D9B]" />
                        <input
                            type="text"
                            placeholder="Search help topics"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-12 w-full rounded-2xl bg-white pl-11 pr-10 text-sm font-medium text-gray-900 shadow-xl shadow-black/15 outline-none placeholder:font-normal placeholder:text-gray-400 focus:ring-4 focus:ring-white/25"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600"
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative z-10 mx-auto -mt-9 max-w-xl space-y-6 px-4 sm:px-6">
                {/* ═══ Contact card ═══ */}
                <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-3 gap-2.5">
                        {quickActions.map(({ id, label, sub, icon: Icon, onClick, tone }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={onClick}
                                className="flex flex-col items-center rounded-xl border border-gray-100 px-2 py-3.5 text-center transition-all hover:border-gray-200 hover:shadow-sm active:scale-[0.98]"
                            >
                                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${tone}`}>
                                    <Icon size={20} />
                                </span>
                                <span className="mt-2 text-[13px] font-semibold text-gray-900">{label}</span>
                                <span className="mt-0.5 text-[10.5px] text-gray-500">{sub}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 divide-y divide-gray-100 rounded-xl bg-gray-50">
                        {contactRows.map(({ id, icon: Icon, label, value }) => (
                            <div key={id} className="flex items-center gap-3 px-3.5 py-3">
                                <Icon size={16} className="shrink-0 text-gray-400" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10.5px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
                                    <p className="truncate text-[13.5px] font-semibold text-gray-800">{value}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(value, id)}
                                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#843D9B] transition-colors hover:bg-[#843D9B]/5"
                                >
                                    {copiedField === id ? <><Check size={13} className="text-emerald-600" /><span className="text-emerald-600">Copied</span></> : <><Copy size={13} />Copy</>}
                                </button>
                            </div>
                        ))}
                    </div>

                    <p className="mt-3 flex items-center gap-1.5 px-1 text-[11.5px] text-gray-500">
                        <Clock size={13} className="shrink-0 text-gray-400" />
                        Helpline open 9:00 AM – 9:00 PM IST, all days.
                    </p>
                </section>

                {/* ═══ FAQs ═══ */}
                <section className="space-y-3">
                    <div className="flex items-end justify-between px-1">
                        <h2 className="text-base font-bold text-gray-900">Frequently asked questions</h2>
                        <span className="text-xs text-gray-400">
                            {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'}
                        </span>
                    </div>

                    <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
                        {CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => { setSelectedCategory(cat.id); setExpandedFaqId(null); }}
                                    className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                        isSelected
                                            ? 'border-[#843D9B] bg-[#843D9B] text-white'
                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>

                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-14 animate-pulse rounded-xl border border-gray-100 bg-white" />
                            ))}
                        </div>
                    ) : filteredFaqs.length === 0 ? (
                        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#843D9B]/10 text-[#843D9B]">
                                <Search size={22} />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">No matching answers</h3>
                            <p className="mx-auto max-w-xs text-xs text-gray-500">Try different words, or contact us using the options above.</p>
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#843D9B] hover:bg-[#843D9B]/5"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                            {filteredFaqs.map((faq) => (
                                <FAQAccordion
                                    key={faq._id || faq.slug}
                                    item={faq}
                                    isExpanded={expandedFaqId === (faq._id || faq.slug)}
                                    onToggle={() => handleToggleFaq(faq._id || faq.slug)}
                                    searchQuery={searchQuery}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11.5px] text-gray-500">
                    <ShieldCheck size={14} className="shrink-0 text-[#843D9B]" />
                    <span>Perfect Fit Guarantee · Safe doorstep service</span>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default Support;
