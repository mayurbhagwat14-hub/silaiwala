/**
 * Full road-following path of a Google Maps JS `DirectionsResult` (every step's own path).
 * `overview_path` is a simplified line that cuts across corners and blocks when zoomed in,
 * so it is only used when steps are missing.
 */
export const detailedRoutePath = (directions) => {
    const route = directions?.routes?.[0];
    if (!route) return null;
    const points = (route.legs || []).flatMap((leg) => (leg.steps || []).flatMap((step) => step.path || []));
    return points.length > 1 ? points : route.overview_path || null;
};
