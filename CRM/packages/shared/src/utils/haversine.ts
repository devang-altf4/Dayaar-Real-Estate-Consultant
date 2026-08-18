/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 * @returns Distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const EARTH_RADIUS_METERS = 6371000; // Earth's mean radius in meters

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100; // Rounded to 2 decimal places
}

/**
 * Validates whether given coordinates fall within the organization's office geofence radius.
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  allowedRadiusMeters: number,
): { isWithin: boolean; distanceMeters: number } {
  const distanceMeters = calculateHaversineDistance(userLat, userLon, officeLat, officeLon);
  return {
    isWithin: distanceMeters <= allowedRadiusMeters,
    distanceMeters,
  };
}
