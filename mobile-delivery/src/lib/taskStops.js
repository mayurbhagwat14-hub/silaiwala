// Pickup / drop stops of a delivery task, derived the same way as screens/OrderDetail.jsx.
// Normal order: pickup = tailor, drop = customer. Fabric pickup: pickup = customer, drop = tailor.

const isValidCoord = (lat, lng) => {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && la !== 0 && ln !== 0 && Math.abs(la) <= 90 && Math.abs(ln) <= 180;
};

const PICKUP_STATUSES = ['pending', 'ready_for_pickup', 'ready-for-pickup', 'ready-for-delivery', 'fabric-ready-for-pickup', 'assigned', 'accepted'];
const DELIVERY_STATUSES = ['picked-up', 'picked_up', 'picked-up-from-tailor', 'fabric-picked-up', 'out-for-delivery', 'out_for_delivery', 'shipped'];

/** 'pickup' until the parcel is collected, then 'delivery'. */
export function getTaskPhase(order) {
  if (!order) return null;
  const s = String(order.status || '').toLowerCase();
  const raw = String(order.rawStatus || order.status || '').toLowerCase();
  if (PICKUP_STATUSES.includes(s) || PICKUP_STATUSES.includes(raw)) return 'pickup';
  if (DELIVERY_STATUSES.includes(s) || DELIVERY_STATUSES.includes(raw)) return 'delivery';
  return 'pickup';
}

const formatAddress = (addr) => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  if (typeof addr === 'object') {
    if (typeof addr.address === 'string' && addr.address) return addr.address;
    return [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ');
  }
  return '';
};

const stop = ({ kind, name, address, phone, lat, lng }) => ({
  kind, // 'tailor' | 'customer'
  name: name || (kind === 'tailor' ? 'Tailor' : 'Customer'),
  address: address || '',
  phone: phone || '',
  coords: isValidCoord(lat, lng) ? { lat: Number(lat), lng: Number(lng) } : null,
});

/** { phase, pickup, dropoff, target } — `target` is the stop the rider is heading to now. */
export function getTaskStops(order) {
  if (!order) return null;
  const isFabricPickup = order.taskType === 'fabric-pickup';
  const tailor = stop({
    kind: 'tailor',
    name: order.vendorName || order.tailor?.shopName,
    address: order.vendorAddress || order.tailor?.location?.address,
    phone: order.vendorPhone || order.tailor?.phone,
    lat: order.vendorLatitude || order.tailor?.location?.coordinates?.[1],
    lng: order.vendorLongitude || order.tailor?.location?.coordinates?.[0],
  });
  const customerName = typeof order.customer === 'string' ? order.customer : order.customer?.name;
  const customer = stop({
    kind: 'customer',
    name: order.customerName || customerName,
    address: formatAddress(order.address || order.deliveryAddress),
    phone: order.phone || order.customerPhone,
    lat: order.latitude || order.deliveryAddress?.location?.coordinates?.[1],
    lng: order.longitude || order.deliveryAddress?.location?.coordinates?.[0],
  });
  const pickup = isFabricPickup ? customer : tailor;
  const dropoff = isFabricPickup ? tailor : customer;
  const phase = getTaskPhase(order);
  return { phase, pickup, dropoff, target: phase === 'delivery' ? dropoff : pickup };
}

/** Google Maps turn-by-turn (two-wheeler) to a stop; coordinates when known, else the address. */
export function googleNavUrl(target) {
  if (!target) return null;
  const dest = target.coords ? `${target.coords.lat},${target.coords.lng}` : target.address;
  if (!dest) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=two-wheeler&dir_action=navigate`;
}
