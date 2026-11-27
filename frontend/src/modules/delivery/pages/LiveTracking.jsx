// Navigation page for the rider (like food-delivery apps): full map with the road route to the
// current stop, distance / ETA, the stop's name + address, call, and "Start Navigation"
// (opens Google Maps turn-by-turn, two-wheeler). Same screen as mobile-delivery/src/screens/LiveTracking.jsx.
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Navigation, LocateFixed, Phone, Route, Clock, MapPin, ChevronRight, Store, User, Loader2 } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import toast from 'react-hot-toast';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { useDeliveryTracking } from '../../../shared/hooks/useDeliveryTracking';
import DeliveryBoyLiveMap from '../../../shared/components/DeliveryBoyLiveMap';
import { getTaskStops, googleNavUrl } from '../utils/taskStops';

const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry', 'drawing'];

// Testing override saved by the delivery dashboard ("manual_location"), if any
const readManualLocation = () => {
  try {
    const raw = localStorage.getItem('manual_location');
    if (!raw) return null;
    const loc = JSON.parse(raw);
    return loc?.latitude && loc?.longitude ? { lat: loc.latitude, lng: loc.longitude } : null;
  } catch {
    return null;
  }
};

const LiveTracking = () => {
  const outletCtx = useOutletContext();
  const { isLoaded: localIsLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const isLoaded = outletCtx?.isLoaded !== undefined ? outletCtx.isLoaded : localIsLoaded;

  const navigate = useNavigate();
  const params = useParams();
  const orderId = params.id || params.orderId; // route is /delivery/orders/:id/tracking
  const { deliveryBoy, updateLocation, fetchOrderById } = useDeliveryAuthStore();

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(readManualLocation);
  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration, distanceValue }
  const [recenterKey, setRecenterKey] = useState(0);

  // Shares the rider's live location for this task (customer / admin tracking)
  useDeliveryTracking(deliveryBoy?.id, order ? [order] : []);

  // Rider location: GPS watch (skipped when a manual test location is set)
  useEffect(() => {
    if (readManualLocation()) return undefined;
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device');
      return undefined;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setCurrentLocation({ lat, lng });
      },
      (error) => {
        console.error('Location error:', error);
        toast.error(error?.code === 1 ? 'Allow location access to navigate' : 'Could not get your location');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Same order data as the order detail page
  useEffect(() => {
    if (!orderId) return undefined;
    let alive = true;
    fetchOrderById(orderId)
      .then((o) => { if (alive) setOrder(o || null); })
      .catch((e) => {
        console.error('Failed to load order:', e);
        if (alive) setLoadError(true);
      });
    return () => { alive = false; };
  }, [orderId, fetchOrderById]);

  const stops = getTaskStops(order);
  const target = stops?.target;
  const isPickup = stops?.phase === 'pickup';
  const targetIsCustomer = target?.kind === 'customer';
  const title = targetIsCustomer ? 'Navigate to Customer' : 'Navigate to Tailor';

  // The map keeps this in a ref, so it always sees the latest location
  const handleRouteCalculated = (r) => {
    if (r && r.distanceValue > 0) setRouteInfo(r);
    if (r?.distanceValue > 0 && currentLocation?.lat && currentLocation?.lng) {
      updateLocation(currentLocation.lat, currentLocation.lng, r.duration, r.distanceValue);
    }
  };

  const startNavigation = () => {
    const url = googleNavUrl(target);
    if (!url) {
      toast.error('Address not available for this stop');
      return;
    }
    window.open(url, '_blank', 'noopener');
  };

  const shortId = String(order?.orderId || order?.id || orderId || '').slice(-8).toUpperCase();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-sans">
      {/* Header */}
      <div className="relative z-20 flex items-center gap-3 rounded-b-[26px] bg-[#5A1A78] px-4 pb-5 pt-4 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-bold">{order ? title : 'Navigation'}</h1>
          {!!shortId && <p className="truncate text-[11.5px] text-white/75">Order #{shortId} · {isPickup ? 'Pickup' : 'Drop'}</p>}
        </div>
        <button type="button" onClick={startNavigation} aria-label="Open in Google Maps" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
          <Navigation size={18} />
        </button>
      </div>

      {/* Map */}
      <div className="relative -mt-[22px] flex-1">
        {order ? (
          <DeliveryBoyLiveMap
            currentLocation={currentLocation}
            destination={target?.coords}
            destinationAddress={target?.coords ? undefined : target?.address}
            isLoaded={isLoaded}
            height="100%"
            rounded={false}
            showOverlay={false}
            recenterKey={recenterKey}
            edgePadding={{ top: 110, bottom: 340, left: 60, right: 60 }}
            onRouteCalculated={handleRouteCalculated}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-slate-50">
            {loadError ? (
              <p className="text-sm font-semibold text-slate-500">Could not load this order</p>
            ) : (
              <>
                <Loader2 size={28} className="animate-spin text-[#843D9B]" />
                <p className="mt-2 text-xs font-semibold text-slate-500">Loading route...</p>
              </>
            )}
          </div>
        )}

        {order && (
          <>
            <div className="pointer-events-none absolute left-3.5 top-[34px] flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-md">
              <span className={`h-2 w-2 rounded-full ${currentLocation ? 'animate-pulse bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-bold text-slate-700">{currentLocation ? 'Live location on' : 'Finding your location...'}</span>
            </div>
            <button
              type="button"
              onClick={() => setRecenterKey((k) => k + 1)}
              aria-label="Recenter"
              className="absolute right-3.5 top-[30px] flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#5A1A78] shadow-md hover:bg-slate-50"
            >
              <LocateFixed size={20} />
            </button>
          </>
        )}

        {/* Bottom sheet */}
        {order && target && (
          <div className="absolute inset-x-0 bottom-0 z-10">
            <div className="mx-auto max-w-xl rounded-t-[28px] bg-white px-4 pb-6 pt-3 shadow-[0_-12px_36px_-12px_rgba(42,15,56,0.3)]">
              <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-slate-200" />

              <div className="flex items-center gap-2.5">
                <div className="flex flex-1 items-center gap-2 rounded-2xl bg-[#F6EEFA] px-3 py-2.5">
                  <Route size={18} className="text-[#6A2385]" />
                  <div>
                    <p className="text-[15px] font-bold leading-tight text-[#1A1523]">{routeInfo?.distance || '--'}</p>
                    <p className="text-[10.5px] text-slate-500">Distance</p>
                  </div>
                </div>
                <div className="flex flex-1 items-center gap-2 rounded-2xl bg-[#F6EEFA] px-3 py-2.5">
                  <Clock size={18} className="text-[#6A2385]" />
                  <div>
                    <p className="text-[15px] font-bold leading-tight text-[#1A1523]">{routeInfo?.duration || '--'}</p>
                    <p className="text-[10.5px] text-slate-500">Est. time</p>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F3E9F8] text-[#6A2385]">
                  {targetIsCustomer ? <User size={20} /> : <Store size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-wider text-[#6A2385]">{isPickup ? 'PICKUP FROM' : 'DELIVER TO'}</p>
                  <p className="truncate text-[15px] font-bold text-[#1A1523]">{target.name}</p>
                </div>
                {target.phone ? (
                  <a href={`tel:${target.phone}`} aria-label="Call" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-600">
                    <Phone size={18} />
                  </a>
                ) : (
                  <button type="button" onClick={() => toast.error('Phone number not available')} aria-label="Call" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                    <Phone size={18} />
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-start gap-2 pl-1">
                <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <p className="line-clamp-2 text-[12.5px] text-slate-600">{target.address || 'Address not provided'}</p>
              </div>

              <button
                type="button"
                onClick={startNavigation}
                className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#6A2385] text-[15px] font-bold text-white shadow-md transition-all hover:bg-[#5A1A78] active:scale-[0.98]"
              >
                <Navigation size={18} /> Start Navigation
              </button>
              <button
                type="button"
                onClick={() => navigate(`/delivery/orders/${orderId}`)}
                className="mx-auto mt-2.5 flex items-center justify-center gap-1 py-1 text-[12.5px] font-semibold text-[#6A2385]"
              >
                View order details <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTracking;
