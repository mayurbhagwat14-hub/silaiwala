// Navigation screen for the rider (like food-delivery apps): full map with the road route to the
// current stop, distance / ETA, the stop's name + address, call, and "Start Navigation"
// (opens Google Maps turn-by-turn, two-wheeler).
import React, { useState, useEffect } from 'react';
import { View, Linking } from 'react-native';
import { ArrowLeft, Navigation, LocateFixed, Phone, Route, Clock, MapPin, ChevronRight, Store, User } from 'lucide-react-native';
import storage from '../lib/storage';
import { watchPosition } from '../lib/location';
import Screen from '../components/common/Screen';
import { useNavigate, useParams } from '../lib/nav';
import { useDeliveryAuthStore } from '../store/deliveryStore';
import { useDeliveryTracking } from '../shared/hooks/useDeliveryTracking';
import DeliveryBoyLiveMap from '../components/shared/DeliveryBoyLiveMap';
import { getTaskStops, googleNavUrl } from '../lib/taskStops';
import toast from '../lib/toast';
import Spin from '../components/ui/Spin';
import { Box, Btn, Txt, I } from '../components/ui/primitives';

const LiveTracking = () => {
  const navigate = useNavigate();
  const params = useParams();
  const orderId = params.id || params.orderId; // route file is orders/[id]/tracking
  const { deliveryBoy, updateLocation, fetchOrderById } = useDeliveryAuthStore();

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // { distance, duration, distanceValue }
  const [recenterKey, setRecenterKey] = useState(0);

  // Shares the rider's live location for this task (customer / admin tracking)
  useDeliveryTracking(deliveryBoy?.id, order ? [order] : []);

  // Rider location: manual override (testing) or GPS watch
  useEffect(() => {
    const manualLocStr = storage.getItem('manual_location');
    if (manualLocStr) {
      try {
        const manualLoc = JSON.parse(manualLocStr);
        setCurrentLocation({ lat: manualLoc.latitude, lng: manualLoc.longitude });
        return undefined;
      } catch (e) {
        console.error(e);
      }
    }
    const stop = watchPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setCurrentLocation({ lat, lng });
      },
      (error) => {
        console.error('Location error:', error);
        toast.error(error?.code === 'denied' ? 'Allow location access to navigate' : 'Could not get your location');
      }
    );
    return () => stop();
  }, []);

  // Same order data as the order detail screen
  useEffect(() => {
    if (!orderId) return;
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
  const stepLabel = isPickup ? 'PICKUP FROM' : 'DELIVER TO';

  // The map keeps this in a ref, so it always sees the latest location
  const handleRouteCalculated = (r) => {
    if (r && r.distanceValue > 0) setRouteInfo(r);
    if (r?.distanceValue > 0 && currentLocation?.lat && currentLocation?.lng) {
      updateLocation(currentLocation.lat, currentLocation.lng, r.duration, r.distanceValue);
    }
  };

  const startNavigation = async () => {
    const url = googleNavUrl(target);
    if (!url) {
      toast.error('Address not available for this stop');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      toast.error('Could not open Google Maps');
    }
  };

  const callStop = () => {
    if (!target?.phone) {
      toast.error('Phone number not available');
      return;
    }
    Linking.openURL(`tel:${target.phone}`);
  };

  const shortId = String(order?.orderId || order?.id || orderId || '').slice(-8).toUpperCase();

  return (
    <Screen className="bg-white" statusBar="light" statusBg="bg-[#5A1A78]" bottom={false}>
      <Box className="flex-1 bg-white">
        {/* Header */}
        <Box className="bg-[#5A1A78] px-4 pt-2 pb-5 rounded-b-[26px] flex items-center gap-3" style={{ zIndex: 20 }}>
          <Btn onPress={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <I icon={ArrowLeft} size={20} color="#fff" />
          </Btn>
          <Box className="flex-1 min-w-0">
            <Txt className="text-[17px] font-bold text-white" numberOfLines={1}>{order ? title : 'Navigation'}</Txt>
            {!!shortId && <Txt className="text-[11.5px] text-white/75" numberOfLines={1}>Order #{shortId} · {isPickup ? 'Pickup' : 'Drop'}</Txt>}
          </Box>
          <Btn onPress={startNavigation} className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <I icon={Navigation} size={18} color="#fff" />
          </Btn>
        </Box>

        {/* Map */}
        <Box className="flex-1 relative" style={{ marginTop: -22 }}>
          {order ? (
            <DeliveryBoyLiveMap
              currentLocation={currentLocation}
              destination={target?.coords}
              destinationAddress={target?.coords ? undefined : target?.address}
              height="100%"
              rounded={false}
              showOverlay={false}
              recenterKey={recenterKey}
              edgePadding={{ top: 110, bottom: 330, left: 60, right: 60 }}
              onRouteCalculated={handleRouteCalculated}
            />
          ) : (
            <Box className="flex-1 items-center justify-center bg-slate-50">
              {loadError ? (
                <Txt className="text-sm font-semibold text-slate-500">Could not load this order</Txt>
              ) : (
                <>
                  <Spin size={28} color="#843D9B" />
                  <Txt className="mt-2 text-xs font-semibold text-slate-500">Loading route...</Txt>
                </>
              )}
            </Box>
          )}

          {/* Live chip + recenter */}
          {order && (
            <>
              <View pointerEvents="none" style={{ position: 'absolute', top: 34, left: 14 }}>
                <Box className="bg-white px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                  <Box className={`w-2 h-2 rounded-full ${currentLocation ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <Txt className="text-[11px] font-bold text-slate-700">{currentLocation ? 'Live location on' : 'Finding your location...'}</Txt>
                </Box>
              </View>
              <View style={{ position: 'absolute', top: 30, right: 14, gap: 10 }}>
                <Btn onPress={() => setRecenterKey((k) => k + 1)} className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center">
                  <I icon={LocateFixed} size={20} color="#5A1A78" />
                </Btn>
              </View>
            </>
          )}

          {/* Bottom sheet */}
          {order && target && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
              <Box className="bg-white rounded-t-[28px] px-4 pt-3 pb-6 shadow-lg">
                <Box className="w-10 h-1 rounded-full bg-slate-200 self-center mb-3" />

                {/* Distance / ETA */}
                <Box className="flex items-center gap-2.5">
                  <Box className="flex-1 flex items-center gap-2 bg-[#F6EEFA] rounded-2xl px-3 py-2.5">
                    <I icon={Route} size={18} color="#6A2385" />
                    <Box>
                      <Txt className="text-[15px] font-bold text-[#1A1523]">{routeInfo?.distance || '--'}</Txt>
                      <Txt className="text-[10.5px] text-slate-500">Distance</Txt>
                    </Box>
                  </Box>
                  <Box className="flex-1 flex items-center gap-2 bg-[#F6EEFA] rounded-2xl px-3 py-2.5">
                    <I icon={Clock} size={18} color="#6A2385" />
                    <Box>
                      <Txt className="text-[15px] font-bold text-[#1A1523]">{routeInfo?.duration || '--'}</Txt>
                      <Txt className="text-[10.5px] text-slate-500">Est. time</Txt>
                    </Box>
                  </Box>
                </Box>

                {/* Stop */}
                <Box className="mt-3.5 flex items-center gap-3">
                  <Box className="w-11 h-11 rounded-full bg-[#F3E9F8] flex items-center justify-center">
                    <I icon={targetIsCustomer ? User : Store} size={20} color="#6A2385" />
                  </Box>
                  <Box className="flex-1 min-w-0">
                    <Txt className="text-[10px] font-bold tracking-wider text-[#6A2385]">{stepLabel}</Txt>
                    <Txt className="text-[15px] font-bold text-[#1A1523]" numberOfLines={1}>{target.name}</Txt>
                  </Box>
                  <Btn onPress={callStop} className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center">
                    <I icon={Phone} size={18} color="#fff" />
                  </Btn>
                </Box>
                <Box className="mt-2 flex items-start gap-2 pl-1">
                  <I icon={MapPin} size={14} color="#94A3B8" />
                  <Txt className="flex-1 text-[12.5px] text-slate-600" numberOfLines={2}>{target.address || 'Address not provided'}</Txt>
                </Box>

                <Btn onPress={startNavigation} className="mt-4 h-[52px] rounded-full bg-[#6A2385] flex items-center justify-center gap-2 shadow-md">
                  <I icon={Navigation} size={18} color="#fff" />
                  <Txt className="text-[15px] font-bold text-white">Start Navigation</Txt>
                </Btn>
                <Btn onPress={() => navigate(`/delivery/orders/${orderId}`)} className="mt-2.5 flex items-center justify-center gap-1 py-1">
                  <Txt className="text-[12.5px] font-semibold text-[#6A2385]">View order details</Txt>
                  <I icon={ChevronRight} size={14} color="#6A2385" />
                </Btn>
              </Box>
            </View>
          )}
        </Box>
      </Box>
    </Screen>
  );
};

export default LiveTracking;
