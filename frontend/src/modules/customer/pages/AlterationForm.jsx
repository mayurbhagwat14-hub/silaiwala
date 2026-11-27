import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, UploadCloud, X, Loader2, MapPin, Star, Check, BadgeCheck, Crown, Sparkles, Camera,
    PencilLine, Send, Scissors, MoveVertical, Shirt, Smile, ClipboardList, Copy, Clock, Bell, Users, FileText,
    Mail, CheckCircle2, Truck, Home, Plus, Info,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import SafeImage from '../../../components/Common/SafeImage';
import useAddressStore from '../../../store/userStore';

const SANS = "'Plus Jakarta Sans', sans-serif";
const MAX_IMAGES = 5;
const MAX_IMAGE_MB = 5;
const MAX_DESC = 300;

// Quick-select chips: tapping one adds its text to the description.
const QUICK_ALTERATIONS = [
    { label: 'Take In / Let Out', icon: Shirt, text: 'Take in / let out at the waist' },
    { label: 'Shorten / Lengthen', icon: MoveVertical, text: 'Shorten / lengthen the length' },
    { label: 'Sleeve Adjustment', icon: Scissors, text: 'Adjust the sleeves' },
    { label: 'Neckline Fix', icon: Smile, text: 'Fix the neckline' },
];

const tailorKey = (t) => t.user?._id || t.user?.id || t._id;

/** 1 Select Tailor -> 2 Add Details -> 3 Request / Get Quotes. `current` is the active step (4 = all done). */
const Stepper = ({ current, lastLabel }) => {
    const steps = ['Select Tailor', 'Add Details', lastLabel];
    return (
        <div className="rounded-[20px] bg-white px-4 py-3.5 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4]">
            <div className="flex items-start">
                {steps.map((label, i) => {
                    const n = i + 1;
                    const done = n < current;
                    const active = n === current;
                    return (
                        <React.Fragment key={label}>
                            {i > 0 && <span className={`mt-[15px] h-[2px] flex-1 rounded-full ${n <= current ? 'bg-[#6A2385]' : 'bg-[#E4D6EC]'}`} />}
                            <div className="flex w-[84px] shrink-0 flex-col items-center">
                                <span
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${
                                        done || active ? 'bg-gradient-to-br from-[#8A3FA6] to-[#5A1A78] text-white shadow-[0_6px_14px_-8px_rgba(90,26,120,0.9)]' : 'bg-white text-[#6A2385] ring-2 ring-[#D9C2E6]'
                                    }`}
                                >
                                    {done ? <Check size={15} strokeWidth={3} /> : n}
                                </span>
                                <span className={`mt-1.5 whitespace-nowrap text-[12px] ${active || done ? 'font-semibold text-[#1A1523]' : 'font-medium text-[#6A2385]'}`}>{label}</span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

const SectionTitle = ({ n, title, subtitle, action }) => (
    <div className="mb-4 flex items-start gap-3">
        {n ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8A3FA6] to-[#5A1A78] text-[16px] font-bold text-white shadow-[0_6px_14px_-8px_rgba(90,26,120,0.9)]">{n}</span>
        ) : null}
        <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold leading-tight text-[#1A1523]" style={{ fontFamily: SANS }}>{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-gray-500">{subtitle}</p>}
        </div>
        {action}
    </div>
);

const Card = ({ children, className = '' }) => (
    <section className={`rounded-[22px] bg-white p-4 shadow-[0_8px_24px_-18px_rgba(42,15,56,0.45)] ring-1 ring-[#EFE8F4] sm:p-5 ${className}`}>{children}</section>
);

const Header = ({ onBack }) => (
    <div className="relative overflow-hidden bg-white px-4 pb-5 pt-4">
        <span className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-[#F3E9F8]" />
        <span className="pointer-events-none absolute right-16 top-20 h-16 w-16 rounded-full bg-[#F8F1FB]" />
        <div className="relative mx-auto flex max-w-2xl items-start gap-3">
            <div className="min-w-0 flex-1">
                <button type="button" onClick={onBack} aria-label="Back" className="-ml-1.5 mb-2 flex h-9 w-9 items-center justify-center text-[#6A2385] active:scale-95">
                    <ArrowLeft size={24} strokeWidth={2.2} />
                </button>
                <h1 className="text-[24px] font-bold leading-tight text-[#1A1523]" style={{ fontFamily: SANS }}>Request Alteration</h1>
                <p className="mt-1 max-w-[260px] text-[13px] leading-snug text-gray-500">Get quick quotes from verified tailors for your alteration needs</p>
            </div>
            <div className="relative mt-3 flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#8A3FA6] to-[#5A1A78] text-white shadow-[0_16px_30px_-16px_rgba(90,26,120,0.9)]">
                <Scissors size={40} strokeWidth={1.6} />
                <span className="absolute -bottom-2 -left-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#6A2385] shadow-md ring-1 ring-[#EFE8F4]">
                    <Shirt size={18} />
                </span>
            </div>
        </div>
    </div>
);

const AlterationForm = () => {
    const navigate = useNavigate();
    const [description, setDescription] = useState('');
    const [images, setImages] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showAllTailors, setShowAllTailors] = useState(false);
    const [submitted, setSubmitted] = useState(null); // { id, tailor, description, chips, images }

    const [tailors, setTailors] = useState([]);
    const [selectedTailorId, setSelectedTailorId] = useState(null);
    const [isLoadingTailors, setIsLoadingTailors] = useState(true);

    const addresses = useAddressStore(state => state.addresses);
    const fetchAddresses = useAddressStore(state => state.fetchAddresses);
    const [selectedAddressId, setSelectedAddressId] = useState(null);

    useEffect(() => {
        if (addresses.length === 0) {
            fetchAddresses();
        }
    }, [addresses.length, fetchAddresses]);

    useEffect(() => {
        const fetchTailors = async () => {
            try {
                const response = await api.get('/customers/tailors');
                if (response.data.success) {
                    setTailors(response.data.data);
                }
            } catch (error) {
                if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
                    console.error('Error fetching tailors:', error);
                }
            } finally {
                setIsLoadingTailors(false);
            }
        };
        fetchTailors();
    }, []);

    const handleImageUpload = (e) => {
        const picked = Array.from(e.target.files || []);
        if (picked.length === 0) return;

        const files = picked.filter((f) => f.size <= MAX_IMAGE_MB * 1024 * 1024);
        if (files.length < picked.length) toast.error(`Each photo must be under ${MAX_IMAGE_MB} MB.`);
        if (images.length + files.length > MAX_IMAGES) {
            toast.error(`You can upload a maximum of ${MAX_IMAGES} images.`);
            return;
        }

        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));

        setImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const usedChips = QUICK_ALTERATIONS.filter((c) => description.includes(c.text));
    const toggleChip = (chip) => {
        if (description.includes(chip.text)) {
            setDescription(description.replace(chip.text, '').replace(/,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, ''));
            return;
        }
        const next = description.trim() ? `${description.trim().replace(/[.,]$/, '')}, ${chip.text}` : chip.text;
        if (next.length > MAX_DESC) {
            toast.error(`Description can be at most ${MAX_DESC} characters.`);
            return;
        }
        setDescription(next);
    };

    const selectedTailor = tailors.find((t) => tailorKey(t) === selectedTailorId) || null;
    const selectedAddress = addresses.find(a => a._id === selectedAddressId) || addresses[0];
    const detailsDone = Boolean(description.trim()) && images.length > 0 && Boolean(selectedAddress);
    const currentStep = !selectedTailorId ? 1 : !detailsDone ? 2 : 3;
    const visibleTailors = showAllTailors ? tailors : tailors.slice(0, 6);

    const handleSubmitRequest = async () => {
        if (!selectedTailorId) {
            toast.error("Please select a tailor.");
            return;
        }
        if (images.length === 0) {
            toast.error("Please upload at least one image of the garment.");
            return;
        }
        if (!description.trim()) {
            toast.error("Please provide a description of the alteration.");
            return;
        }

        const addressToUse = selectedAddress;
        if (!addressToUse) {
            toast.error("Please select or add a pickup address.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload images first
            const uploadPromises = images.map(async (img) => {
                const formData = new FormData();
                formData.append('image', img.file);
                formData.append('file', img.file);
                try {
                    const res = await api.post('/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    return res.data?.data || res.data?.imageUrl || res.data;
                } catch (error) {
                    console.error('Protected Upload error, trying public:', error);
                    try {
                        const pubRes = await api.post('/upload/public', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        return pubRes.data?.data || pubRes.data?.imageUrl || pubRes.data;
                    } catch (pubErr) {
                        console.error('Public upload error, using preview fallback:', pubErr);
                        return img.preview;
                    }
                }
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            const validUrls = uploadedUrls.filter(url => url !== null);

            if (validUrls.length === 0) {
                toast.error("Failed to upload images. Please try again.");
                setIsSubmitting(false);
                return;
            }

            const response = await api.post('/alterations/request', {
                tailorId: selectedTailorId,
                description: description,
                images: validUrls,
                deliveryAddress: {
                    street: addressToUse.street,
                    city: addressToUse.city,
                    state: addressToUse.state || '',
                    zipCode: addressToUse.zipCode,
                    location: addressToUse.location
                }
            });

            if (response.data.success) {
                const createdAlt = response.data.data;
                toast.success("Alteration request sent to Tailor successfully!");
                setSubmitted({
                    id: createdAlt?.alterationId || 'ALT-REQ',
                    tailor: selectedTailor,
                    description: description.trim(),
                    chips: usedChips,
                    images: images.map((i) => i.preview),
                });
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            toast.error(error.response?.data?.message || "Failed to submit request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return <RequestSubmitted data={submitted} onBack={() => navigate(-1)} navigate={navigate} />;
    }

    const canSubmit = !isSubmitting && selectedTailorId && description.trim() && images.length > 0 && addresses.length > 0;

    return (
        <div className="min-h-screen bg-white pb-28 font-sans">
            <Header onBack={() => navigate(-1)} />

            <div className="mx-auto max-w-2xl space-y-4 px-4">
                <Stepper current={currentStep} lastLabel="Request" />

                {/* 1. Tailor */}
                <Card>
                    <SectionTitle
                        n={1}
                        title="Select a Tailor"
                        subtitle="Choose a trusted tailor for your alteration"
                        action={tailors.length > 6 && (
                            <button type="button" onClick={() => setShowAllTailors((v) => !v)} className="flex shrink-0 items-center gap-1 pt-1 text-[12.5px] font-semibold text-[#6A2385]">
                                {showAllTailors ? 'Show Less' : 'View All Tailors'} <ArrowRight size={14} />
                            </button>
                        )}
                    />

                    {isLoadingTailors ? (
                        <div className="flex justify-center p-6">
                            <Loader2 size={24} className="animate-spin text-[#843D9B]" />
                        </div>
                    ) : tailors.length === 0 ? (
                        <p className="rounded-2xl bg-[#FBF7FD] p-4 text-center text-[12.5px] text-gray-500">No tailors available near you right now.</p>
                    ) : (
                        <div className={showAllTailors ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5'}>
                            {visibleTailors.map((tailor, index) => {
                                const key = tailorKey(tailor);
                                const selected = selectedTailorId === key;
                                const rating = Number(tailor.rating) || 0;
                                const reviews = Number(tailor.totalReviews) || 0;
                                const tag = index === 0
                                    ? { icon: Crown, label: 'Recommended' }
                                    : tailor.distance
                                        ? { icon: MapPin, label: String(tailor.distance).replace(/\s*away/i, '') }
                                        : tailor.specializations?.[0]
                                            ? { icon: Scissors, label: String(tailor.specializations[0]).replace(/^\w/, (c) => c.toUpperCase()) }
                                            : null;
                                const TagIcon = tag?.icon;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setSelectedTailorId(key)}
                                        className={`relative flex shrink-0 flex-col items-center rounded-[18px] bg-white px-3 pb-3 pt-4 text-center transition-all ${
                                            showAllTailors ? '' : 'w-[150px]'
                                        } ${selected ? 'ring-2 ring-[#6A2385] shadow-[0_10px_24px_-16px_rgba(90,26,120,0.9)]' : 'ring-1 ring-[#EFE8F4] hover:ring-[#D9C2E6]'}`}
                                    >
                                        {selected && (
                                            <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#6A2385] text-white">
                                                <Check size={14} strokeWidth={3} />
                                            </span>
                                        )}
                                        <span className="h-16 w-16 overflow-hidden rounded-full bg-[#F6EEFA] ring-2 ring-white shadow">
                                            <SafeImage src={tailor.user?.profileImage} alt={tailor.shopName} className="h-full w-full object-cover" />
                                        </span>
                                        <span className="mt-2 flex w-full items-center justify-center gap-1">
                                            <span className="truncate text-[13.5px] font-bold text-[#1A1523]">{tailor.shopName || 'Tailor Partner'}</span>
                                            <BadgeCheck size={15} className="shrink-0 fill-[#6A2385] text-white" />
                                        </span>
                                        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-gray-600">
                                            {rating > 0 && reviews > 0 ? (
                                                <><Star size={12} className="fill-[#F5A623] text-[#F5A623]" /> {rating.toFixed(1)} <span className="text-gray-400">({reviews})</span></>
                                            ) : (
                                                <><Sparkles size={12} className="text-[#6A2385]" /> New</>
                                            )}
                                        </span>
                                        {tag && (
                                            <span className="mt-2 flex max-w-full items-center gap-1 truncate rounded-full bg-[#F3E9F8] px-2.5 py-1 text-[11px] font-semibold text-[#6A2385]">
                                                <TagIcon size={12} className="shrink-0" /> <span className="truncate">{tag.label}</span>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* 2. Photos */}
                <Card>
                    <SectionTitle
                        n={2}
                        title="Upload Images"
                        subtitle="Upload clear images of the garment and the area to be altered"
                        action={(
                            <button
                                type="button"
                                onClick={() => setShowGuide((v) => !v)}
                                className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F6EEFA] px-3 py-1.5 text-[12px] font-semibold text-[#6A2385] ring-1 ring-[#E4D6EC]"
                            >
                                <Camera size={14} /> Image Guide
                            </button>
                        )}
                    />

                    {showGuide && (
                        <div className="mb-3 flex gap-2.5 rounded-2xl bg-[#FBF7FD] p-3 text-[12px] leading-relaxed text-[#4B4453] ring-1 ring-[#EFE8F4]">
                            <Info size={16} className="mt-0.5 shrink-0 text-[#6A2385]" />
                            <p>Add a full front view, a back view and close-ups of the area to change (sleeve, waist, neckline). Use daylight and lay the garment flat.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                        {images.length < MAX_IMAGES && (
                            <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D9C2E6] bg-[#FDFBFE] text-center text-[#6A2385] transition-colors hover:bg-[#F8F1FB]">
                                <UploadCloud size={26} />
                                <span className="mt-1 text-[12px] font-bold">Upload Photos</span>
                                <span className="text-[10px] text-gray-500">JPG, PNG (Max {MAX_IMAGE_MB} MB)</span>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onClick={(e) => { e.target.value = null; }}
                                    onChange={handleImageUpload}
                                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                />
                            </label>
                        )}
                        {images.map((img, idx) => (
                            <div key={img.preview} className="relative aspect-square overflow-hidden rounded-2xl ring-1 ring-[#EFE8F4]">
                                <img src={img.preview} alt={`Garment photo ${idx + 1}`} className="h-full w-full object-cover" />
                                <span className="absolute inset-x-0 bottom-0 bg-[#5A1A78]/90 py-1 text-center text-[10.5px] font-semibold text-white">Photo {idx + 1}</span>
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    aria-label="Remove photo"
                                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#1A1523] shadow"
                                >
                                    <X size={13} strokeWidth={2.5} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-right text-[11px] text-gray-400">{images.length}/{MAX_IMAGES} photos</p>
                </Card>

                {/* 3. Details */}
                <Card>
                    <SectionTitle n={3} title="Alteration Details" subtitle="Tell us what changes you need" />
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-[#E4D6EC] focus-within:ring-2 focus-within:ring-[#B98FCF]">
                        <div className="flex gap-2.5">
                            <PencilLine size={18} className="mt-0.5 shrink-0 text-[#6A2385]" />
                            <textarea
                                value={description}
                                maxLength={MAX_DESC}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="E.g., Take in the waist by 2 inches, shorten the sleeves, or fix the neckline."
                                className="min-h-[84px] w-full resize-none bg-transparent text-[13px] text-[#1A1523] outline-none placeholder:text-gray-400"
                            />
                        </div>
                        <p className="text-right text-[11px] text-gray-400">{description.length}/{MAX_DESC}</p>
                    </div>

                    <p className="mb-2 mt-4 text-[12.5px] font-bold text-[#1A1523]">Common Alterations (Quick Select)</p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_ALTERATIONS.map((chip) => {
                            const Icon = chip.icon;
                            const active = description.includes(chip.text);
                            return (
                                <button
                                    key={chip.label}
                                    type="button"
                                    onClick={() => toggleChip(chip)}
                                    className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold transition-colors ${
                                        active ? 'bg-[#6A2385] text-white' : 'bg-white text-[#6A2385] ring-1 ring-[#E4D6EC] hover:ring-[#B98FCF]'
                                    }`}
                                >
                                    <Icon size={14} /> {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* 4. Pickup address */}
                <Card>
                    <SectionTitle
                        n={4}
                        title="Pickup Address"
                        subtitle="We'll pick up the garment from here"
                        action={addresses.length > 0 && (
                            <button type="button" onClick={() => navigate('/user/profile/addresses')} className="flex shrink-0 items-center gap-1 pt-1 text-[12.5px] font-semibold text-[#6A2385]">
                                <Plus size={14} /> Add New
                            </button>
                        )}
                    />
                    {addresses.length === 0 ? (
                        <div className="rounded-2xl bg-[#FBF7FD] p-4 text-center ring-1 ring-[#EFE8F4]">
                            <MapPin size={24} className="mx-auto mb-2 text-[#B98FCF]" />
                            <p className="mb-3 text-[12.5px] text-gray-500">No addresses found.</p>
                            <button
                                type="button"
                                onClick={() => navigate('/user/profile/addresses')}
                                className="rounded-full bg-[#6A2385] px-4 py-2 text-[12px] font-semibold text-white"
                            >
                                Add New Address
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {addresses.map((addr) => {
                                const isSelected = addr._id === selectedAddress?._id;
                                return (
                                    <button
                                        key={addr._id}
                                        type="button"
                                        onClick={() => setSelectedAddressId(addr._id)}
                                        className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-all ${isSelected ? 'bg-[#FBF7FD] ring-2 ring-[#6A2385]' : 'ring-1 ring-[#EFE8F4] hover:ring-[#D9C2E6]'}`}
                                    >
                                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-[#6A2385] text-white' : 'bg-[#F3E9F8] text-[#6A2385]'}`}>
                                            <MapPin size={15} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2 text-[13px] font-bold text-[#1A1523]">
                                                <span className="truncate">{addr.receiverName}</span>
                                                {addr.type && <span className="rounded-md bg-[#F3E9F8] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#6A2385]">{addr.type}</span>}
                                            </span>
                                            <span className="mt-0.5 block text-[12px] leading-snug text-gray-500">{[addr.street, addr.city, addr.state].filter(Boolean).join(', ')}{addr.zipCode ? ` - ${addr.zipCode}` : ''}</span>
                                        </span>
                                        {isSelected && <Check size={18} className="mt-1 shrink-0 text-[#6A2385]" strokeWidth={3} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* Bottom action */}
            <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 px-4 pb-4 pt-3 backdrop-blur">
                <div className="mx-auto max-w-2xl">
                    <button
                        type="button"
                        onClick={handleSubmitRequest}
                        disabled={!canSubmit}
                        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#8A3FA6] to-[#5A1A78] text-[15px] font-bold text-white shadow-[0_14px_28px_-14px_rgba(90,26,120,0.9)] transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <><Loader2 size={19} className="animate-spin" /> Sending Request...</>
                        ) : (
                            <><Send size={18} /> Proceed to Request Quote <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const NEXT_STEPS = [
    { label: 'Request Sent', icon: Send },
    { label: 'Tailor Sends Quote', icon: Mail },
    { label: 'Accept & Pay', icon: CheckCircle2 },
    { label: 'Alteration & Delivery', icon: Truck },
];

/** Shown after the request is created: confirmation, request id, summary, tailor and what happens next. */
const RequestSubmitted = ({ data, onBack, navigate }) => {
    const { id, tailor, description, chips, images } = data;
    const rating = Number(tailor?.rating) || 0;
    const reviews = Number(tailor?.totalReviews) || 0;
    const extra = Math.max(0, images.length - 3);

    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(id);
            toast.success('Request ID copied');
        } catch {
            toast.error('Could not copy');
        }
    };

    return (
        <div className="min-h-screen bg-white pb-28 font-sans">
            <Header onBack={onBack} />

            <div className="mx-auto max-w-2xl space-y-4 px-4">
                <Stepper current={4} lastLabel="Get Quotes" />

                {/* Confirmation */}
                <div className="flex flex-col gap-3 rounded-[22px] bg-gradient-to-r from-[#F8F1FB] to-[#F1E4F7] p-4 ring-1 ring-[#EADCF1] sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8A3FA6] to-[#5A1A78] text-white shadow-[0_8px_18px_-10px_rgba(90,26,120,0.9)]">
                            <Check size={24} strokeWidth={3} />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-[17px] font-bold leading-tight text-[#5A1A78]" style={{ fontFamily: SANS }}>Alteration Request Submitted!</h2>
                            <p className="mt-0.5 text-[12.5px] leading-snug text-gray-600">Your request has been sent to the selected tailor. You'll receive a quote soon.</p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-[#EFE8F4]">
                        <ClipboardList size={22} className="text-[#6A2385]" />
                        <div>
                            <p className="text-[10.5px] text-gray-500">Request ID</p>
                            <p className="text-[14px] font-bold text-[#1A1523]">{id}</p>
                        </div>
                        <button type="button" onClick={copyId} aria-label="Copy request ID" className="ml-1 text-[#6A2385]">
                            <Copy size={16} />
                        </button>
                    </div>
                </div>

                {/* Notify */}
                <div className="flex items-center gap-3 rounded-[22px] bg-[#FBF7FD] p-4 ring-1 ring-[#EFE8F4]">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1E4F7] text-[#6A2385]">
                        <Clock size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-[#1A1523]">The tailor will review your request</p>
                        <p className="text-[12px] text-gray-500">We'll notify you as soon as they send a quote.</p>
                    </div>
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#6A2385] ring-1 ring-[#EFE8F4]">
                        <Bell size={18} />
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                            <Check size={10} strokeWidth={3} />
                        </span>
                    </span>
                </div>

                {/* Summary */}
                <Card>
                    <div className="mb-3 flex items-center gap-2">
                        <FileText size={19} className="text-[#6A2385]" />
                        <h3 className="text-[15.5px] font-bold text-[#1A1523]" style={{ fontFamily: SANS }}>Request Summary</h3>
                    </div>
                    <div className="flex gap-3">
                        {images[0] && <img src={images[0]} alt="Garment" className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-[#EFE8F4]" />}
                        <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-bold text-[#1A1523]">Alteration Request</p>
                            <p className="mt-0.5 line-clamp-2 text-[12px] text-gray-500">{description}</p>
                            {chips.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {chips.map((c) => {
                                        const Icon = c.icon;
                                        return (
                                            <span key={c.label} className="flex items-center gap-1 rounded-full bg-[#F3E9F8] px-2 py-0.5 text-[10.5px] font-semibold text-[#6A2385]">
                                                <Icon size={11} /> {c.label}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    {images.length > 1 && (
                        <div className="mt-3 flex gap-2">
                            {images.slice(1, 4).map((src, i) => (
                                <div key={src} className="relative h-14 w-14 overflow-hidden rounded-xl ring-1 ring-[#EFE8F4]">
                                    <img src={src} alt={`Garment ${i + 2}`} className="h-full w-full object-cover" />
                                    {i === 2 && extra > 0 && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[13px] font-bold text-white">+{extra}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Tailor */}
                {tailor && (
                    <Card>
                        <div className="mb-3 flex items-center gap-2">
                            <Users size={19} className="text-[#6A2385]" />
                            <h3 className="text-[15.5px] font-bold text-[#1A1523]" style={{ fontFamily: SANS }}>Selected Tailor</h3>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl p-3 ring-1 ring-[#EFE8F4]">
                            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#F6EEFA]">
                                <SafeImage src={tailor.user?.profileImage} alt={tailor.shopName} className="h-full w-full object-cover" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1 text-[14px] font-bold text-[#1A1523]">
                                    <span className="truncate">{tailor.shopName || 'Tailor Partner'}</span>
                                    <BadgeCheck size={15} className="shrink-0 fill-[#6A2385] text-white" />
                                </p>
                                <p className="flex items-center gap-1 text-[12px] text-gray-600">
                                    {rating > 0 && reviews > 0
                                        ? <><Star size={12} className="fill-[#F5A623] text-[#F5A623]" /> {rating.toFixed(1)} <span className="text-gray-400">({reviews})</span></>
                                        : <><Sparkles size={12} className="text-[#6A2385]" /> New</>}
                                </p>
                            </div>
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#F3E9F8] px-3 py-1.5 text-[11.5px] font-semibold text-[#6A2385]">
                                <Check size={13} strokeWidth={3} /> Selected
                            </span>
                        </div>
                    </Card>
                )}

                {/* Next */}
                <Card>
                    <div className="mb-4 flex items-center gap-2">
                        <Mail size={19} className="text-[#6A2385]" />
                        <h3 className="text-[15.5px] font-bold text-[#1A1523]" style={{ fontFamily: SANS }}>What Happens Next?</h3>
                    </div>
                    <div className="flex items-start">
                        {NEXT_STEPS.map((s, i) => {
                            const Icon = s.icon;
                            const first = i === 0;
                            return (
                                <React.Fragment key={s.label}>
                                    {i > 0 && <span className="mt-[22px] flex-1 border-t-2 border-dashed border-[#E4D6EC]" />}
                                    <div className="flex w-[70px] shrink-0 flex-col items-center text-center">
                                        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${first ? 'bg-gradient-to-br from-[#8A3FA6] to-[#5A1A78] text-white shadow-[0_8px_18px_-10px_rgba(90,26,120,0.9)]' : 'bg-white text-gray-400 ring-1 ring-[#E4D6EC]'}`}>
                                            <Icon size={19} />
                                        </span>
                                        <span className={`mt-1.5 text-[11px] leading-tight ${first ? 'font-bold text-[#1A1523]' : 'text-gray-500'}`}>{s.label}</span>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </Card>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 px-4 pb-4 pt-3 backdrop-blur">
                <div className="mx-auto flex max-w-2xl gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/user', { replace: true })}
                        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[14px] font-bold text-[#6A2385] ring-1 ring-[#D9C2E6]"
                    >
                        <Home size={17} /> Back to Home
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/user/orders', { replace: true, state: { activeTab: 'alterations' } })}
                        className="flex flex-[1.2] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#8A3FA6] to-[#5A1A78] py-3.5 text-[14px] font-bold text-white shadow-[0_14px_28px_-14px_rgba(90,26,120,0.9)]"
                    >
                        <FileText size={17} /> View Request <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlterationForm;
