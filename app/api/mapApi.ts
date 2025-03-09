import Constants from "expo-constants";

const chargerApiKey = Constants.expoConfig?.extra?.chargerApiKey;
const googleMapsApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxDownloadToken;

export async function fetchPlaceDetails(placeId: string) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${placeId}.json?access_token=${mapboxAccessToken}`
    );
    const data = await response.json();

    if (data.features.length > 0) {
      const place = data.features[0];

      return {
        name: place.text,
        coordinates: place.center as [number, number],
        photoUrl: null, // Mapbox doesn't provide photos like Google Places
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
}

export async function fetchSuggestions(searchQuery: string) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json?autocomplete=true&access_token=${mapboxAccessToken}`
    );
    const data = await response.json();

    return data.features.map((feature: any) => ({
      id: feature.id,
      place_name: feature.place_name,
    }));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

export async function fetchPlaceDetailsByCoordinates(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxAccessToken}`
    );
    const data = await response.json();

    if (data.features.length > 0) {
      return {
        name: data.features[0].place_name,
        coordinates: [lng, lat] as [number, number],
        photoUrl: null,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching place details by coordinates:", error);
    return null;
  }
}

export async function calculateDrivingDistanceAndTime(
  origin: [number, number],
  destination: [number, number]
): Promise<{ distance: string; duration: string }> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?access_token=${mapboxAccessToken}&geometries=geojson&overview=full`
    );

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distance = `${(route.distance / 1000).toFixed(2)} km`; // Convert meters to km
      const duration = `${Math.round(route.duration / 60)} min`;

      return { distance, duration };
    } else {
      console.warn("Distance and duration data not available in response.");
      console.log("Mapbox API Response:", data);

      return {
        distance: "Distance not available",
        duration: "Duration not available",
      };
    }
  } catch (error) {
    console.error("Error calculating driving distance and time:", error);
    return { distance: "Error", duration: "Error" };
  }
}

export const fetchEVChargersAlongRoute = async (
  routeCoordinates: { latitude: number; longitude: number }[]
) => {
  let results: any[] = [];

  for (let i = 0; i < routeCoordinates.length; i += 5) {
    const { latitude, longitude } = routeCoordinates[i];

    const url = `https://api.tomtom.com/search/2/poiSearch/ev%20charger.json?key=${chargerApiKey}&lat=${latitude}&lon=${longitude}&radius=5000&categorySet=7309`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.results) {
        results.push(...data.results);
      }
    } catch (error) {
      console.error("Error fetching EV chargers from TomTom:", error);
    }
  }

  return results.map((charger: any) => ({
    name: charger.poi.name,
    lat: charger.position.lat,
    lng: charger.position.lon,
    address: charger.address.freeformAddress,
    type: "EV Charger",
    powerLevels:
      charger.chargingAvailability?.connectors?.map((conn: any) => ({
        type: conn.type,
        powerKW: conn.powerKW,
        available: conn.availability?.current?.available ?? 0,
      })) ?? [],
  }));
};

export async function fetchEVChargers(
  coords: [number, number],
  filters: {
    connectorSet?: string | null;
    minPowerKW?: number | null;
  }
) {
  try {
    if (!chargerApiKey) {
      console.error("🚨 TomTom API Key is missing! Check Expo config.");
      return [];
    }

    const query = "ev charger";
    let url = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(
      query
    )}.json?key=${chargerApiKey}&lat=${coords[1]}&lon=${
      coords[0]
    }&radius=5000&categorySet=7309`;

    if (filters.connectorSet) {
      url += `&connectorSet=${filters.connectorSet}`;
    }
    if (filters.minPowerKW) {
      url += `&minPowerKW=${filters.minPowerKW}`;
    }

    console.log("🚗 Fetching EV chargers from TomTom POI Search...");
    console.log("🔗 Request URL:", url);

    const response = await fetch(url);
    console.log(" response:", response);

    if (!response.ok) {
      console.error(
        `❌ TomTom API error: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const jsonData = await response.json();

    if (!jsonData.results || jsonData.results.length === 0) {
      console.warn("⚠️ No EV chargers found.");
      return [];
    }

    return jsonData.results.map((charger: any) => ({
      name: charger.poi.name,
      lat: charger.position.lat,
      lng: charger.position.lon,
      address: charger.address.freeformAddress,
      type: charger.poi.categories.includes("EV Charging Station")
        ? "EV Charger"
        : "Other",
      powerLevels:
        charger.chargingAvailability?.connectors?.map((conn: any) => ({
          type: conn.type,
          powerKW: conn.powerKW,
          available: conn.availability?.current?.available ?? 0,
        })) ?? [],
    }));
  } catch (error) {
    console.error(
      "❌ Error fetching EV chargers from TomTom POI Search:",
      error
    );
    return [];
  }
}
