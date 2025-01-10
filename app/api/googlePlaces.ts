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
