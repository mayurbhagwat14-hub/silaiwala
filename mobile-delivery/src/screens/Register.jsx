import Checkbox from '../components/ui/Checkbox';
import { Alert } from 'react-native';
import { pickImage, isPickedFile } from '../lib/files';
import { persistPickedFile, fileStillExists, clearSignupFiles } from '../lib/signupFiles';
import React from 'react';
import Spin from '../components/ui/Spin';
import storage from '../lib/storage';
import Select from '../components/ui/Select';
import { Mail as FiMail, Lock as FiLock, Eye as FiEye, EyeOff as FiEyeOff, User as FiUser, Phone as FiPhone, Truck as FiTruck, Camera as FiCamera, ChevronRight as FiChevronRight, ChevronLeft as FiChevronLeft, Check as FiCheck, FileText as FiFileText, Shield as FiShield, CreditCard as FiCreditCard, Trash2 as FiTrash2, Navigation as FiNavigation, RotateCcw as FiRotateCcw } from 'lucide-react-native';
// Port of modules/delivery/pages/Register.jsx (converted with scripts/web2rn.js, then reviewed)
import { useState, useRef, useEffect } from "react";
import {  useNavigate } from '../lib/nav';
import toast from '../lib/toast';
import { useDeliveryAuthStore } from "../store/deliveryStore";
import api from "../lib/api";
import { scrollAuthToTop } from "../components/delivery/DeliveryAuthLayout";
import useBrandingStore from "../store/brandingStore";
import PlacesAutocompleteField from "../components/shared/PlacesAutocompleteField";
import { useUnifiedLocation } from "../shared/hooks/useUnifiedLocation";
import { Btn, Input, Box, Img, Txt, Scroll, I } from '../components/ui/primitives';
const STEPS = [{
  id: 1,
  title: 'Personal Info',
  icon: FiUser
}, {
  id: 2,
  title: 'Vehicle & Documents',
  icon: FiFileText
}, {
  id: 3,
  title: 'Address & Bank',
  icon: FiTruck
}];
const DRAFT_KEY = 'delivery_signup_draft_v2';
const PHOTO_KEYS = ['profileImage', 'licenseFront', 'licenseBack', 'aadharFront', 'aadharBack'];

// Fields that belong to each step — "Reset this step" clears only these.
const STEP_FIELDS = {
  1: { text: ['name', 'email', 'phone', 'emergencyContact', 'aadharNumber', 'password'], photos: ['profileImage'] },
  2: { text: ['vehicleNumber'], photos: ['licenseFront', 'licenseBack', 'aadharFront', 'aadharBack'] },
  3: { text: ['address', 'latitude', 'longitude', 'accountHolderName', 'accountNumber', 'bankName', 'ifscCode'], photos: [] },
};

const isBicycle = (type) => type === 'Bicycle';

// Indian plates: "MH 12 AB 1234", "DL 1 C 1234", and the Bharat series "22 BH 1234 AA".
const VEHICLE_RE = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;
const BH_RE = /^\d{2}BH\d{4}[A-Z]{1,2}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** One validation message per field; '' when the value is fine. Used live (on blur) and on Next/Submit. */
const fieldError = (name, value, form = {}) => {
  const v = String(value ?? '').trim();
  switch (name) {
    case 'name':
      if (!v) return 'Full name is required';
      if (!/^[a-zA-Z\s]+$/.test(v)) return 'Full name can contain only letters';
      if (v.replace(/\s/g, '').length < 3) return 'Full name must be at least 3 letters';
      return '';
    case 'accountHolderName':
      if (!v) return 'Account holder name is required';
      if (!/^[a-zA-Z\s]+$/.test(v)) return 'Account holder name can contain only letters';
      if (v.replace(/\s/g, '').length < 3) return 'Account holder name must be at least 3 letters';
      return '';
    case 'vehicleNumber': {
      if (isBicycle(form.vehicleType)) return '';
      const plate = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!plate) return 'Vehicle registration number is required';
      if (!VEHICLE_RE.test(plate) && !BH_RE.test(plate)) return 'Enter a valid number plate, e.g. MH 12 AB 1234';
      return '';
    }
    case 'accountNumber':
      if (!v) return 'Bank account number is required';
      if (!/^\d+$/.test(v)) return 'Account number can contain only digits';
      if (v.length < 9 || v.length > 18) return 'Account number must be 9 to 18 digits';
      if (/^0+$/.test(v)) return 'Enter a valid account number';
      return '';
    case 'ifscCode': {
      const code = v.toUpperCase();
      if (!code) return 'IFSC code is required';
      if (code.length !== 11) return 'IFSC code must be 11 characters';
      if (!IFSC_RE.test(code)) return 'Invalid IFSC: 4 letters, then 0, then 6 letters/digits (e.g. SBIN0001234)';
      return '';
    }
    default:
      return '';
  }
};
const DeliveryRegister = () => {
  const navigate = useNavigate();
  const {
    register,
    sendRegistrationOtp,
    verifyRegistrationOtp,
    isLoading
  } = useDeliveryAuthStore();
  const {
    appName,
    logos
  } = useBrandingStore();
  const fileInputRefs = useRef({});
  const isLoaded = true;
  const loadError = null;
  const {
    detectLocation,
    isLocating
  } = useUnifiedLocation();

  // Restore the draft (text fields + paths of photos kept on disk) after an app restart / network drop
  const getInitialState = () => {
    try {
      const saved = storage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const files = {};
        const previews = {};
        PHOTO_KEYS.forEach((k) => {
          const f = parsed.files?.[k];
          if (f?.uri && fileStillExists(f.uri)) {
            files[k] = f;
            previews[k] = f.uri;
          }
        });
        return {
          currentStep: parsed.currentStep || 1,
          formData: { ...(parsed.formData || {}), ...files },
          previews,
          isPhoneVerified: parsed.isPhoneVerified || false
        };
      }
    } catch (e) {
      console.error("Error reading draft:", e);
    }
    return {
      currentStep: 1,
      formData: {},
      previews: {},
      isPhoneVerified: false
    };
  };
  const initialState = getInitialState();
  const [currentStep, setCurrentStep] = useState(initialState.currentStep);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergencyContact: '',
    aadharNumber: '',
    email: '',
    password: '',
    address: '',
    latitude: '',
    longitude: '',
    vehicleType: 'Bike (Motorcycle)',
    vehicleNumber: '',
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    ...initialState.formData
  });
  const [previews, setPreviews] = useState(initialState.previews || {});
  const [isPhoneVerified, setIsPhoneVerified] = useState(initialState.isPhoneVerified || false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [phoneOtp, setPhoneOtp] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Save draft to localStorage to survive refreshes and network loss
  useEffect(() => {
    try {
      const draftPayload = {
        currentStep,
        formData: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          emergencyContact: formData.emergencyContact,
          aadharNumber: formData.aadharNumber,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          accountHolderName: formData.accountHolderName,
          accountNumber: formData.accountNumber,
          bankName: formData.bankName,
          ifscCode: formData.ifscCode
        },
        // Only small { uri, name, type } records — the photos themselves stay on disk
        files: Object.fromEntries(PHOTO_KEYS.filter((k) => isPickedFile(formData[k])).map((k) => [k, {
          uri: formData[k].uri,
          name: formData[k].name,
          type: formData[k].type,
          size: formData[k].size || 0
        }])),
        isPhoneVerified
      };
      storage.setItem(DRAFT_KEY, JSON.stringify(draftPayload));
    } catch (e) {
      console.warn("Draft save failed:", e);
    }
  }, [formData, previews, currentStep, isPhoneVerified]);
  const handlePlaceSelect = place => {
    if (!place) return;
    const addr = place.formatted_address || place.name || '';
    const lat = place.geometry?.location ? typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat : null;
    const lng = place.geometry?.location ? typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng : null;
    setFormData(prev => ({
      ...prev,
      address: addr,
      latitude: lat ? String(lat) : prev.latitude,
      longitude: lng ? String(lng) : prev.longitude
    }));
    setFieldErrors(prev => ({
      ...prev,
      address: ''
    }));
  };
  const handleDetectLocation = async () => {
    try {
      const loc = await detectLocation();
      if (loc) {
        setFormData(prev => ({
          ...prev,
          address: loc.address || loc.formattedAddress || prev.address,
          latitude: loc.latitude ? String(loc.latitude) : prev.latitude,
          longitude: loc.longitude ? String(loc.longitude) : prev.longitude
        }));
        setFieldErrors(prev => ({
          ...prev,
          address: ''
        }));
        toast.success("Location detected!");
      }
    } catch (err) {
      console.error("Detect location failed:", err);
      toast.error("Could not detect location. Please type manually.");
    }
  };
  const checkUserExistsInBackend = async (emailVal, phoneVal) => {
    try {
      const payload = {};
      if (emailVal && emailVal.trim()) payload.email = emailVal.trim();
      if (phoneVal && phoneVal.trim()) payload.phoneNumber = phoneVal.trim();
      if (!payload.email && !payload.phoneNumber) return false;
      const res = await api.post('/auth/check-user', payload);
      if (res.data && res.data.exists) {
        const conflictField = res.data.field === 'email' ? 'email' : 'phone';
        const msg = res.data.message || (conflictField === 'email' ? 'A user with this email address already exists' : 'A user with this mobile number already exists');
        setFieldErrors(prev => ({
          ...prev,
          [conflictField]: msg
        }));
        toast.error(msg);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Check user API error:', err);
      return false;
    }
  };
  const handleChange = e => {
    const {
      name,
      value,
      files
    } = e.target;
    setFieldErrors(prev => ({
      ...prev,
      [name]: ''
    }));

    // Photos: kept as files on disk (see persistPhoto); preview shows the same file
    if (PHOTO_KEYS.includes(name)) {
      const file = files?.[0] || null;
      if (file) {
        setPreviews(prev => ({ ...prev, [name]: file.uri }));
        setFormData(prev => ({ ...prev, [name]: file }));
      }
      return;
    }

    // 1. Full Name & Account Holder Name: ONLY letters and single spaces (digits/symbols are dropped as typed)
    if (name === 'name' || name === 'accountHolderName') {
      const lettersOnly = value.replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
      setFormData(prev => ({
        ...prev,
        [name]: lettersOnly
      }));
      return;
    }

    // 2. Bank Account Number: ONLY digits, max 18
    if (name === 'accountNumber') {
      const numericValue = value.replace(/\D/g, '').slice(0, 18);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      if (numericValue.length >= 9) {
        setFieldErrors(prev => ({ ...prev, accountNumber: fieldError('accountNumber', numericValue) }));
      }
      return;
    }

    // Vehicle type: a bicycle needs no plate or driving licence, so drop those
    if (name === 'vehicleType') {
      setFormData(prev => ({
        ...prev,
        vehicleType: value,
        ...(isBicycle(value) ? { vehicleNumber: '', licenseFront: null, licenseBack: null } : {})
      }));
      if (isBicycle(value)) {
        setPreviews(prev => ({ ...prev, licenseFront: undefined, licenseBack: undefined }));
        setFieldErrors(prev => ({ ...prev, vehicleNumber: '' }));
      }
      return;
    }

    // 3. Aadhaar, Phone, Emergency Contact
    if (['aadharNumber', 'phone', 'emergencyContact'].includes(name)) {
      const numericValue = value.replace(/\D/g, '');
      if (name === 'aadharNumber') {
        const formatted = numericValue.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
        setFormData(prev => ({
          ...prev,
          [name]: formatted
        }));
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      if (name === 'phone') {
        setIsPhoneVerified(false);
        setShowOtpField(false);
      }
      return;
    }

    // 4. IFSC Code: Uppercase Alphanumeric max 11 chars
    if (name === 'ifscCode') {
      const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
      // Full length typed: tell right away if the format is wrong
      if (formatted.length === 11) {
        setFieldErrors(prev => ({ ...prev, ifscCode: fieldError('ifscCode', formatted) }));
      }
      return;
    }

    // 5. Vehicle Number: uppercase letters, digits and single spaces (max 13 incl. spaces)
    if (name === 'vehicleNumber') {
      const formatted = value.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '').slice(0, 13);
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  // Validate one field when the user leaves it, so mistakes show up before Next/Submit
  const validateOnBlur = name => () => {
    setFieldErrors(prev => ({ ...prev, [name]: fieldError(name, formData[name], formData) }));
  };

  // Pick a photo and keep a copy on disk, so it survives a network drop or app restart
  const persistPhoto = async name => {
    const picked = await pickImage();
    if (!picked) return;
    const kept = await persistPickedFile(picked, name);
    handleChange({ target: { name, files: [kept] } });
  };

  // "Reset this step": clears only the fields and photos of the current step
  const resetCurrentStep = () => {
    const { text, photos } = STEP_FIELDS[currentStep] || { text: [], photos: [] };
    Alert.alert('Reset this step?', `This clears the details you entered on "${STEPS[currentStep - 1].title}". Other steps are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setFormData(prev => ({
            ...prev,
            ...Object.fromEntries(text.map(k => [k, ''])),
            ...Object.fromEntries(photos.map(k => [k, null]))
          }));
          setPreviews(prev => ({ ...prev, ...Object.fromEntries(photos.map(k => [k, undefined])) }));
          setFieldErrors(prev => ({ ...prev, ...Object.fromEntries([...text, ...photos].map(k => [k, ''])) }));
          if (currentStep === 1) {
            setIsPhoneVerified(false);
            setShowOtpField(false);
            setPhoneOtp('');
          }
        }
      }
    ]);
  };

  const handleSendOtp = async () => {
    setFieldErrors(prev => ({
      ...prev,
      phone: '',
      email: ''
    }));
    if (!formData.phone || !/^[6-9]\d{9}$/.test(formData.phone)) {
      const msg = 'Enter a valid 10-digit mobile number starting with 6-9';
      setFieldErrors(prev => ({
        ...prev,
        phone: msg
      }));
      toast.error(msg);
      return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      const msg = 'Enter a valid email address first';
      setFieldErrors(prev => ({
        ...prev,
        email: msg
      }));
      toast.error(msg);
      return;
    }
    setIsSendingOtp(true);
    try {
      const userExists = await checkUserExistsInBackend(formData.email, formData.phone);
      if (userExists) {
        setIsSendingOtp(false);
        return;
      }
      await sendRegistrationOtp(formData.phone, formData.email);
      setShowOtpField(true);
      toast.success('OTP sent successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };
  const handleVerifyOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      await verifyRegistrationOtp(formData.phone, phoneOtp);
      setIsPhoneVerified(true);
      setShowOtpField(false);
      toast.success('Mobile number verified!');
    } catch (error) {
      toast.error(error.message || 'Invalid OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };
  const validateStep = step => {
    const errs = {};
    let isValid = true;
    switch (step) {
      case 1:
        if (fieldError('name', formData.name)) {
          errs.name = fieldError('name', formData.name);
          toast.error(errs.name);
          isValid = false;
        }
        if (!formData.email.trim()) {
          errs.email = 'Email address is required';
          toast.error(errs.email);
          isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
          errs.email = 'Enter a valid email address';
          toast.error(errs.email);
          isValid = false;
        }
        if (!formData.phone.trim()) {
          errs.phone = 'Mobile number is required';
          toast.error(errs.phone);
          isValid = false;
        } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
          errs.phone = 'Enter a valid 10-digit mobile number starting with 6-9';
          toast.error(errs.phone);
          isValid = false;
        } else if (!isPhoneVerified) {
          errs.phone = 'Please verify your mobile number with OTP first';
          toast.error(errs.phone);
          isValid = false;
        }
        if (!formData.emergencyContact || !/^[6-9]\d{9}$/.test(formData.emergencyContact)) {
          errs.emergencyContact = 'Enter a valid 10-digit emergency contact number';
          toast.error(errs.emergencyContact);
          isValid = false;
        } else if (formData.emergencyContact === formData.phone) {
          errs.emergencyContact = 'Emergency contact cannot be the same as your mobile number';
          toast.error(errs.emergencyContact);
          isValid = false;
        }
        if (!formData.aadharNumber.trim() || formData.aadharNumber.replace(/\s/g, '').length !== 12) {
          errs.aadharNumber = 'Aadhaar number must be exactly 12 digits';
          toast.error(errs.aadharNumber);
          isValid = false;
        }
        if (!formData.password || formData.password.length < 6) {
          errs.password = 'Password must be at least 6 characters long';
          toast.error(errs.password);
          isValid = false;
        }
        setFieldErrors(prev => ({
          ...prev,
          ...errs
        }));
        return isValid;
      case 2: {
        // Vehicle number (not needed for a bicycle)
        const plateErr = fieldError('vehicleNumber', formData.vehicleNumber, formData);
        if (plateErr) {
          setFieldErrors(prev => ({ ...prev, vehicleNumber: plateErr }));
          toast.error(plateErr);
          return false;
        }
        // Driving License is required only if vehicle is NOT bicycle
        if (!isBicycle(formData.vehicleType) && !isPickedFile(formData.licenseFront)) {
          toast.error('Driving License (Front) photo is required for motorized vehicles');
          return false;
        }
        if (!isPickedFile(formData.aadharFront)) {
          toast.error('Aadhaar Card (Front) photo is required');
          return false;
        }
        return true;
      }
      case 3:
        if (!formData.address.trim() || formData.address.trim().length < 5) {
          errs.address = 'Please provide a complete residential address (min 5 chars)';
          toast.error(errs.address);
          isValid = false;
        }
        // Bank Details Validation
        ['accountHolderName', 'accountNumber'].forEach(k => {
          const msg = fieldError(k, formData[k]);
          if (msg) {
            errs[k] = msg;
            toast.error(msg);
            isValid = false;
          }
        });
        if (!formData.bankName || formData.bankName.trim().length < 2) {
          errs.bankName = 'Bank name is required';
          toast.error(errs.bankName);
          isValid = false;
        }
        if (fieldError('ifscCode', formData.ifscCode)) {
          errs.ifscCode = fieldError('ifscCode', formData.ifscCode);
          toast.error(errs.ifscCode);
          isValid = false;
        }
        setFieldErrors(prev => ({
          ...prev,
          ...errs
        }));
        return isValid;
      default:
        return true;
    }
  };
  const nextStep = async () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 1) {
      const userExists = await checkUserExistsInBackend(formData.email, formData.phone);
      if (userExists) return;
    }
    setCurrentStep(s => Math.min(s + 1, 3));
  };
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1));

  // Every step opens at the top, not wherever the previous step was scrolled to
  useEffect(() => {
    scrollAuthToTop();
  }, [currentStep]);
  const uploadBulkFiles = async filesArray => {
    const data = new FormData();
    let hasFiles = false;
    for (const item of filesArray) {
      if (isPickedFile(item.file)) {
        data.append('images', item.file);
        hasFiles = true;
      }
    }
    if (!hasFiles) return [];
    data.append('folder', 'delivery_registration');
    // No silent fallback: if the photos can't be uploaded (e.g. network lost) the signup stops here,
    // keeps everything entered, and the partner can simply tap Submit again.
    const res = await api.post('/upload/public/bulk', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000
    });
    const urls = res.data?.data || [];
    if (urls.length < filesArray.length) throw new Error('Some photos could not be uploaded. Please check your internet and tap Submit again.');
    return urls;
  };
  const handleSubmit = async e => {
    if (currentStep !== 3) return;
    if (!validateStep(3)) return;
    try {
      const getFileObj = key => (isPickedFile(formData[key]) ? formData[key] : null);
      const bicycle = isBicycle(formData.vehicleType);
      const filesToUpload = [{
        name: 'Profile Image',
        file: getFileObj('profileImage'),
        isProfile: true
      }, {
        name: 'Driving License Front',
        file: bicycle ? null : getFileObj('licenseFront')
      }, {
        name: 'Driving License Back',
        file: bicycle ? null : getFileObj('licenseBack')
      }, {
        name: 'Aadhar Front',
        file: getFileObj('aadharFront')
      }, {
        name: 'Aadhar Back',
        file: getFileObj('aadharBack')
      }].filter(item => isPickedFile(item.file));
      let uploadedUrls = [];
      if (filesToUpload.length > 0) {
        try {
          uploadedUrls = await uploadBulkFiles(filesToUpload);
        } catch (uploadErr) {
          const offline = uploadErr?.isAxiosError && !uploadErr?.response;
          toast.error(offline
            ? 'No internet connection. Your details and photos are saved — tap Submit again once you are online.'
            : uploadErr?.message || 'Photo upload failed. Please try again.');
          return;
        }
      }
      let profileImageUrl = null;
      const documents = [];
      filesToUpload.forEach((item, index) => {
        if (item.isProfile && uploadedUrls[index]) {
          profileImageUrl = uploadedUrls[index];
        } else if (uploadedUrls[index]) {
          documents.push({
            name: item.name,
            url: uploadedUrls[index],
            status: 'pending'
          });
        }
      });
      const payload = {
        name: (formData.name || '').trim(),
        email: (formData.email || '').trim().toLowerCase(),
        phone: (formData.phone || '').trim(),
        phoneNumber: (formData.phone || '').trim(),
        password: formData.password || '',
        otp: phoneOtp || '',
        role: 'delivery',
        emergencyContact: (formData.emergencyContact || '').trim(),
        aadharNumber: (formData.aadharNumber || '').replace(/\s/g, ''),
        address: (formData.address || '').trim(),
        coordinates: [Number(formData.longitude) || 77.2090, Number(formData.latitude) || 28.6139],
        vehicleType: (formData.vehicleType || 'bike').toLowerCase(),
        vehicleNumber: formData.vehicleType === 'Bicycle' ? 'BICYCLE' : (formData.vehicleNumber || '').trim().toUpperCase(),
        accountName: (formData.accountHolderName || formData.accountName || '').trim(),
        accountNumber: (formData.accountNumber || '').trim(),
        bankName: (formData.bankName || '').trim(),
        ifscCode: (formData.ifscCode || '').trim().toUpperCase(),
        documents
      };
      if (profileImageUrl && typeof profileImageUrl === 'string') {
        payload.profileImage = profileImageUrl;
      }
      const result = await register(payload);
      storage.removeItem(DRAFT_KEY); // Clear draft after successful submission
      clearSignupFiles();
      toast.success(result.message || 'Registration submitted successfully!');
      navigate('/delivery/login', {
        replace: true
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(errorMsg);
      const lowerMsg = errorMsg.toLowerCase();
      if (lowerMsg.includes('email')) {
        setFieldErrors(prev => ({
          ...prev,
          email: errorMsg
        }));
        setCurrentStep(1);
      } else if (lowerMsg.includes('phone') || lowerMsg.includes('mobile')) {
        setFieldErrors(prev => ({
          ...prev,
          phone: errorMsg
        }));
        setCurrentStep(1);
      } else if (lowerMsg.includes('aadhaar') || lowerMsg.includes('aadhar')) {
        setFieldErrors(prev => ({
          ...prev,
          aadharNumber: errorMsg
        }));
        setCurrentStep(1);
      } else if (lowerMsg.includes('vehicle')) {
        setFieldErrors(prev => ({
          ...prev,
          vehicleNumber: errorMsg
        }));
        setCurrentStep(3);
      } else if (lowerMsg.includes('address')) {
        setFieldErrors(prev => ({
          ...prev,
          address: errorMsg
        }));
        setCurrentStep(3);
      }
    }
  };
  const DocUploadCard = ({
    name,
    label
  }) => <Btn onPress={() => persistPhoto(name)} className="block relative cursor-pointer group">
      {previews[name] ? <Box className="relative w-full h-36 sm:h-40 rounded-2xl overflow-hidden border-2 border-emerald-200 shadow-sm">
          <Img src={previews[name]} alt={label} className="w-full h-full object-cover" />
          <Box className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <I icon={FiCamera} className="text-white" size={24} />
          </Box>
          <Box className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
            <I icon={FiCheck} className="text-white" size={14} />
          </Box>
        </Box> : <Box className="w-full h-36 sm:h-40 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 group-hover:border-indigo-300 group-hover:bg-indigo-50/50 transition-all">
          <Box className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
            <I icon={FiCamera} className="text-gray-400 group-hover:text-indigo-500" size={20} />
          </Box>
          <Txt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tap to Upload</Txt>
        </Box>}
      <Txt className="text-[10px] font-black text-gray-500 uppercase tracking-wider text-center mt-2">{label}</Txt>
    </Btn>;
  const handleKeyDown = e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      if (currentStep < 3) {
        nextStep();
      }
    }
  };
  return <>
      <Box className="w-full flex flex-col items-center font-['Plus_Jakarta_Sans',sans-serif] px-1 sm:px-2">
        {/* Top Squircle Card with Icon */}
        <Box className="w-16 h-16 rounded-[22px] bg-[#F4EFFF] border border-[#E9DFFE] flex items-center justify-center shadow-2xs mb-4 shrink-0 mx-auto mt-2">
          <I icon={FiTruck} className="w-6 h-6 text-[#843D9B]" />
        </Box>

        {/* Title & Subtitle */}
        <Box className="text-center mb-5 w-full">
          <Txt className="text-2xl sm:text-[26px] font-bold text-[#0F172A] tracking-tight mb-1">
            Create Delivery Account
          </Txt>
          <Txt className="text-xs sm:text-[13px] font-medium text-[#64748B] max-w-[280px] mx-auto leading-relaxed">
            Register as a delivery partner with Sewzella
          </Txt>
        </Box>

        {/* Mobile Responsive Step Progress Bar */}
        <Box className="w-full bg-[#F6F6F8] rounded-[18px] p-3 px-4 mb-5 flex items-center justify-between border border-gray-100">
          <Box className="flex items-center gap-2 overflow-hidden">
            {currentStep > 1 && <Btn onPress={prevStep} className="p-1 -ml-1 text-[#64748B] hover:text-[#843D9B] transition-colors shrink-0 cursor-pointer">
                <I icon={FiChevronLeft} size={20} />
              </Btn>}
            <Txt className="text-xs font-bold text-[#0F172A] truncate">
              {STEPS[currentStep - 1].title}
            </Txt>
          </Box>
          <Box className="flex items-center gap-2 shrink-0">
            <Btn onPress={resetCurrentStep} aria-label="Reset this step" className="flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-gray-200">
              <I icon={FiRotateCcw} size={11} className="text-[#64748B]" />
              <Txt className="text-[10px] font-bold text-[#64748B]">Reset</Txt>
            </Btn>
            <Txt className="text-[10px] font-bold text-[#843D9B] bg-[#F4EFFF] border border-[#E9DFFE] px-2.5 py-1 rounded-full">
              Step {currentStep} of 3
            </Txt>
          </Box>
        </Box>

        <Box className="w-full space-y-4">
          <React.Fragment>
            {/* STEP 1: Personal Info */}
            {currentStep === 1 && <Box key="step1" className="space-y-4 w-full">
                {/* Profile Photo Uploader */}
                <Box className="flex flex-col items-center justify-center my-2">
                  <Btn className="block relative w-20 h-20 rounded-full border-2 border-dashed border-[#843D9B]/40 bg-[#F4EFFF]/40 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-[#843D9B] transition-all shadow-2xs" onPress={() => persistPhoto('profileImage')}>
                    {previews.profileImage ? <Img src={previews.profileImage} alt="Profile" className="w-full h-full object-cover" /> : <Box className="flex flex-col items-center">
                        <I icon={FiCamera} className="text-[#843D9B] mb-0.5" size={20} />
                        <Txt className="text-[9px] font-bold text-[#843D9B]">Upload</Txt>
                      </Box>}
                  </Btn>
                  <Txt className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mt-1.5">Profile Photo (Optional)</Txt>
                </Box>

                {/* 2-Column Responsive Grid */}
                <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                  <Box>
                    <Txt className="block text-xs font-semibold text-[#0F172A] mb-1 text-left">Full Name *</Txt>
                    <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 gap-2.5 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                      <I icon={FiUser} className="text-[#94A3B8] shrink-0" size={16} />
                      <Input value={formData.name} onChangeText={v => handleChange({ target: { name: 'name', value: v } })} onBlur={validateOnBlur('name')} autoCapitalize="words" autoCorrect={false} placeholder="Enter full name" className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                    </Box>
                    {fieldErrors.name && <Txt className="text-[11px] text-red-500 font-semibold mt-1 text-left">{fieldErrors.name}</Txt>}
                  </Box>

                  <Box>
                    <Txt className="block text-xs font-semibold text-[#0F172A] mb-1 text-left">Email Address *</Txt>
                    <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 gap-2.5 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                      <I icon={FiMail} className="text-[#94A3B8] shrink-0" size={16} />
                      <Input value={formData.email} onChangeText={v => handleChange({ target: { name: 'email', value: v } })} placeholder="you@email.com" className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" keyboardType="email-address" />
                    </Box>
                    {fieldErrors.email && <Txt className="text-[11px] text-red-500 font-semibold mt-1 text-left">{fieldErrors.email}</Txt>}
                  </Box>

                  <Box>
                    <Txt className="block text-xs font-semibold text-[#0F172A] mb-1 text-left">Mobile Number *</Txt>
                    <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center p-1.5 px-2 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                      <Box className="bg-white shadow-2xs rounded-xl px-2.5 py-1.5 text-sm font-medium text-[#0F172A] mr-2 select-none flex items-center justify-center shrink-0 border border-gray-100/80">
                        +91
                      </Box>
                      <Input value={formData.phone} onChangeText={v => handleChange({ target: { name: 'phone', value: v } })} placeholder="Mobile number" maxLength={10} disabled={isPhoneVerified} editable={!isPhoneVerified} className="w-full text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8] disabled:opacity-60" keyboardType="phone-pad" />
                      {isPhoneVerified ? <Txt className="text-emerald-600 font-bold text-xs shrink-0 pr-2">Verified ✓</Txt> : <Btn onPress={handleSendOtp} disabled={isSendingOtp || !formData.phone || formData.phone.length !== 10} className="text-xs font-bold text-[#843D9B] hover:underline shrink-0 pr-1 cursor-pointer disabled:opacity-40">
                          {isSendingOtp ? 'Sending...' : 'Verify'}
                        </Btn>}
                    </Box>
                    {fieldErrors.phone && <Txt className="text-[11px] text-red-500 font-semibold mt-1 text-left">{fieldErrors.phone}</Txt>}
                  </Box>

                  <Box>
                    <Txt className="block text-xs font-semibold text-[#0F172A] mb-1 text-left">Emergency Contact *</Txt>
                    <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center p-1.5 px-2 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                      <Box className="bg-white shadow-2xs rounded-xl px-2.5 py-1.5 text-sm font-medium text-[#0F172A] mr-2 select-none flex items-center justify-center shrink-0 border border-gray-100/80">
                        +91
                      </Box>
                      <Input value={formData.emergencyContact} onChangeText={v => handleChange({ target: { name: 'emergencyContact', value: v } })} placeholder="Emergency number" maxLength={10} className="w-full text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" keyboardType="phone-pad" />
                    </Box>
                    {fieldErrors.emergencyContact && <Txt className="text-[11px] text-red-500 font-semibold mt-1 text-left">{fieldErrors.emergencyContact}</Txt>}
                  </Box>

                  <Box>
                    <Txt className="block text-xs font-semibold text-[#0F172A] mb-1 text-left">Aadhaar Number *</Txt>
                    <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 gap-2.5 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                      <I icon={FiFileText} className="text-[#94A3B8] shrink-0" size={16} />
                      <Input value={formData.aadharNumber} onChangeText={v => handleChange({ target: { name: 'aadharNumber', value: v } })} placeholder="12-digit Aadhaar" maxLength={14} className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                    </Box>
                    {fieldErrors.aadharNumber && <Txt className="text-[11px] text-red-500 font-semibold mt-1 text-left">{fieldErrors.aadharNumber}</Txt>}
                  </Box>

                  <Box>
                    <Txt className="block text-xs font-semibold text-[#0F172A] mb-1 text-left">Password *</Txt>
                    <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 gap-2.5 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                      <I icon={FiLock} className="text-[#94A3B8] shrink-0" size={16} />
                      <Input value={formData.password} onChangeText={v => handleChange({ target: { name: 'password', value: v } })} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} placeholder="Create password" className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                      <Btn onPress={() => setShowPassword(!showPassword)} className="text-[#94A3B8] hover:text-[#843D9B] transition-colors shrink-0 cursor-pointer">
                        {showPassword ? <I icon={FiEyeOff} size={16} /> : <I icon={FiEye} size={16} />}
                      </Btn>
                    </Box>
                    {fieldErrors.password && <Txt className="text-[11px] text-red-500 font-semibold mt-1 text-left">{fieldErrors.password}</Txt>}
                  </Box>
                </Box>

                {/* OTP Verification Box */}
                {showOtpField && !isPhoneVerified && <Box className="bg-[#F4EFFF] p-4 rounded-[18px] border border-[#E9DFFE] space-y-2 text-left">
                    <Txt className="block text-xs font-bold text-[#843D9B]">Enter 6-Digit OTP</Txt>
                    <Box className="flex gap-2">
                      <Input value={phoneOtp} onChangeText={e => setPhoneOtp(e.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="••••••" maxLength={6} className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-center font-bold tracking-widest text-sm text-[#0F172A] focus:outline-none focus:border-[#843D9B]" />
                      <Btn onPress={handleVerifyOtp} disabled={isVerifyingOtp || !phoneOtp || phoneOtp.length !== 6} className="px-5 py-2.5 bg-[#843D9B] text-white rounded-xl text-xs font-bold hover:bg-[#843D9B] disabled:opacity-40 transition-all shrink-0 cursor-pointer">
                        {isVerifyingOtp ? 'Verifying...' : 'Submit OTP'}
                      </Btn>
                    </Box>
                  </Box>}
              </Box>}

            {/* STEP 2: Documents */}
            {currentStep === 2 && <Box key="step2" className="space-y-4 w-full text-left">
                {/* Vehicle first: what it is decides which documents are needed */}
                <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Box>
                    <Txt className="block text-xs font-semibold text-[#0F172A] mb-1">Vehicle Type *</Txt>
                    <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                      <Select value={formData.vehicleType} onChange={v => handleChange({ target: { name: 'vehicleType', value: v } })} className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0" options={[{ value: 'Bike (Motorcycle)', label: 'Bike (Motorcycle)' }, { value: 'Scooter', label: 'Scooter' }, { value: 'Electric Scooter', label: 'Electric Scooter' }, { value: 'Bicycle', label: 'Bicycle' }]} />
                    </Box>
                  </Box>

                  {isBicycle(formData.vehicleType) ? <Box className="bg-emerald-50 border border-emerald-100 rounded-[16px] p-3">
                      <Txt className="text-xs font-semibold text-emerald-700">No number plate or driving licence needed for a bicycle.</Txt>
                    </Box> : <Box>
                      <Txt className="block text-xs font-semibold text-[#0F172A] mb-1">Vehicle Registration Number *</Txt>
                      <Box className={`w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 border ${fieldErrors.vehicleNumber ? 'border-red-300' : 'border-transparent'}`}>
                        <Input value={formData.vehicleNumber} onChangeText={v => handleChange({ target: { name: 'vehicleNumber', value: v } })} onBlur={validateOnBlur('vehicleNumber')} autoCapitalize="characters" autoCorrect={false} maxLength={13} placeholder="e.g. MH 12 AB 1234" className="w-full text-xs sm:text-sm text-[#0F172A] font-medium uppercase tracking-wider bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                      </Box>
                      {fieldErrors.vehicleNumber && <Txt className="text-[11px] text-red-500 font-semibold mt-1">{fieldErrors.vehicleNumber}</Txt>}
                    </Box>}
                </Box>

                {!isBicycle(formData.vehicleType) && <Box>
                  <Txt className="block text-xs font-bold text-[#0F172A] mb-2">Driving License (Required) *</Txt>
                  <Box className="grid grid-cols-2 gap-3">
                    <DocUploadCard name="licenseFront" label="License Front" />
                    <DocUploadCard name="licenseBack" label="License Back" />
                  </Box>
                </Box>}

                <Box>
                  <Txt className="block text-xs font-bold text-[#0F172A] mb-2">Aadhaar Card (Required) *</Txt>
                  <Box className="grid grid-cols-2 gap-3">
                    <DocUploadCard name="aadharFront" label="Aadhaar Front" />
                    <DocUploadCard name="aadharBack" label="Aadhaar Back" />
                  </Box>
                </Box>

                <Box className="bg-[#FFF9E6] border border-[#FFEBAA] rounded-[16px] p-3 text-xs text-[#926000]">
                  <Txt className="font-bold">NOTE:</Txt> Upload clear photos. Blurry images will be rejected during verification.
                </Box>
              </Box>}

            {/* STEP 3: Vehicle & Bank */}
            {currentStep === 3 && <Box key="step3" className="space-y-4 w-full text-left">
                <Box>
                  <Box className="flex justify-between items-center mb-1">
                    <Txt className="block text-xs font-semibold text-[#0F172A]">Residential Address *</Txt>
                    <Btn onPress={handleDetectLocation} disabled={isLocating} className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-[#843D9B]/20 text-[#843D9B] text-[10px] font-bold rounded-lg hover:bg-purple-100 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer">
                      {isLocating ? <Spin size={12} className="text-[#843D9B]" /> : <I icon={FiNavigation} size={11} className="text-[#843D9B]" />}
                      {isLocating ? 'Detecting...' : 'Detect Location'}
                    </Btn>
                  </Box>
                  {isLoaded ? <Box>
                      <PlacesAutocompleteField placeholder="Search residential area, street, landmark..." value={formData.address || ''} error={fieldErrors.address} onChange={val => {
                  setFormData(prev => ({
                    ...prev,
                    address: val
                  }));
                  if (fieldErrors.address && val.trim().length >= 5) {
                    setFieldErrors(prev => ({
                      ...prev,
                      address: ''
                    }));
                  }
                }} onClear={() => setFormData(prev => ({
                  ...prev,
                  address: '',
                  latitude: '',
                  longitude: ''
                }))} onPlaceSelect={handlePlaceSelect} />
                      {formData.latitude && formData.longitude && <Txt className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                          ✓ Pinned on Map: {Number(formData.latitude).toFixed(4)}, {Number(formData.longitude).toFixed(4)}
                        </Txt>}
                    </Box> : <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                      <Input value={formData.address} onChangeText={v => handleChange({ target: { name: 'address', value: v } })} placeholder="Complete residential address" className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                    </Box>}
                  {fieldErrors.address && <Txt className="text-[11px] text-red-500 font-semibold mt-1">{fieldErrors.address}</Txt>}
                </Box>

                <Box className="border-t border-gray-100 pt-3">
                  <Box className="flex items-center gap-2 mb-3">
                    <I icon={FiCreditCard} className="text-[#843D9B]" size={16} />
                    <Txt className="text-xs font-bold text-[#0F172A]">Bank Account Details (For Payouts)</Txt>
                  </Box>

                  <Box className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Box>
                      <Txt className="block text-xs font-semibold text-[#0F172A] mb-1">Account Holder Name *</Txt>
                      <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                        <Input value={formData.accountHolderName} onChangeText={v => handleChange({ target: { name: 'accountHolderName', value: v } })} onBlur={validateOnBlur('accountHolderName')} autoCapitalize="words" autoCorrect={false} placeholder="Name as per bank account" className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                      </Box>
                      {fieldErrors.accountHolderName && <Txt className="text-[11px] text-red-500 font-semibold mt-1">{fieldErrors.accountHolderName}</Txt>}
                    </Box>

                    <Box>
                      <Txt className="block text-xs font-semibold text-[#0F172A] mb-1">Account Number *</Txt>
                      <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                        <Input value={formData.accountNumber} onChangeText={v => handleChange({ target: { name: 'accountNumber', value: v } })} onBlur={validateOnBlur('accountNumber')} keyboardType="number-pad" maxLength={18} placeholder="9 - 18 digit account number" className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                      </Box>
                      {fieldErrors.accountNumber && <Txt className="text-[11px] text-red-500 font-semibold mt-1">{fieldErrors.accountNumber}</Txt>}
                    </Box>

                    <Box>
                      <Txt className="block text-xs font-semibold text-[#0F172A] mb-1">Bank Name *</Txt>
                      <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                        <Input value={formData.bankName} onChangeText={v => handleChange({ target: { name: 'bankName', value: v } })} placeholder="e.g. SBI, HDFC, ICICI" className="w-full text-xs sm:text-sm text-[#0F172A] font-medium bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                      </Box>
                      {fieldErrors.bankName && <Txt className="text-[11px] text-red-500 font-semibold mt-1">{fieldErrors.bankName}</Txt>}
                    </Box>

                    <Box>
                      <Txt className="block text-xs font-semibold text-[#0F172A] mb-1">IFSC Code *</Txt>
                      <Box className="w-full bg-[#F6F6F8] rounded-[18px] flex items-center px-3.5 py-3 border border-transparent focus-within:border-[#843D9B]/30 focus-within:bg-white transition-all">
                        <Input value={formData.ifscCode} onChangeText={v => handleChange({ target: { name: 'ifscCode', value: v } })} onBlur={validateOnBlur('ifscCode')} autoCapitalize="characters" autoCorrect={false} placeholder="e.g. SBIN0001234" maxLength={11} className="w-full text-xs sm:text-sm text-[#0F172A] font-medium uppercase tracking-wider bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-[#94A3B8]" />
                      </Box>
                      {fieldErrors.ifscCode && <Txt className="text-[11px] text-red-500 font-semibold mt-1">{fieldErrors.ifscCode}</Txt>}
                    </Box>
                  </Box>
                </Box>

                <Box className="pt-1">
                  <Txt className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox checked={agreedToTerms} onChange={setAgreedToTerms} />
                    <Txt className="text-xs text-[#64748B] font-medium">
                      I agree to the <Txt onPress={() => navigate('/delivery/legal/terms-and-conditions')} className="text-[#843D9B] hover:underline font-semibold cursor-pointer">Terms & Conditions</Txt> and <Txt onPress={() => navigate('/delivery/legal/privacy-policy')} className="text-[#843D9B] hover:underline font-semibold cursor-pointer">Privacy Policy</Txt>
                    </Txt>
                  </Txt>
                </Box>
              </Box>}
          </React.Fragment>

          {/* Navigation Buttons */}
          <Box className="flex items-center justify-between mt-6 gap-3 w-full">
            {currentStep > 1 ? <Btn onPress={prevStep} className="flex items-center gap-1 px-5 py-3.5 bg-[#F6F6F8] text-[#0F172A] rounded-[22px] font-bold text-xs hover:bg-gray-200 active:scale-95 transition-all cursor-pointer">
                <I icon={FiChevronLeft} size={16} /> BACK
              </Btn> : <Box />}

            {currentStep < 3 ? <Btn onPress={nextStep} className="flex items-center gap-2 px-8 py-3.5 bg-[#843D9B] hover:bg-[#843D9B] text-white rounded-[22px] font-bold text-sm transition-all shadow-md shadow-[#843D9B]/20 active:scale-95 cursor-pointer">
                NEXT <I icon={FiChevronRight} size={16} />
              </Btn> : <Btn onPress={handleSubmit} disabled={isLoading || !agreedToTerms} className={`flex items-center gap-2 px-8 py-3.5 bg-[#843D9B] hover:bg-[#843D9B] text-white rounded-[22px] font-bold text-sm transition-all shadow-md shadow-[#843D9B]/20 ${isLoading || !agreedToTerms ? 'bg-[#E2D9F3] text-white cursor-not-allowed shadow-none' : 'active:scale-95 cursor-pointer'}`}>
                {isLoading ? 'SUBMITTING...' : 'SUBMIT ENROLLMENT'}
              </Btn>}
          </Box>

          <Box className="text-center mt-6 w-full">
            <Txt className="text-xs font-medium text-[#64748B]">
              Already have an account?{' '}
              <Txt onPress={() => {
              storage.removeItem(DRAFT_KEY);
              clearSignupFiles();
              navigate('/delivery/login');
            }} className="text-[#843D9B] font-bold hover:underline ml-1 cursor-pointer">Login</Txt>
            </Txt>
          </Box>
        </Box>
      </Box>

    </>;
};
export default DeliveryRegister;
