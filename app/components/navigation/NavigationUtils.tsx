import Constants from "expo-constants";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteDetails {
  distance: number;
  geometry: {
    coordinates: [number, number][];
  };
}

export interface ChargerData {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  operator?: string;
  distance?: number | string;
  categories?: string[];
  connectorTypes?: string[];
  power?: number;
  availability?: string;
  rating?: number;
}

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;

// Helper function to calculate distance between two points
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export const getRouteDetails = async (
  coordinates: Coordinate[]
): Promise<RouteDetails | null> => {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates
      .map((coord) => `${coord.longitude},${coord.latitude}`)
      .join(";")}?access_token=${mapboxAccessToken}&geometries=geojson`;

    console.log("Fetching route from Mapbox:", url);

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.error("No valid routes returned from Mapbox.");
      return null;
    }

    console.log("Route fetched successfully.");
    return data.routes[0];
  } catch (error) {
    console.error("Error fetching route details:", error);
    return null;
  }
};

export const getAlternativeRoute = async (coordinates: Coordinate[]) => {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates
      .map((coord) => `${coord.longitude},${coord.latitude}`)
      .join(
        ";"
      )}?alternatives=true&access_token=${mapboxAccessToken}&geometries=geojson`;

    console.log("🔄 Fetching alternative routes from Mapbox:", url);

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length < 2) {
      console.error("No alternative routes found.");
      return null;
    }

    console.log("Alternative routes found.");
    return data.routes[1];
  } catch (error) {
    console.error("Error fetching alternative routes:", error);
    return null;
  }
};

// Function to select the optimal EV charger along a route
export const selectBestCharger = (
  chargers: ChargerData[],
  startPoint: Coordinate,
  endPoint: Coordinate,
  availableRange: number,
  totalRouteDistance: number
): ChargerData | null => {
  if (chargers.length === 0) {
    return null;
  }

  // Filter chargers based on range constraints and availability
  const validChargers = chargers.filter((charger) => {
    // Only consider available chargers
    if (
      charger.availability &&
      charger.availability.toLowerCase() !== "available"
    ) {
      return false;
    }

    // Calculate distance from start to charger
    const distanceToCharger = calculateDistance(
      startPoint.latitude,
      startPoint.longitude,
      charger.lat,
      charger.lng
    );

    // Calculate distance from charger to destination
    const distanceToDestination = calculateDistance(
      charger.lat,
      charger.lng,
      endPoint.latitude,
      endPoint.longitude
    );

    // Charger must be reachable with current range
    const isReachable = distanceToCharger <= availableRange * 0.85; // 85% of range as safety buffer

    // Must be able to reach destination from charger
    const canReachDestination = distanceToDestination <= availableRange;

    // Total route with charger shouldn't be too much longer than direct route
    // Stricter limit on detour (now only 10% instead of 20%)
    const totalDistance = distanceToCharger + distanceToDestination;
    const isEfficient = totalDistance <= totalRouteDistance * 1.1; // Allow only 10% detour

    return isReachable && (canReachDestination || isEfficient);
  });

  if (validChargers.length === 0) {
    console.log("No chargers meet the criteria after filtering");

    // Fall back to all chargers that are just reachable if no available ones found
    const fallbackChargers = chargers.filter((charger) => {
      const distanceToCharger = calculateDistance(
        startPoint.latitude,
        startPoint.longitude,
        charger.lat,
        charger.lng
      );
      return distanceToCharger <= availableRange * 0.85;
    });

    if (fallbackChargers.length === 0) return null;

    console.log(
      "Falling back to reachable chargers regardless of availability"
    );
    // Continue with fallbackChargers
    return scoredSelection(
      fallbackChargers,
      startPoint,
      endPoint,
      availableRange,
      totalRouteDistance
    );
  }

  return scoredSelection(
    validChargers,
    startPoint,
    endPoint,
    availableRange,
    totalRouteDistance
  );
};

// Helper function to score and select the best charger
const scoredSelection = (
  chargers: ChargerData[],
  startPoint: Coordinate,
  endPoint: Coordinate,
  availableRange: number,
  totalRouteDistance: number
): ChargerData => {
  // Score each charger
  const scoredChargers = chargers.map((charger) => {
    // Calculate detour distance
    const directDistance = calculateDistance(
      startPoint.latitude,
      startPoint.longitude,
      endPoint.latitude,
      endPoint.longitude
    );

    const distanceWithCharger =
      calculateDistance(
        startPoint.latitude,
        startPoint.longitude,
        charger.lat,
        charger.lng
      ) +
      calculateDistance(
        charger.lat,
        charger.lng,
        endPoint.latitude,
        endPoint.longitude
      );

    // Calculate detour factor (1.0 means no detour, lower is better)
    const detourFactor = distanceWithCharger / directDistance;

    // Distance score: inverse of detour factor (higher = less detour)
    const distanceScore = 1 / detourFactor;

    // Power score remains the same
    const powerScore = charger.power ? Math.min(charger.power / 150, 1) : 0.5;

    // Rating score remains the same but weighted higher
    const ratingScore = charger.rating ? charger.rating / 5 : 0.5;

    // Availability bonus (if explicit availability data exists)
    const availabilityBonus =
      charger.availability && charger.availability.toLowerCase() === "available"
        ? 0.1
        : 0;

    // Calculate final score with new weights:
    // - Distance: 70% (was 60%)
    // - Rating: 20% (was 10%)
    // - Power: 10% (was 30%)
    // - Plus availability bonus
    const score =
      distanceScore * 0.7 +
      ratingScore * 0.2 +
      powerScore * 0.1 +
      availabilityBonus;

    return { charger, score };
  });

  // Sort by score and pick the best one
  scoredChargers.sort((a, b) => b.score - a.score);

  // Log the top 3 chargers if available
  const topChargers = scoredChargers.slice(
    0,
    Math.min(3, scoredChargers.length)
  );
  console.log("Top chargers:");
  topChargers.forEach((scored, idx) => {
    console.log(
      `${idx + 1}. ${
        scored.charger.name || "Unnamed"
      } - Score: ${scored.score.toFixed(2)}`
    );
  });

  console.log(
    "Selected charger:",
    scoredChargers[0].charger.name || "Unnamed Charger"
  );
  return scoredChargers[0].charger;
};
