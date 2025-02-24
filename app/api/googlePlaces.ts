import Constants from "expo-constants";

const googlePlacesApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
const chargerApiKey = Constants.expoConfig?.extra?.chargerApiKey;

export async function fetchPlaceDetails(placeId: string) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?placeid=${placeId}&key=${googlePlacesApiKey}`
    );
    const data = await response.json();
    if (data.result) {
      const photoUrl = data.result.photos
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${data.result.photos[0].photo_reference}&key=${googlePlacesApiKey}`
        : null;
      return {
        name: data.result.name,
        coordinates: [
          data.result.geometry.location.lng,
          data.result.geometry.location.lat,
        ],
        photoUrl,
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
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        searchQuery
      )}&key=${googlePlacesApiKey}`
    );
    const data = await response.json();
    return data.predictions.map((prediction: any) => ({
      id: prediction.place_id,
      place_name: prediction.description,
    }));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

export async function fetchPlaceDetailsByCoordinates(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googlePlacesApiKey}`
    );
    const data = await response.json();
    if (data.results.length > 0) {
      return {
        name: data.results[0].formatted_address,
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

export async function calculateDrivingDistance(
  origin: [number, number],
  destination: [number, number]
): Promise<string> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin[1]},${origin[0]}&destinations=${destination[1]},${destination[0]}&key=${googlePlacesApiKey}`
    );
    const data = await response.json();

    if (
      data.rows &&
      data.rows[0] &&
      data.rows[0].elements &&
      data.rows[0].elements[0] &&
      data.rows[0].elements[0].distance &&
      data.rows[0].elements[0].distance.text
    ) {
      const distanceText = data.rows[0].elements[0].distance.text;

      const numericDistance = parseFloat(distanceText.replace(/[^0-9.]/g, ""));

      if (!isNaN(numericDistance)) {
        return `${numericDistance} ${distanceText
          .replace(/[0-9.]/g, "")
          .trim()}`;
      } else {
        console.warn("Distance data could not be parsed properly.");
        return "Error calculating driving distance";
      }
    } else {
      console.warn("Distance data not available in response.");
      return "Distance not available";
    }
  } catch (error) {
    console.error("Error calculating driving distance:", error);
    return "Error calculating driving distance";
  }
}

export const fetchEVChargersAlongRoute = async (
  routeCoordinates: { latitude: number; longitude: number }[]
) => {
  let results: any[] = [];

  for (let i = 0; i < routeCoordinates.length; i += 5) {
    const { latitude, longitude } = routeCoordinates[i];

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=2000&type=charging_station&key=${googlePlacesApiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.results) {
        results.push(...data.results);
      }
    } catch (error) {
      console.error("Error fetching EV chargers:", error);
    }
  }

  return results;
};
type Charger = {
  type: string;
  total: number;
  availability: {
    current: {
      available: number;
      occupied: number;
    };
  };
  powerLevels: {
    powerKW: number;
    available: number;
  }[];
};

if (!chargerApiKey) {
  console.error("❌ ERROR: TomTom API Key is missing! Check your Expo config.");
}

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
