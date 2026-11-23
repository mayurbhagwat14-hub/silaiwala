import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Package, Tag, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';

const DEFAULTS = { orderUpdates: true, promotions: false, reminders: true };

const OPTIONS = [
    { key: 'orderUpdates', icon: Package, title: 'Order Updates', desc: 'Order status, pickup, delivery and tailor updates.' },
    { key: 'promotions', icon: Tag, title: 'Promotions & Offers', desc: 'Sales, new coupons and discounts.' },
    { key: 'reminders', icon: Clock, title: 'Reminders', desc: 'Pending cart items, measurement profiles and more.' },
];

const Toggle = ({ checked, onChange, disabled, label }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${checked ? 'bg-[#843D9B]' : 'bg-gray-300'}`}
    >
        <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-6' : 'left-1'}`}
        />
    </button>
);

const NotificationSettings = () => {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(DEFAULTS);
    const [isLoading, setIsLoading] = useState(true);
    const [savingKey, setSavingKey] = useState(null);

    // Load the saved preferences so the page reflects what the user chose last time.
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await api.get('/customers/profile');
                const saved = res.data?.data?.profile?.notificationPreferences;
                if (active && saved) setSettings({ ...DEFAULTS, ...saved });
            } catch (err) {
                if (active) toast.error('Could not load your notification settings');
            } finally {
                if (active) setIsLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    const toggleSetting = async (key) => {
        const next = !settings[key];
        setSettings((prev) => ({ ...prev, [key]: next }));
        setSavingKey(key);
        try {
            await api.patch('/customers/profile', { notificationPreferences: { [key]: next } });
        } catch (err) {
            setSettings((prev) => ({ ...prev, [key]: !next }));
            toast.error('Could not save. Please try again.');
        } finally {
            setSavingKey(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F5FA] pb-20 font-sans text-gray-900">
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-[17px] font-bold leading-tight">Notifications</h1>
                        <p className="text-xs text-gray-500">Choose what you want to hear about</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-xl px-4 py-5">
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    {OPTIONS.map(({ key, icon: Icon, title, desc }) => (
                        <div key={key} className="flex items-center gap-3.5 border-b border-gray-100 px-4 py-4 last:border-b-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#843D9B]/10 text-[#843D9B]">
                                <Icon size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                                <p className="mt-0.5 text-xs leading-snug text-gray-500">{desc}</p>
                            </div>
                            {isLoading ? (
                                <div className="h-7 w-12 animate-pulse rounded-full bg-gray-200" />
                            ) : (
                                <Toggle
                                    label={title}
                                    checked={!!settings[key]}
                                    disabled={savingKey === key}
                                    onChange={() => toggleSetting(key)}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <p className="mt-4 flex items-start gap-2 px-1 text-xs leading-relaxed text-gray-500">
                    <Bell size={14} className="mt-0.5 shrink-0 text-gray-400" />
                    Important alerts about payments, OTPs and account security are always sent.
                </p>
            </main>
        </div>
    );
};

export default NotificationSettings;
