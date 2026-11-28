import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, History, Bell, MapPin, Shield, LogOut, ChevronRight, FileText, Save, X, Phone, Mail, Wallet, Star, Ticket, Navigation, Trash2, AlertTriangle } from 'lucide-react';
import { Input, Button } from '../components/UIElements';
import { useTailorAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import ImageUploader from '../../../components/Common/ImageUploader';
import useUnifiedLocation from '../../../shared/hooks/useUnifiedLocation';
import PlacesAutocompleteField from '../../../shared/components/PlacesAutocompleteField';
import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import useBrandingStore from '../../../store/brandingStore';
import { getPageCache, setPageCache } from '../utils/pageCache';

const profileToForm = (data) => ({
    shopName: data.shopName || '',
    name: data.user?.name || '',
    email: data.user?.email || '',
    phoneNumber: data.user?.phoneNumber || '',
    bio: data.bio || '',
    address: data.location?.address || '',
    latitude: data.location?.coordinates?.[1] || null,
    longitude: data.location?.coordinates?.[0] || null,
    profileImage: data.user?.profileImage || ''
});

const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry', 'drawing'];

// One row of the grouped profile menu: icon, label, optional sub-label / extra, chevron
const ProfileRow = ({ icon, label, subLabel, extra, to, onClick, danger }) => {
    const Icon = icon;
    const Comp = to ? Link : 'button';
    return (
        <Comp
            to={to}
            onClick={onClick}
            type={to ? undefined : 'button'}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${danger ? 'hover:bg-rose-50/60' : 'hover:bg-gray-50'}`}
        >
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-rose-50 text-rose-600' : 'bg-[#F5EDFA] text-[#843D9B]'}`}>
                <Icon size={18} />
            </span>
            <span className="flex-1 min-w-0">
                <span className={`block text-sm font-semibold leading-tight truncate ${danger ? 'text-rose-600' : 'text-gray-900'}`}>{label}</span>
                {subLabel && <span className="block text-[11px] text-gray-500 mt-0.5 truncate">{subLabel}</span>}
            </span>
            {extra}
            <ChevronRight size={18} className={`shrink-0 ${danger ? 'text-rose-300' : 'text-gray-300'}`} />
        </Comp>
    );
};

const ProfileSettings = ({ page = null }) => {
    const navigate = useNavigate();
    const { logout, user } = useTailorAuth();
    const userId = user?._id || user?.id;
    const cached = getPageCache(userId, 'profile');
    const appName = useBrandingStore(state => state.appName);
    const [isEditing, setIsEditing] = useState(false);
    const closeEdit = () => (page === 'edit' ? navigate('/partner/settings') : setIsEditing(false));
    const [isEditingPickup, setIsEditingPickup] = useState(false);
    const [activeModal, setActiveModal] = useState(null); // 'pickup', 'terms', 'privacy'
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!cached);
    const [profile, setProfile] = useState(cached?.profile || null);
    const [isSubEnabled, setIsSubEnabled] = useState(cached?.isSubEnabled ?? true);
    const isEditingRef = useRef(false);
    isEditingRef.current = isEditing;
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [reviewsData, setReviewsData] = useState(null); // { rating, totalReviews, reviews }
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);

    const loadReviews = async () => {
        setIsLoadingReviews(true);
        try {
            const res = await api.get('/tailors/my-reviews');
            if (res.data.success) setReviewsData(res.data.data);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast.error('Could not load your reviews');
        } finally {
            setIsLoadingReviews(false);
        }
    };

    // /partner/reviews loads the reviews as soon as the page opens
    useEffect(() => {
        if (page === 'reviews') loadReviews();
    }, [page]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formData, setFormData] = useState(() => profileToForm(cached?.profile || {}));

    const { detectLocation, isLocating } = useUnifiedLocation({ fetchAddress: true });

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    useEffect(() => {
        if (showDeleteModal || showLogoutModal || activeModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [showDeleteModal, showLogoutModal, activeModal]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/tailors/me');
                let data = null;
                if (res.data.success) {
                    data = res.data.data;
                    setProfile(data);
                    // never overwrite what the tailor is typing
                    if (!isEditingRef.current) setFormData(profileToForm(data));
                }
                let subEnabled = true;
                try {
                    const cfgRes = await api.get('/subscriptions/config');
                    if (cfgRes.data?.success && cfgRes.data.data?.tailorSubscriptionEnabled === false) {
                        subEnabled = false;
                    }
                } catch (e) {}
                setIsSubEnabled(subEnabled);
                if (data) setPageCache(userId, 'profile', { profile: data, isSubEnabled: subEnabled });
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    const handleAutoLocation = async () => {
        try {
            const data = await detectLocation();
            if (data) {
                setFormData({
                    ...formData,
                    address: data.address,
                    latitude: data.latitude,
                    longitude: data.longitude
                });
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Could not fetch address details automatically.");
        }
    };

    const handleMapClick = (e) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results[0]) {
                setFormData(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    address: results[0].formatted_address
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng
                }));
            }
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        // Strict Owner Name validation (Letters and spaces only, no numbers or special chars)
        const cleanName = (formData.name || '').replace(/[^a-zA-Z\s]/g, '').trim();
        if (!cleanName) {
            toast.error('Owner name should contain only letters and spaces');
            return;
        }

        // Strict 10-digit Contact Number validation
        const cleanPhone = (formData.phoneNumber || '').replace(/\D/g, '');
        if (!cleanPhone) {
            toast.error('Contact number is required');
            return;
        }
        if (cleanPhone.length !== 10) {
            toast.error('Contact number must be exactly 10 digits');
            return;
        }

        setIsSaving(true);
        try {
            let uploadedImageUrl = formData.profileImage;
            if (formData.profileImage instanceof File) {
                const formDataObj = new FormData();
                formDataObj.append('image', formData.profileImage);
                formDataObj.append('folder', 'tailor_profiles');
                
                try {
                    const res = await api.post('/upload/public', formDataObj, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    uploadedImageUrl = res.data.data;
                } catch (err) {
                    toast.error('Failed to upload image');
                    setIsSaving(false);
                    return;
                }
            }

            const payload = { 
                ...formData, 
                phoneNumber: cleanPhone,
                profileImage: uploadedImageUrl 
            };
            const res = await api.patch('/tailors/profile', payload);
            if (res.data.success) {
                setProfile(res.data.data);
                setPageCache(userId, 'profile', undefined); // refetch fresh on next visit
                setFormData({ ...formData, phoneNumber: cleanPhone, profileImage: uploadedImageUrl });
                closeEdit();
                toast.success("Profile details saved successfully!");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/partner/login');
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return;
        setIsDeleting(true);
        try {
            await api.delete('/auth/delete-account');
            await logout();
            navigate('/partner/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete account');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setDeleteConfirmText('');
        }
    };

    const menuOptions = [
        { icon: <Edit2 size={20} />, label: 'Edit Profile', action: () => setIsEditing(true) },
        ...(isSubEnabled ? [{ icon: <Ticket size={20} />, label: 'Subscription Plan', path: '/partner/subscription' }] : []),
        { icon: <History size={20} />, label: 'Order History', path: '/partner/orders' },
        { icon: <Bell size={20} />, label: 'Notifications', path: '/partner/notifications' },
        { icon: <MapPin size={20} />, label: 'Pick Up Information', action: () => setActiveModal('pickup') },
        { icon: <FileText size={20} />, label: 'Terms & Conditions', action: () => setActiveModal('terms') },
        { icon: <Shield size={20} />, label: 'Privacy & Security', action: () => setActiveModal('privacy') },
    ];

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>;
    }

    const renderModalContent = (which = activeModal) => {
        switch (which) {
            case 'reviews': {
                if (isLoadingReviews) {
                    return (
                        <div className="py-12 flex justify-center">
                            <div className="h-8 w-8 border-[3px] border-[#843D9B]/20 border-t-[#843D9B] rounded-full animate-spin" />
                        </div>
                    );
                }
                const rating = reviewsData?.rating || 0;
                const total = reviewsData?.totalReviews || 0;
                const reviews = reviewsData?.reviews || [];
                return (
                    <div className="space-y-5">
                        {/* Summary */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-[#843D9B] p-4 rounded-2xl text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 border border-white/10">
                                    <Star size={22} className="text-amber-400 fill-amber-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Your Rating</p>
                                    <p className="leading-none mt-1">
                                        <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
                                        <span className="text-xs font-semibold text-amber-400 ml-1">/ 5.0</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold leading-none">{total}</p>
                                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mt-1">Total Reviews</p>
                            </div>
                        </div>

                        {/* List */}
                        {reviews.length === 0 ? (
                            <div className="text-center py-8">
                                <Star size={32} className="mx-auto text-gray-200" />
                                <p className="text-sm font-semibold text-gray-700 mt-3">No reviews yet</p>
                                <p className="text-xs text-gray-400 mt-1">Reviews from your customers will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reviews.map((review) => {
                                    const name = review.user?.name || review.name || 'Customer';
                                    const photo = review.user?.profileImage;
                                    return (
                                        <div key={review._id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {photo && photo !== 'default_profile.png' ? (
                                                        <img src={photo} alt={name} className="h-9 w-9 rounded-full object-cover shrink-0" />
                                                    ) : (
                                                        <div className="h-9 w-9 rounded-full bg-[#843D9B]/10 text-[#843D9B] flex items-center justify-center text-sm font-bold shrink-0">
                                                            {name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                                                        <p className="text-[11px] text-gray-400">
                                                            {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    {[1, 2, 3, 4, 5].map((i) => (
                                                        <Star key={i} size={13} className={i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                                                    ))}
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className="text-sm text-gray-600 mt-3 leading-relaxed">{review.comment}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            }
            case 'pickup':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900">Pick Up Information</h3>
                            {!isEditingPickup && (
                                <button 
                                    onClick={() => setIsEditingPickup(true)}
                                    className="p-2 bg-indigo-50 text-primary rounded-xl hover:bg-indigo-100 transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-600">Default pickup location is your registered shop address. Delivery partners will arrive between 10 AM - 6 PM.</p>
                        
                        {isEditingPickup ? (
                            <form onSubmit={(e) => {
                                handleSave(e);
                                setIsEditingPickup(false);
                            }} className="space-y-4 mt-4 animate-in fade-in zoom-in-95 duration-200">
                                {isLoaded ? (
                                    <div className="space-y-3">
                                        <PlacesAutocompleteField
                                            label="Shop Address"
                                            name="address"
                                            placeholder="Start typing your shop address..."
                                            required
                                            value={formData.address}
                                            onChange={(val) => setFormData({ ...formData, address: val })}
                                            onClear={() => setFormData({ ...formData, address: '', latitude: null, longitude: null })}
                                            onPlaceSelect={(placeData) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    address: placeData.address,
                                                    latitude: placeData.latitude,
                                                    longitude: placeData.longitude
                                                }));
                                            }}
                                        />
                                        <div className="h-48 w-full rounded-2xl overflow-hidden border border-gray-200 relative">
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={formData.latitude ? { lat: Number(formData.latitude), lng: Number(formData.longitude) } : { lat: 20.5937, lng: 78.9629 }}
                                                zoom={formData.latitude ? 15 : 4}
                                                options={{ disableDefaultUI: true, zoomControl: true }}
                                                onClick={handleMapClick}
                                            >
                                                {formData.latitude && (
                                                    <Marker position={{ lat: Number(formData.latitude), lng: Number(formData.longitude) }} />
                                                )}
                                            </GoogleMap>
                                            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-gray-600 shadow-sm pointer-events-none">Tap map to set location</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Shop Address</label>
                                        <input 
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 focus:border-primary rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-semibold text-gray-900"
                                            value={formData.address} 
                                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        />
                                    </div>
                                )}
                                
                                {formData.latitude && formData.longitude && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[9px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
                                            <MapPin size={10} className="text-emerald-500" />
                                            GPS: {Number(formData.latitude).toFixed(5)}, {Number(formData.longitude).toFixed(5)}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="flex justify-end gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEditingPickup(false)}
                                        className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Current Address</p>
                                <p className="text-sm font-medium text-gray-800">{formData.address}</p>
                                {formData.latitude && formData.longitude && (
                                    <p className="text-[10px] font-mono text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                        <MapPin size={10} />
                                        GPS Logged
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );
            case 'terms':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-black text-gray-900">Terms & Conditions</h3>
                        <div className="text-xs text-gray-600 space-y-2 h-48 overflow-y-auto custom-scrollbar pr-2 leading-relaxed">
                            <p>1. By using {appName}, you agree to fulfill all accepted orders within the specified deadline.</p>
                            <p>2. {formData.shopName} is responsible for the fabric quality if provided by the shop.</p>
                            <p>3. Payments are processed every Friday for completed orders.</p>
                            <p>4. Platform commission is fixed at 12% per transaction.</p>
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-black text-gray-900">Privacy & Security</h3>
                        <div className="space-y-3">
                            <Button onClick={() => alert("Change Password dialog opened")} variant="secondary" className="text-xs py-3 border-gray-200">Change Password</Button>
                            <Button onClick={() => alert("Manage Devices dialog opened")} variant="secondary" className="text-xs py-3 border-gray-200">Manage Devices</Button>
                            <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex items-start gap-2">
                                <Shield size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-red-700 leading-tight">Your data is fully encrypted. We never share your shop financials with third parties.</p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    // Profile edit form (shared by the inline card and /partner/edit-profile)
    const renderEditForm = () => (
                                <form onSubmit={handleSave} className={`${page === 'edit' ? '' : 'mt-6 md:mt-8'} space-y-4 animate-in fade-in duration-300`}>
                                    <div className="space-y-1 mb-6">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Profile Image</label>
                                        <div className="w-fit">
                                            <ImageUploader
                                                value={formData.profileImage === 'default_profile.png' ? null : formData.profileImage}
                                                onChange={(file) => setFormData({...formData, profileImage: file})}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Shop Name</label>
                                            <input 
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent focus:border-[#843D9B]/20 rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-black text-gray-900"
                                                value={formData.shopName} 
                                                onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Owner Name</label>
                                            <input 
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent focus:border-[#843D9B]/20 rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-black text-gray-900"
                                                placeholder="Enter owner name (Letters only)"
                                                value={formData.name} 
                                                onChange={(e) => {
                                                    const cleanVal = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                                    setFormData({...formData, name: cleanVal});
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Address</label>
                                            <input 
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent focus:border-[#843D9B]/20 rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-black text-gray-900"
                                                type="email" 
                                                value={formData.email} 
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center ml-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Number</label>
                                                <span className="text-[9px] font-bold text-gray-400">{formData.phoneNumber?.length || 0}/10 digits</span>
                                            </div>
                                            <input 
                                                className={`w-full px-5 py-3.5 bg-gray-50 border ${formData.phoneNumber && formData.phoneNumber.length > 0 && formData.phoneNumber.length < 10 ? 'border-rose-400 focus:border-rose-500' : 'border-transparent focus:border-[#843D9B]/20'} rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-black text-gray-900`}
                                                type="tel" 
                                                maxLength={10}
                                                placeholder="Enter 10-digit mobile number"
                                                value={formData.phoneNumber} 
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    setFormData({...formData, phoneNumber: val});
                                                }}
                                            />
                                            {formData.phoneNumber && formData.phoneNumber.length > 0 && formData.phoneNumber.length < 10 && (
                                                <p className="text-[10px] text-rose-500 font-bold ml-2">Must be exactly 10 digits</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center ml-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shop Address</label>
                                            <button 
                                                type="button"
                                                onClick={handleAutoLocation}
                                                disabled={isLocating}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
                                            >
                                                {isLocating ? (
                                                    <div className="w-3 h-3 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                                ) : (
                                                    <Navigation size={12} className="fill-primary/10" />
                                                )}
                                                {isLocating ? 'Locating...' : 'Detect Exact Location'}
                                            </button>
                                        </div>
                                        {isLoaded ? (
                                            <div className="space-y-3">
                                                <PlacesAutocompleteField
                                                    label=""
                                                    name="address"
                                                    placeholder="Search or detect exact location"
                                                    value={formData.address}
                                                    onChange={(val) => setFormData({ ...formData, address: val })}
                                                    onClear={() => setFormData({ ...formData, address: '', latitude: null, longitude: null })}
                                                    onPlaceSelect={(placeData) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            address: placeData.address,
                                                            latitude: placeData.latitude,
                                                            longitude: placeData.longitude
                                                        }));
                                                    }}
                                                />
                                                <div className="h-48 w-full rounded-2xl overflow-hidden border border-gray-200 relative">
                                                    <GoogleMap
                                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                                        center={formData.latitude ? { lat: Number(formData.latitude), lng: Number(formData.longitude) } : { lat: 20.5937, lng: 78.9629 }}
                                                        zoom={formData.latitude ? 15 : 4}
                                                        options={{ disableDefaultUI: true, zoomControl: true }}
                                                        onClick={handleMapClick}
                                                    >
                                                        {formData.latitude && (
                                                            <Marker position={{ lat: Number(formData.latitude), lng: Number(formData.longitude) }} />
                                                        )}
                                                    </GoogleMap>
                                                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-gray-600 shadow-sm pointer-events-none">Tap map to set location</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <input 
                                                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent focus:border-[#843D9B]/20 rounded-2xl focus:outline-none focus:bg-white transition-all text-sm font-black text-gray-900"
                                                value={formData.address} 
                                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                                placeholder="Detect exact location or enter address"
                                            />
                                        )}
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button 
                                            type="button"
                                            onClick={closeEdit}
                                            className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            disabled={isSaving}
                                            className="flex-[2] py-4 bg-[#843D9B] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#843D9B]/20 hover:bg-[#4E2460] transition-all"
                                        >
                                            {isSaving ? 'Saving Changes...' : 'Update Profile'}
                                        </button>
                                    </div>
                                </form>
    );

    // ── Full-page sections: /partner/reviews, /partner/pickup-info, /partner/privacy, /partner/edit-profile
    if (page) {
        const PAGE_TITLES = { reviews: 'Your Reviews', pickup: 'Pick Up Information', privacy: 'Privacy & Security', edit: 'Edit Profile' };
        return (
            <div className="min-h-full bg-[#F5F5F5] flex flex-col font-sans selection:bg-[#843D9B] selection:text-white pb-24 md:pb-8">
                <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-2 md:px-0 h-14 flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => navigate('/partner/settings')}
                        aria-label="Back to profile"
                        className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-base md:text-xl font-bold text-gray-900 tracking-tight">{PAGE_TITLES[page]}</h1>
                </div>
                <div className="flex-1 p-3 md:p-0 md:pt-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 max-w-2xl">
                        {page === 'edit' ? renderEditForm() : renderModalContent(page)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-[#F5F5F5] flex flex-col font-sans selection:bg-[#843D9B] selection:text-white pb-20">
            
            {/* ── MOBILE HEADER ── */}
            <div className="md:hidden relative bg-gradient-to-br from-[#6B2F7E] via-[#843D9B] to-[#9B5BB0] pt-[max(1rem,env(safe-area-inset-top))] pb-20 px-4 text-white shrink-0 overflow-hidden">
                <div className="relative z-10 flex items-center justify-between">
                    <button onClick={() => isEditing ? setIsEditing(false) : navigate(-1)} className="p-1.5 -ml-1.5 text-white hover:bg-white/10 rounded-xl transition-colors">
                        {isEditing ? <X size={20} /> : <ArrowLeft size={20} />}
                    </button>
                    <h1 className="text-base font-bold tracking-tight absolute left-1/2 -translate-x-1/2">
                        {isEditing ? 'Edit Profile' : 'Profile Settings'}
                    </h1>
                </div>
                {/* curved bottom edge, the avatar sits on it */}
                <div aria-hidden="true" className="absolute -bottom-px -left-[15%] -right-[15%] h-12 bg-[#F5F5F5] rounded-t-[100%]" />
            </div>

            <div className="flex-1 px-3 md:p-0">
                
                {/* ── DESKTOP TITLE ── */}
                <div className="hidden md:block py-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Account & Security</h2>
                    <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Manage your shop profile and platform preferences</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
                    
                    {/* LEFT: PROFILE SUMMARY & EDIT FORM */}
                    <div className="flex-1 space-y-4 md:space-y-6">
                        
                        {/* Profile Overview Card */}
                        <div className="bg-transparent md:bg-white rounded-2xl px-1 pb-1 pt-0 md:p-8 border-0 md:border md:border-gray-100 shadow-none md:shadow-sm relative z-10 group -mt-16 md:mt-0">
                            
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-3 md:gap-6">
                                <div className="h-24 w-24 bg-[#843D9B] rounded-full ring-4 ring-white flex items-center justify-center text-white shadow-lg shadow-[#843D9B]/25 relative">
                                    {(profile?.user?.profileImage && profile?.user?.profileImage !== 'default_profile.png') ? (
                                        <img src={profile.user.profileImage} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                        <span className="text-3xl font-black">{profile?.shopName?.charAt(0) || formData.name?.charAt(0) || 'R'}</span>
                                    )}
                                    <button 
                                        onClick={() => navigate('/partner/edit-profile')}
                                        aria-label="Edit profile"
                                        className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md border border-gray-100 text-[#843D9B] hover:bg-[#843D9B] hover:text-white transition-all"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                                <div className="text-center md:text-left">
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-tight">{profile?.shopName || 'Luxury Stitches'}</h2>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                                        <span className="inline-flex items-center gap-1 bg-[#F5EDFA] text-[#843D9B] px-2.5 py-1 rounded-full text-[11px] font-semibold">
                                            <Shield size={12} /> Verified Partner
                                        </span>
                                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                                            Premium Tier
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {isEditing ? renderEditForm() : (
                                <div className="mt-4 md:mt-8 bg-white md:bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100 md:grid md:grid-cols-2 md:divide-y-0 md:divide-x">
                                    <div className="flex items-center gap-3 px-3.5 py-3 min-w-0">
                                        <span className="w-8 h-8 rounded-lg bg-[#F5EDFA] md:bg-white flex items-center justify-center text-[#843D9B] shrink-0"><Phone size={15} /></span>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-500 font-medium">Mobile Number</p>
                                            <p className="text-sm font-semibold text-gray-900 truncate">{formData.phoneNumber || 'Not provided'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 px-3.5 py-3 min-w-0">
                                        <span className="w-8 h-8 rounded-lg bg-[#F5EDFA] md:bg-white flex items-center justify-center text-[#843D9B] shrink-0"><Mail size={15} /></span>
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-500 font-medium">Email Access</p>
                                            <p className="text-sm font-semibold text-gray-900 truncate">{formData.email || 'Not provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: NAVIGATION MENU */}
                    <div className="w-full lg:w-[400px] space-y-4 md:space-y-6 pb-4">
                        
                        {/* Account Actions */}
                        <div>
                            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Quick Navigation</h3>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                                <ProfileRow
                                    icon={Wallet}
                                    label="Wallet & Payouts"
                                    subLabel="Check your balance"
                                    extra={<span className="bg-green-50 text-[10px] font-semibold px-2.5 py-1 rounded-full text-green-600 border border-green-100 shrink-0">₹ 0</span>}
                                    to="/partner/wallet"
                                />
                                {isSubEnabled && (
                                    <ProfileRow
                                        icon={Ticket}
                                        label="Subscription Plan"
                                        subLabel="Manage your plan"
                                        to="/partner/subscription"
                                    />
                                )}
                                <ProfileRow
                                    icon={Star}
                                    label="Your Reviews"
                                    subLabel="Rating & customer feedback"
                                    to="/partner/reviews"
                                />
                                <ProfileRow
                                    icon={MapPin}
                                    label="Pick Up Info"
                                    subLabel="Manage addresses"
                                    to="/partner/pickup-info"
                                />
                                <ProfileRow
                                    icon={Shield}
                                    label="Privacy & Terms"
                                    subLabel="Legal guidelines"
                                    to="/partner/privacy"
                                />
                                {/* Test Push */}
                                <ProfileRow
                                    icon={Bell}
                                    label="Test Push"
                                    subLabel="Send a test notification"
                                    onClick={async () => {
                                        try {
                                            const { testPushToThisDevice } = await import('../../../hooks/usePushNotifications');
                                            await testPushToThisDevice();
                                            toast.success('Test push sent to this device!');
                                        } catch (err) {
                                            toast.error('Failed to send test push: ' + (err.response?.data?.message || err.message));
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Logout & Delete Account */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
                            <ProfileRow
                                icon={LogOut}
                                label="Logout Account"
                                subLabel="End current session"
                                onClick={() => setShowLogoutModal(true)}
                                danger
                            />
                            <ProfileRow
                                icon={Trash2}
                                label="Delete Account"
                                subLabel="Permanently remove your account"
                                onClick={() => setShowDeleteModal(true)}
                                danger
                            />
                        </div>

                    </div>
                </div>
            </div>

            {/* Slide-up Modals for Desktop/Mobile */}
            {activeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 max-h-[85vh]">
                        <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-gray-50">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                {activeModal === 'reviews' ? 'Your Reviews' : activeModal === 'pickup' ? 'Pick Up Information' : activeModal === 'terms' ? 'Terms & Conditions' : 'Privacy & Security'}
                            </h3>
                            <button
                                onClick={() => setActiveModal(null)}
                                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
                            {renderModalContent()}
                        </div>
                        <div className="p-8 border-t border-gray-50">
                            <button 
                                onClick={() => setActiveModal(null)} 
                                className="w-full bg-[#843D9B] text-white rounded-2xl py-4 font-black uppercase tracking-widest text-[10px] shadow-xl shadow-[#843D9B]/20 active:scale-95 transition-all"
                            >
                                {activeModal === 'reviews' ? 'Close' : 'Close Information'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
                                <AlertTriangle size={28} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Delete Account?</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">This action is <span className="font-bold text-red-600">permanent</span> and cannot be undone. All your shop data, orders, and earnings history will be lost forever.</p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Type DELETE to confirm</label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-center tracking-widest focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowLogoutModal(false)}>
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center">
                                <LogOut size={28} className="text-rose-600" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Logout Account?</h3>
                            <p className="text-xs text-gray-500 leading-relaxed">Are you sure you want to end your current session? You will need to login again to access your account.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-rose-700 transition-all"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSettings;
