import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, ArrowLeft, Home, Briefcase, Phone, Pencil, X, CheckCircle2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useUserStore from '../../../store/userStore';
import BottomNav from '../components/BottomNav';

const EMPTY_FORM = {
    type: 'Home',
    receiverName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    isDefault: false,
};

const TYPES = [
    { id: 'Home', icon: Home },
    { id: 'Work', icon: Briefcase },
    { id: 'Other', icon: MapPin },
];

const typeIcon = (type) => (TYPES.find((t) => t.id === type) || TYPES[2]).icon;

const Field = ({ label, className = '', ...props }) => (
    <label className={`block ${className}`}>
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <input
            {...props}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-[#843D9B] focus:ring-2 focus:ring-[#843D9B]/15"
        />
    </label>
);

const AddressPage = () => {
    const navigate = useNavigate();
    const { addresses, fetchAddresses, addAddress, removeAddress, updateAddress, isLoading } = useUserStore();
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const set = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

    const openAdd = () => {
        setEditingId(null);
        setFormData({ ...EMPTY_FORM, isDefault: addresses.length === 0 });
        setFormOpen(true);
    };

    const openEdit = (addr) => {
        setEditingId(addr._id);
        setFormData({ ...EMPTY_FORM, ...addr });
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const phoneDigits = (formData.phone || '').replace(/\D/g, '');
        if (phoneDigits.length < 10) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }
        const payload = {
            type: formData.type,
            receiverName: formData.receiverName.trim(),
            phone: formData.phone.trim(),
            street: formData.street.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            zipCode: formData.zipCode.trim(),
            country: formData.country || 'India',
            isDefault: !!formData.isDefault,
        };
        if (editingId) {
            await updateAddress(editingId, payload);
            toast.success('Address updated');
        } else {
            await addAddress(payload);
            toast.success('Address saved');
        }
        closeForm();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Remove this address?')) {
            await removeAddress(id);
            toast.success('Address removed');
        }
    };

    const makeDefault = async (addr) => {
        if (addr.isDefault) return;
        await updateAddress(addr._id, { isDefault: true });
        toast.success('Default address updated');
    };

    const sorted = [...addresses].sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault));

    return (
        <div className="min-h-screen bg-white pb-28 font-sans text-gray-900">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3.5">
                    <button
                        onClick={() => navigate('/user/profile')}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[17px] font-bold leading-tight text-gray-900">Saved Addresses</h1>
                        <p className="text-xs text-gray-500">
                            {addresses.length > 0 ? `${addresses.length} saved for pickup & delivery` : 'For fabric pickup & delivery'}
                        </p>
                    </div>
                    {!formOpen && addresses.length > 0 && (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-1.5 rounded-full bg-[#843D9B] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6f3284]"
                        >
                            <Plus size={15} /> Add New
                        </button>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-xl px-4 py-5">
                <AnimatePresence mode="wait">
                    {formOpen ? (
                        <motion.form
                            key="form"
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-base font-bold text-gray-900">{editingId ? 'Edit Address' : 'Add New Address'}</h2>
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Save as</span>
                            <div className="mb-5 grid grid-cols-3 gap-2">
                                {TYPES.map(({ id, icon: Icon }) => {
                                    const active = formData.type === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setFormData((prev) => ({ ...prev, type: id }))}
                                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                                                active
                                                    ? 'border-[#843D9B] bg-[#843D9B]/5 text-[#843D9B]'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            <Icon size={15} /> {id}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 gap-3.5">
                                <Field label="Full name" className="col-span-2" placeholder="Receiver's name" value={formData.receiverName} onChange={set('receiverName')} required />
                                <Field label="Phone number" className="col-span-2" type="tel" inputMode="numeric" maxLength={13} placeholder="10-digit mobile number" value={formData.phone} onChange={set('phone')} required />
                                <Field label="House no., building, street" className="col-span-2" placeholder="e.g. 12B, Rose Apartments, MG Road" value={formData.street} onChange={set('street')} required />
                                <Field label="City" placeholder="City" value={formData.city} onChange={set('city')} required />
                                <Field label="Pincode" inputMode="numeric" maxLength={6} placeholder="6-digit pincode" value={formData.zipCode} onChange={set('zipCode')} required />
                                <Field label="State" className="col-span-2" placeholder="State" value={formData.state} onChange={set('state')} required />
                            </div>

                            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 px-3.5 py-3">
                                <input
                                    type="checkbox"
                                    checked={!!formData.isDefault}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                                    className="h-4 w-4 accent-[#843D9B]"
                                />
                                <span className="text-sm font-medium text-gray-700">Make this my default address</span>
                            </label>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="h-12 rounded-xl bg-[#843D9B] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6f3284] disabled:opacity-60"
                                >
                                    {isLoading ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
                                </button>
                            </div>
                        </motion.form>
                    ) : (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                            {isLoading && addresses.length === 0 ? (
                                [1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-gray-100 bg-white" />)
                            ) : addresses.length === 0 ? (
                                <div className="rounded-2xl border border-gray-100 bg-white px-6 py-14 text-center shadow-sm">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#843D9B]/10 text-[#843D9B]">
                                        <MapPin size={28} />
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900">No saved addresses yet</h3>
                                    <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
                                        Add an address so we can pick up your fabric and deliver your outfit.
                                    </p>
                                    <button
                                        onClick={openAdd}
                                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#843D9B] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#6f3284]"
                                    >
                                        <Plus size={17} /> Add Address
                                    </button>
                                </div>
                            ) : (
                                sorted.map((addr) => {
                                    const Icon = typeIcon(addr.type);
                                    const cityLine = [addr.city, addr.state].filter(Boolean).join(', ');
                                    return (
                                        <div
                                            key={addr._id}
                                            className={`rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                                                addr.isDefault ? 'border-[#843D9B]/40 ring-1 ring-[#843D9B]/15' : 'border-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <div
                                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                                        addr.isDefault ? 'bg-[#843D9B] text-white' : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    <Icon size={18} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-bold text-gray-900">{addr.type || 'Address'}</h3>
                                                        {addr.isDefault && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-[#843D9B]/10 px-2 py-0.5 text-[10px] font-semibold text-[#843D9B]">
                                                                <CheckCircle2 size={11} /> Default
                                                            </span>
                                                        )}
                                                    </div>
                                                    {addr.receiverName && (
                                                        <p className="mt-1.5 text-sm font-semibold text-gray-800">{addr.receiverName}</p>
                                                    )}
                                                    <p className="mt-0.5 break-words text-[13px] leading-relaxed text-gray-600">
                                                        {addr.street}
                                                        {cityLine && <><br />{cityLine}</>}
                                                        {addr.zipCode && ` - ${addr.zipCode}`}
                                                    </p>
                                                    {addr.phone && (
                                                        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-gray-600">
                                                            <Phone size={13} className="text-gray-400" /> {addr.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                                                {!addr.isDefault && (
                                                    <button
                                                        onClick={() => makeDefault(addr)}
                                                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#843D9B] transition-colors hover:bg-[#843D9B]/5"
                                                    >
                                                        <Star size={14} /> Set as default
                                                    </button>
                                                )}
                                                <div className="ml-auto flex items-center gap-1">
                                                    <button
                                                        onClick={() => openEdit(addr)}
                                                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                                                    >
                                                        <Pencil size={14} /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(addr._id)}
                                                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
            <BottomNav />
        </div>
    );
};

export default AddressPage;
