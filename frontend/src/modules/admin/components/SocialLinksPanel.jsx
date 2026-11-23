import React, { useEffect, useState } from 'react';
import { Instagram, Facebook, Twitter, Youtube, Linkedin, MessageCircle, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';

const PLATFORMS = [
    { key: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/sewzella' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/sewzella' },
    { key: 'twitter', label: 'X (Twitter)', icon: Twitter, placeholder: 'https://x.com/sewzella' },
    { key: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@sewzella' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/company/sewzella' },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, placeholder: 'https://wa.me/919999999999' },
];

const EMPTY = PLATFORMS.reduce((acc, p) => ({ ...acc, [p.key]: '' }), {});

const isValidUrl = (value) => {
    if (!value) return true;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

/** Admin → CMS → Social Links: URLs shown as icons in the landing-page footer. Empty = hidden. */
const SocialLinksPanel = () => {
    const [links, setLinks] = useState(EMPTY);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/admin/settings');
                setLinks({ ...EMPTY, ...(res.data?.data?.general?.socialLinks || {}) });
            } catch (error) {
                toast.error('Failed to load social links');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const handleSave = async () => {
        const cleaned = Object.fromEntries(PLATFORMS.map((p) => [p.key, (links[p.key] || '').trim()]));
        const invalid = PLATFORMS.find((p) => !isValidUrl(cleaned[p.key]));
        if (invalid) {
            toast.error(`${invalid.label} link must start with http:// or https://`);
            return;
        }
        setIsSaving(true);
        try {
            await api.put('/admin/settings', { general: { socialLinks: cleaned } });
            setLinks(cleaned);
            toast.success('Social links updated');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to save social links');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Social Media Links</h3>
                <p className="text-xs text-gray-500 mt-1">
                    These appear as icons in the website footer. Leave a field empty to hide that icon.
                </p>
            </div>

            {PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
                <label key={key} className="block">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
                    <div className="mt-1.5 flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 focus-within:border-primary focus-within:bg-white transition-all">
                        <Icon size={16} className="text-primary shrink-0" />
                        <input
                            type="url"
                            value={links[key]}
                            disabled={isLoading}
                            onChange={(e) => setLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full bg-transparent py-3 text-sm text-gray-900 outline-none disabled:opacity-50"
                        />
                    </div>
                </label>
            ))}

            <button
                onClick={handleSave}
                disabled={isLoading || isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-dark text-white text-xs font-black rounded-xl hover:bg-purple-800 shadow-lg shadow-purple-900/20 transition-all uppercase tracking-widest cursor-pointer disabled:opacity-60"
            >
                <Save size={16} /> {isSaving ? 'Saving...' : 'Save Links'}
            </button>
        </div>
    );
};

export default SocialLinksPanel;
