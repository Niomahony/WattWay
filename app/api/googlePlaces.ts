import Constants from "expo-constants";

const googlePlacesApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;

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

export const fetchEVChargers = async (coords: [number, number]) => {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords[1]},${coords[0]}&radius=5000&type=charging_station&key=${googlePlacesApiKey}`;

  try {
    const response = await fetch(url);
    const jsonData = await response.json();

    if (!jsonData.results) {
      return [];
    }

    interface Charger {
      name: string;
      lat: number;
      lng: number;
      place_id: string;
      open_now: boolean | "Unknown";
      rating: number | "No rating";
      total_ratings: number;
      type: "Fast Charger" | "Standard Charger";
    }

    interface ChargerResponse {
      name: string;
      geometry: {
        location: {
          lat: number;
          lng: number;
        };
      };
      place_id: string;
      opening_hours?: {
        open_now: boolean;
      };
      rating?: number;
      user_ratings_total?: number;
      types: string[];
    }

    return jsonData.results.map(
      (charger: ChargerResponse): Charger => ({
        name: charger.name,
        lat: charger.geometry.location.lat,
        lng: charger.geometry.location.lng,
        place_id: charger.place_id,
        open_now: charger.opening_hours?.open_now ?? "Unknown",
        rating: charger.rating ?? "No rating",
        total_ratings: charger.user_ratings_total ?? 0,
        type: charger.types.includes("fast_charging")
          ? "Fast Charger"
          : "Standard Charger",
      })
    );
  } catch (error) {
    console.error("Error fetching EV chargers:", error);
    return [];
  }
};
