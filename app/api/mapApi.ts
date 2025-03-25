import Constants from "expo-constants";
import { googleTypes, amenityTypeMapping } from "../helpers/amenityCategories";
const chargerApiKey = Constants.expoConfig?.extra?.chargerApiKey;
const googleMapsApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxDownloadToken;

const brandMapping: { [key: string]: string } = {
  "Tesla Supercharger": "Tesla",
  ChargePoint: "chargepoint",
  "Blink Charging": "Blink",
  EVBox: "evbox",
};

export async function fetchPlaceDetails(placeId: string) {
  try {
    // First try Google Places API
    const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,name&key=${googleMapsApiKey}`;
    const googleResponse = await fetch(googleUrl);
    const googleData = await googleResponse.json();

    if (googleData.status === "OK" && googleData.result) {
      const result = googleData.result;
      return {
        name: result.name,
        coordinates: [
          result.geometry.location.lng,
          result.geometry.location.lat,
        ] as [number, number],
        photoUrl: null,
        address: result.formatted_address,
      };
    }

    // Fallback to Mapbox if Google Places fails
    console.log("Falling back to Mapbox for place details...");
    const mapboxResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${placeId}.json?access_token=${mapboxAccessToken}`
    );
    const mapboxData = await mapboxResponse.json();

    if (mapboxData.features.length > 0) {
      const place = mapboxData.features[0];
      return {
        name: place.text,
        coordinates: place.center as [number, number],
        photoUrl: null,
        address: place.place_name,
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
    // First try Google Places API for better results
    const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      searchQuery
    )}&key=${googleMapsApiKey}&types=address|establishment|geocode`;

    const googleResponse = await fetch(googleUrl);
    const googleData = await googleResponse.json();

    if (googleData.status === "OK" && googleData.predictions) {
      return googleData.predictions.map((prediction: any) => ({
        id: prediction.place_id,
        place_name: prediction.description,
        structured_formatting: prediction.structured_formatting,
      }));
    }

    // Fallback to Mapbox if Google Places fails
    console.log("Falling back to Mapbox search...");
    const mapboxResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json?autocomplete=true&access_token=${mapboxAccessToken}`
    );
    const mapboxData = await mapboxResponse.json();

    return mapboxData.features.map((feature: any) => ({
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
    // First try Google Places API
    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleMapsApiKey}`;
    const googleResponse = await fetch(googleUrl);
    const googleData = await googleResponse.json();

    if (googleData.status === "OK" && googleData.results.length > 0) {
      const result = googleData.results[0];
      return {
        name: result.formatted_address,
        coordinates: [lng, lat] as [number, number],
        photoUrl: null,
        address: result.formatted_address,
      };
    }

    // Fallback to Mapbox if Google Places fails
    console.log("Falling back to Mapbox for coordinate lookup...");
    const mapboxResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxAccessToken}`
    );
    const mapboxData = await mapboxResponse.json();

    if (mapboxData.features.length > 0) {
      return {
        name: mapboxData.features[0].place_name,
        coordinates: [lng, lat] as [number, number],
        photoUrl: null,
        address: mapboxData.features[0].place_name,
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
    if (
      !origin ||
      !destination ||
      origin.length !== 2 ||
      destination.length !== 2
    ) {
      console.error(
        "Invalid coordinates provided to calculateDrivingDistanceAndTime"
      );
      return {
        distance: "Invalid coordinates",
        duration: "Invalid coordinates",
      };
    }

    const [originLat, originLng] = origin;
    const [destLat, destLng] = destination;

    if (Math.abs(originLat) > 90 || Math.abs(destLat) > 90) {
      console.error("Latitude values must be between -90 and 90 degrees");
      return { distance: "Invalid latitude", duration: "Invalid latitude" };
    }

    if (Math.abs(originLng) > 180 || Math.abs(destLng) > 180) {
      console.error("Longitude values must be between -180 and 180 degrees");
      return { distance: "Invalid longitude", duration: "Invalid longitude" };
    }

    const originStr = `${originLat},${originLng}`;
    const destinationStr = `${destLat},${destLng}`;

    console.log("Direction API - Origin (lat,lng):", originStr);
    console.log("Direction API - Destination (lat,lng):", destinationStr);

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&mode=driving&key=${googleMapsApiKey}`;
    console.log("Direction API URL:", url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Google Directions API response status:", data.status);

    if (data.status === "OK" && data.routes && data.routes.length > 0) {
      const route = data.routes[0].legs[0];
      const distance = route.distance.text;
      const duration = route.duration.text;

      console.log("Successfully calculated distance:", distance);
      console.log("Successfully calculated duration:", duration);

      return { distance, duration };
    } else {
      console.warn("Direction calculation failed:", data.status);
      console.warn(
        "Error message:",
        data.error_message || "No error message provided"
      );

      if (data.status === "ZERO_RESULTS") {
        return {
          distance: "No route found",
          duration: "No route found",
        };
      }

      return {
        distance: "Cannot calculate",
        duration: "Cannot calculate",
      };
    }
  } catch (error) {
    console.error("Error calculating driving distance and time:", error);
    return { distance: "Error", duration: "Error" };
  }
}

export const fetchEVChargersAlongRoute = async (
  waypoints: { latitude: number; longitude: number }[],
  radius: number = 5000,
  filters: any = {}
) => {
  try {
    console.log(
      "🔌 Searching for EV chargers along route with waypoints:",
      waypoints
    );

    if (!waypoints || waypoints.length === 0) {
      console.error("No waypoints provided to fetchEVChargersAlongRoute");
      return [];
    }

    const chargerPromises = waypoints.map(async (waypoint) => {
      let url = `https://api.tomtom.com/search/2/categorySearch/electric%20vehicle%20station.json?key=${chargerApiKey}&lat=${waypoint.latitude}&lon=${waypoint.longitude}&radius=${radius}&limit=20`;

      if (filters.availableOnly) {
        console.log("🔌 Filtering for available chargers only along route");
        url += `&chargingAvailability=true`;
      } else {
        console.log(
          "🔌 Showing all chargers along route (available and unavailable)"
        );
      }

      console.log(
        `Fetching from TomTom API for waypoint near (${waypoint.latitude}, ${waypoint.longitude}) with radius ${radius}m`
      );

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `TomTom API error: ${response.status} ${response.statusText}`
        );
        return [];
      }

      const data = await response.json();
      const results = data.results || [];

      console.log(
        `Found ${results.length} chargers near waypoint (${waypoint.latitude}, ${waypoint.longitude})`
      );

      return results.map((poi: any) => ({
        id: poi.id,
        lat: poi.position.lat,
        lng: poi.position.lon,
        name: poi.poi?.name || "EV Charging Station",
        address:
          poi.address?.freeformAddress ||
          `${poi.position.lat.toFixed(5)}, ${poi.position.lon.toFixed(5)}`,
        operator: poi.poi?.brands?.[0]?.name || "Unknown",
        distance: poi.dist,
      }));
    });

    const chargersArrays = await Promise.all(chargerPromises);

    let allChargers = chargersArrays.flat();

    const uniqueChargers = Array.from(
      new Map(allChargers.map((charger) => [charger.id, charger])).values()
    );

    console.log(
      `✅ Found ${uniqueChargers.length} unique chargers along route`
    );

    let filteredChargers = uniqueChargers;

    if (filters && filters.brand && filters.brand.length > 0) {
      console.log(`🔍 Filtering for brands: ${filters.brand.join(", ")}`);
      const apiCompatibleBrands = filters.brand.map(
        (brand: string) => brandMapping[brand] || brand
      );

      const brandVariations = apiCompatibleBrands.map((brand: string) => [
        brand,
        brand.replace(" ", ""),
        brand.toLowerCase(),
      ]);

      console.log(
        "Available operator names:",
        uniqueChargers.map((c) => c.operator)
      );

      filteredChargers = uniqueChargers.filter((charger) => {
        const operatorName = charger.operator?.toLowerCase() || "";
        return apiCompatibleBrands.some((brand: string) => {
          const matches = brandVariations.some((brandVar: string[]) =>
            brandVar.some((variation: string) =>
              operatorName.includes(variation)
            )
          );

          if (matches) {
            console.log(
              `✅ Match found: "${charger.operator}" matches "${brand}"`
            );
          }

          return matches;
        });
      });

      console.log(
        `Found ${
          filteredChargers.length
        } chargers matching brands "${filters.brand.join(", ")}"`
      );
    }

    console.log(`✅ ${filteredChargers.length} chargers after filtering`);

    if (filteredChargers.length === 0) {
      console.log("⚠️ No chargers found via TomTom API.");

      console.log("🔄 Trying generic EV charger search as fallback...");

      const searchTerms = [
        "charging station",
        "ev charger",
        "electric vehicle",
        "tesla charger",
        "supercharger",
      ];

      console.log(`🔍 Using fallback search terms: ${searchTerms.join(", ")}`);

      const allFallbackChargers: any[] = [];

      for (const term of searchTerms) {
        const fallbackPromises = waypoints.map(async (waypoint) => {
          const fallbackUrl = `https://api.tomtom.com/search/2/poiSearch/${encodeURIComponent(
            term
          )}.json?key=${chargerApiKey}&lat=${waypoint.latitude}&lon=${
            waypoint.longitude
          }&radius=${radius * 1.5}&limit=15`;

          try {
            const response = await fetch(fallbackUrl);
            if (!response.ok) return [];

            const data = await response.json();
            const results = data.results || [];

            console.log(
              `📍 Found ${
                results.length
              } results for "${term}" near (${waypoint.latitude.toFixed(
                5
              )}, ${waypoint.longitude.toFixed(5)})`
            );

            const relevantResults = results.filter((poi: any) => {
              const categories = poi.poi?.categories || [];
              const name = (poi.poi?.name || "").toLowerCase();

              const hasRelevantName =
                name.includes("charg") ||
                name.includes("ev ") ||
                name.includes("electric") ||
                name.includes("tesla") ||
                name.includes("volt") ||
                name.includes("power") ||
                name.includes("energy") ||
                name.includes("super");

              const hasRelevantCategory = categories.some(
                (cat: string) =>
                  cat.includes("electric") ||
                  cat.includes("charg") ||
                  cat.includes("vehicle") ||
                  cat.includes("auto") ||
                  cat.includes("service")
              );

              return hasRelevantName || hasRelevantCategory;
            });

            return relevantResults.map((poi: any) => ({
              id: poi.id,
              lat: poi.position.lat,
              lng: poi.position.lon,
              name:
                poi.poi?.name ||
                `${term.charAt(0).toUpperCase() + term.slice(1)}`,
              address:
                poi.address?.freeformAddress ||
                `${poi.position.lat.toFixed(5)}, ${poi.position.lon.toFixed(
                  5
                )}`,
              operator: poi.poi?.brands?.[0]?.name || "Unknown",
              distance: poi.dist,
              categories: poi.poi?.categories || [],
            }));
          } catch (error) {
            console.error(`❌ Error in fallback search for "${term}":`, error);
            return [];
          }
        });

        const termResults = await Promise.all(fallbackPromises);
        allFallbackChargers.push(...termResults.flat());
      }

      const uniquePositions = new Map();

      allFallbackChargers.forEach((charger) => {
        const posKey = `${charger.lat},${charger.lng}`;
        if (!uniquePositions.has(posKey)) {
          uniquePositions.set(posKey, charger);
        }
      });

      const uniqueFallbackChargers = Array.from(uniquePositions.values());

      console.log(
        `✅ Found ${uniqueFallbackChargers.length} unique chargers in fallback search`
      );

      return uniqueFallbackChargers;
    }

    return filteredChargers;
  } catch (error) {
    console.error("❌ Error fetching EV chargers along route:", error);
    console.error(error);

    return [];
  }
};

type Charger = {
  poi: {
    name: string;
    categories: string[];
    brand: string | null;
    type: string | null;
  };
  position: {
    lat: number;
    lon: number;
  };
  address: {
    freeformAddress: string;
  };
  rating?: number;
};

export async function fetchEVChargers(
  center: [number, number],
  filters: {
    chargingSpeed?: string | null;
    minRating?: number | null;
    brand?: string[] | null;
    connectorType?: string | null;
    amenities?: string[];
    availableOnly?: boolean;
  },
  searchRadius: number = 10000
): Promise<any[]> {
  try {
    let url = `https://api.tomtom.com/search/2/poiSearch/ev%20charger.json?key=${chargerApiKey}&lat=${center[1]}&lon=${center[0]}&radius=${searchRadius}&categorySet=7309&limit=50`;

    if (filters.connectorType) {
      url += `&connectorType=${filters.connectorType}`;
    }
    if (filters.brand && filters.brand.length > 0) {
      const apiCompatibleBrands = filters.brand.map(
        (brand: string) => brandMapping[brand] || brand
      );
      console.log(
        `🔄 Using brand filter: ${filters.brand.join(
          ", "
        )} → ${apiCompatibleBrands.join(", ")}`
      );
      url += `&brandSet=${encodeURIComponent(apiCompatibleBrands.join(","))}`;
    }
    if (filters.chargingSpeed) {
      url += `&chargingSpeed=${filters.chargingSpeed}`;
    }
    if (filters.minRating) {
      url += `&minRating=${filters.minRating}`;
    }
    if (filters.availableOnly) {
      console.log(
        "⚠️ Filtering for available chargers only is not supported in the free TomTom API"
      );
      console.log(
        "    The availability toggle was enabled but will have no effect"
      );
    } else {
      console.log("🔌 Showing all chargers (available and unavailable)");
    }

    console.log("Fetching chargers with URL:", url);
    const response = await fetch(url);
    const jsonData = await response.json();
    let chargers = jsonData.results || [];
    console.log(`Found ${chargers.length} total chargers from API`);

    if (filters.amenities && filters.amenities.length > 0) {
      console.log(
        `Filtering by ${filters.amenities.length} amenities:`,
        filters.amenities
      );

      const chargersWithAmenitiesPromises = chargers.map(
        async (charger: any) => {
          try {
            const validAmenityTypes = (filters.amenities || []).filter(
              (amenity: string) => amenity in googleTypes
            );

            if (validAmenityTypes.length === 0) {
              console.log(
                `No valid amenity types in filter, skipping amenity checks`
              );
              return { ...charger, nearbyPlaces: [] };
            }

            const nearbyPlaces = await checkNearbyAmenities(
              charger.position.lat,
              charger.position.lon,
              validAmenityTypes
            );

            if (nearbyPlaces && nearbyPlaces.length > 0) {
              const hasMatchingAmenities = nearbyPlaces.some((place: any) => {
                if (
                  !place.matchingAmenityTypes ||
                  place.matchingAmenityTypes.length === 0
                ) {
                  return false;
                }

                return place.matchingAmenityTypes.some((type: string) => {
                  return validAmenityTypes.some((amenity) =>
                    amenityTypeMapping[amenity]?.includes(type.toLowerCase())
                  );
                });
              });

              if (hasMatchingAmenities) {
                console.log(
                  `✅ Charger ${charger.poi.name} has matching amenities nearby`
                );
                return { ...charger, nearbyPlaces };
              } else {
                console.log(
                  `⚠️ Charger ${charger.poi.name} has nearby places but none match our amenity types`
                );
                return null;
              }
            } else {
              console.log(
                `❌ Charger ${charger.poi.name} has no matching amenities nearby`
              );
              return null;
            }
          } catch (error) {
            console.error(
              `Error checking amenities for charger ${charger.poi.name}:`,
              error
            );
            return null;
          }
        }
      );

      const chargersWithAmenities = await Promise.all(
        chargersWithAmenitiesPromises
      );

      chargers = chargersWithAmenities.filter(Boolean);

      console.log(
        `After amenity filtering: ${chargers.length} chargers remain`
      );
    }

    return chargers.map((charger: any) => {
      const formattedCharger = {
        name: charger.poi.name,
        lat: charger.position.lat,
        lng: charger.position.lon,
        address: charger.address.freeformAddress,
        type: "EV Charger",
        nearbyPlaces: charger.nearbyPlaces || [],
      };

      if (filters.amenities && filters.amenities.length > 0) {
        if (
          !formattedCharger.nearbyPlaces ||
          formattedCharger.nearbyPlaces.length === 0
        ) {
          console.warn(
            `Warning: Charger ${formattedCharger.name} has no nearby places but passed filter`
          );
        }
      }

      return formattedCharger;
    });
  } catch (error) {
    console.error("❌ Error fetching EV chargers:", error);
    return [];
  }
}

export const checkNearbyAmenities = async (
  lat: number,
  lon: number,
  amenities: string[],
  retries = 3
) => {
  console.log("checkNearbyAmenities called with lat:", lat, "lon:", lon);
  console.log("Requested amenity types:", amenities);

  const typeMapping = amenityTypeMapping;

  const types = amenities
    .map((amenity) => googleTypes[amenity as keyof typeof googleTypes])
    .filter(Boolean);

  console.log("Amenity types to search for:", types);

  if (types.length === 0) {
    console.log("No valid amenity types, returning empty array");
    return [];
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=250&type=${types.join(
    "|"
  )}&key=${googleMapsApiKey}`;

  console.log("Google Places API URL:", url);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(
          `HTTP Error: ${response.status} - ${response.statusText}`
        );

      const data = await response.json();
      console.log("Google Places API response status:", data.status);

      if (!data.results)
        throw new Error("Invalid response format from Google Places API");

      const foundPlaces = data.results;
      console.log(`Found ${foundPlaces.length} nearby amenities`);

      if (foundPlaces.length > 0) {
        console.log("First few amenities with types:");
        foundPlaces.slice(0, 3).forEach((place: any) => {
          console.log(
            `${place.name}: ${
              place.types ? place.types.join(", ") : "no types"
            }`
          );
        });
      }

      try {
        const placesWithMatchingAmenities = foundPlaces.map((place: any) => {
          const placeTypes = place.types || [];
          const matchingAmenityTypes: string[] = [];

          const expandedRequestedTypes = amenities
            .map((amenity: string) => amenityTypeMapping[amenity] || [])
            .flat();

          console.log(`Checking place ${place.name} with types:`, placeTypes);
          console.log(
            `Against expanded requested types:`,
            expandedRequestedTypes
          );

          for (const placeType of placeTypes) {
            const lowercasePlaceType = placeType.toLowerCase();

            if (expandedRequestedTypes.includes(lowercasePlaceType)) {
              for (const amenityType of amenities) {
                if (
                  amenityTypeMapping[amenityType]?.includes(lowercasePlaceType)
                ) {
                  matchingAmenityTypes.push(amenityType);
                  break;
                }
              }
            }
          }

          return {
            name: place.name,
            photoReference: place.photos?.[0]?.photo_reference || null,
            placeId: place.place_id || null,
            address: place.vicinity || "Address not available",
            types: place.types || [],
            matchingAmenityTypes: matchingAmenityTypes,
          };
        });

        return placesWithMatchingAmenities;
      } catch (error) {
        console.error(`❌ Error processing place:`, error);
        return [];
      }
    } catch (error) {
      console.error(
        `❌ Error checking nearby amenities (Attempt ${attempt + 1}):`,
        error
      );
      if (attempt === retries) return [];
    }
  }

  return [];
};
