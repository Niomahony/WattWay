import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Alert,
  View,
  Text,
  Animated,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
  StatusBar,
} from "react-native";
import { MapboxNavigationView } from "@youssefhenna/expo-mapbox-navigation";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import { RouteProp, useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/NavigationTypes";
import { fetchEVChargersAlongRoute, checkNearbyAmenities } from "../api/mapApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { googleTypes } from "../helpers/amenityCategories";
import { useKeepAwake } from "expo-keep-awake";

import {
  RangeMessage,
  AmenityModal,
  ExpandedPhotoModal,
  RouteChargerModal,
  calculateDistance,
  selectBestCharger,
  Coordinate,
  RouteDetails,
} from "./navigation/index";

type NavigationScreenRouteProp = RouteProp<
  RootStackParamList,
  "NavigationScreen"
>;

interface NavigationScreenProps {
  route?: NavigationScreenRouteProp;
}

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;
Mapbox.setAccessToken(mapboxAccessToken);

export default function NavigationScreen({ route }: NavigationScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  useKeepAwake();
  const { coordinates, availableRange, maxRange, filters } =
    route?.params || {};
  const [fadeAnim] = useState(new Animated.Value(1));
  const [showRangeMessage, setShowRangeMessage] = useState(false);
  const [isRangeSufficient, setIsRangeSufficient] = useState(true);
  const [currentChargerIndex, setCurrentChargerIndex] = useState(0);

  const [chargingStops, setChargingStops] = useState<any[]>([]);
  const [routeWithStops, setRouteWithStops] = useState<Coordinate[]>([]);

  const [selectedAmenity, setSelectedAmenity] = useState<any>(null);
  const [amenityModalVisible, setAmenityModalVisible] = useState(false);
  const [amenityDetails, setAmenityDetails] = useState<any>(null);
  const [loadingAmenityDetails, setLoadingAmenityDetails] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  const [showRouteChargersModal, setShowRouteChargersModal] = useState(false);
  const [routeChargers, setRouteChargers] = useState<any[]>([]);
  const [loadingRouteChargers, setLoadingRouteChargers] = useState(false);
  const [loadingChargerAmenities, setLoadingChargerAmenities] = useState<
    Record<string, boolean>
  >({});
  const [chargerAmenities, setChargerAmenities] = useState<
    Record<string, any[]>
  >({});

  const [selectedChargers, setSelectedChargers] = useState<any[]>([]);
  const [isSearchingChargers, setIsSearchingChargers] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const [selectedChargerInfo, setSelectedChargerInfo] = useState<{
    name: string;
    distance: number;
    detourPercent: number;
    power?: number;
    availability?: string;
    operator?: string;
  } | null>(null);

  // Add charger cache
  const chargerCache = useRef<{
    [key: string]: {
      chargers: any[];
      timestamp: number;
    };
  }>({});
  const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = (points: Coordinate[], radius: number) => {
    return (
      points.map((p) => `${p.latitude},${p.longitude}`).join("|") + `|${radius}`
    );
  };

  useEffect(() => {
    if (coordinates) {
      planChargingStops();
    }
  }, [coordinates]);

  const getRouteDetails = async (
    coordinates: Coordinate[]
  ): Promise<RouteDetails | null> => {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates
        .map((coord) => `${coord.longitude},${coord.latitude}`)
        .join(";")}?access_token=${mapboxAccessToken}&geometries=geojson`;

      console.log("Fetching route from Mapbox:");

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

  const findAndAddChargerToRoute = async (routeDistance: number) => {
    if (!coordinates || !availableRange) {
      console.error("Missing coordinates or range data");
      return;
    }

    console.log("Automatically finding the best charger for the route...");
    setIsSearchingChargers(true);

    try {
      const SEARCH_RADIUS = Math.min(30000, availableRange * 400);

      const waypoints = [coordinates[0], coordinates[coordinates.length - 1]];

      const allChargers: any[] = [];

      for (let i = 0; i < waypoints.length; i++) {
        const waypoint = waypoints[i];
        console.log(
          `Searching waypoint ${i + 1}: (${waypoint.latitude}, ${
            waypoint.longitude
          })`
        );

        const wayPointChargers = await fetchEVChargersAlongRoute(
          [waypoint],
          SEARCH_RADIUS,
          filters
        );

        console.log(
          `Found ${wayPointChargers.length} chargers at waypoint ${i + 1}`
        );
        allChargers.push(...wayPointChargers);
      }

      const uniqueChargers = Array.from(
        new Map(
          allChargers.map((charger) => [
            `${charger.lat},${charger.lng}`,
            charger,
          ])
        ).values()
      );

      console.log(`Total unique chargers found: ${uniqueChargers.length}`);

      if (uniqueChargers.length === 0) {
        console.log("No suitable chargers found");
        setIsSearchingChargers(false);
        return;
      }

      const directDistance = calculateDistance(
        coordinates[0].latitude,
        coordinates[0].longitude,
        coordinates[coordinates.length - 1].latitude,
        coordinates[coordinates.length - 1].longitude
      );

      const bestCharger = selectBestCharger(
        uniqueChargers,
        coordinates[0],
        coordinates[coordinates.length - 1],
        availableRange,
        routeDistance
      );

      if (bestCharger) {
        const distanceToCharger = calculateDistance(
          coordinates[0].latitude,
          coordinates[0].longitude,
          bestCharger.lat,
          bestCharger.lng
        );

        const distanceFromChargerToDestination = calculateDistance(
          bestCharger.lat,
          bestCharger.lng,
          coordinates[coordinates.length - 1].latitude,
          coordinates[coordinates.length - 1].longitude
        );

        const totalDistanceWithCharger =
          distanceToCharger + distanceFromChargerToDestination;
        const detourPercent = Math.round(
          (totalDistanceWithCharger / directDistance - 1) * 100
        );

        setSelectedChargerInfo({
          name: bestCharger.name || "Unnamed Charger",
          distance: Math.round(distanceToCharger),
          detourPercent: detourPercent > 0 ? detourPercent : 0,
          power: bestCharger.power,
          availability: bestCharger.availability,
          operator: bestCharger.operator,
        });

        addChargerToRoute(bestCharger);
        console.log(
          `Added ${bestCharger.name || "Unnamed Charger"} to the route`
        );

        setIsRangeSufficient(false);
        setShowRangeMessage(true);
      } else {
        console.log("No suitable charger found");
      }
    } catch (error) {
      console.error("Error finding optimal charger:", error);
    } finally {
      setIsSearchingChargers(false);
    }
  };

  const addChargerToRoute = (charger: any) => {
    if (!coordinates) return;

    const newRoute = [...coordinates];

    const insertIndex = Math.floor(coordinates.length / 2);
    newRoute.splice(insertIndex, 0, {
      latitude: charger.lat,
      longitude: charger.lng,
    });

    setRouteWithStops(newRoute);
    setSelectedChargers([charger]);
  };

  const planChargingStops = async () => {
    try {
      if (!coordinates) {
        console.error("Error: Missing coordinates for route planning.");
        return;
      }

      setIsCalculatingRoute(true);
      console.log("Fetching route details from Mapbox...");
      let route = await getRouteDetails(coordinates);

      if (!route) {
        Alert.alert("Error", "Could not fetch route details.");
        return;
      }

      let routeDistance = route.distance / 1000;
      console.log(
        `Route distance: ${routeDistance}km, Available range: ${availableRange}km, Max range: ${maxRange}km`
      );

      // If we have enough range for the entire route, no need for charging stops
      if (availableRange !== undefined && availableRange >= routeDistance) {
        console.log(
          `Available range (${availableRange} km) is sufficient for the entire route (${Math.round(
            routeDistance
          )} km).`
        );
        setIsRangeSufficient(true);
        setShowRangeMessage(true);
        setRouteWithStops(coordinates);
        return;
      }

      // Step 1: Find a charger within the current available range
      const initialSearchRadius = Math.min(
        (availableRange !== undefined ? availableRange : 10) * 1000,
        10000
      );
      console.log(
        `Step 1: Searching for initial charger within ${
          initialSearchRadius / 1000
        }km radius`
      );

      const initialChargers = await fetchEVChargersAlongRoute(
        [coordinates[0]],
        initialSearchRadius,
        filters
      );

      if (initialChargers.length === 0) {
        Alert.alert(
          "No Chargers Found",
          "No charging stations found within your current range. Please charge your vehicle before starting this route."
        );
        setIsCalculatingRoute(false);
        return;
      }

      // Find the closest charger to the start point
      const closestCharger = initialChargers.reduce((closest, current) => {
        const closestDist = calculateDistance(
          coordinates[0].latitude,
          coordinates[0].longitude,
          closest.lat,
          closest.lng
        );
        const currentDist = calculateDistance(
          coordinates[0].latitude,
          coordinates[0].longitude,
          current.lat,
          current.lng
        );
        return currentDist < closestDist ? current : closest;
      });

      // Add the initial charger to the route
      const initialChargerCoord = {
        latitude: closestCharger.lat,
        longitude: closestCharger.lng,
      };

      // Step 2: Now plan the rest of the route assuming we're at max range
      console.log(
        "Step 2: Planning remaining route from initial charger with max range"
      );

      // Calculate distance from initial charger to destination
      const distanceToDestination = calculateDistance(
        initialChargerCoord.latitude,
        initialChargerCoord.longitude,
        coordinates[coordinates.length - 1].latitude,
        coordinates[coordinates.length - 1].longitude
      );

      console.log(
        `Distance from initial charger to destination: ${Math.round(
          distanceToDestination
        )}km`
      );

      // If we can reach the destination from the initial charger with max range, we're done
      if (distanceToDestination <= (maxRange || 300)) {
        console.log(
          "Can reach destination from initial charger with max range"
        );
        setRouteWithStops([
          coordinates[0],
          initialChargerCoord,
          coordinates[coordinates.length - 1],
        ]);
        setIsRangeSufficient(false);
        setShowRangeMessage(true);
        return;
      }

      // Otherwise, we need to find additional chargers
      console.log("Need additional chargers to reach destination");

      // Function to find the best charger for a segment
      const findChargerForSegment = async (
        start: Coordinate,
        end: Coordinate,
        searchRadius: number,
        excludedChargers: Set<string> = new Set()
      ) => {
        const routePoints = await getPointsAlongRoute(start, end);
        console.log(
          `Searching for chargers along route with ${routePoints.length} points`
        );

        let allChargers: any[] = [];
        for (const point of routePoints) {
          try {
            console.log(
              `Searching for chargers at point: (${point.latitude}, ${point.longitude})`
            );
            const chargers = await fetchEVChargersAlongRoute(
              [point],
              searchRadius,
              filters || {}
            );
            allChargers = [...allChargers, ...chargers];

            // Add delay between API calls to prevent rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error: any) {
            if (error?.status === 429) {
              console.log("Rate limit hit, waiting 5 seconds before retry...");
              await new Promise((resolve) => setTimeout(resolve, 5000));
              // Retry once after waiting
              const chargers = await fetchEVChargersAlongRoute(
                [point],
                searchRadius,
                filters || {}
              );
              allChargers = [...allChargers, ...chargers];
            } else {
              console.error("Error fetching chargers:", error);
            }
          }
        }

        // Remove duplicates and excluded chargers
        const uniqueChargers = allChargers.filter(
          (charger, index, self) =>
            index ===
              self.findIndex(
                (c) => c.lat === charger.lat && c.lng === charger.lng
              ) && !excludedChargers.has(`${charger.lat},${charger.lng}`)
        );

        if (uniqueChargers.length === 0) {
          return null;
        }

        // Score and sort chargers
        const scoredChargers = uniqueChargers.map((charger) => {
          const distanceFromStart = calculateDistance(
            start.latitude,
            start.longitude,
            charger.lat,
            charger.lng
          );
          const distanceToEnd = calculateDistance(
            charger.lat,
            charger.lng,
            end.latitude,
            end.longitude
          );

          // Prefer chargers that are:
          // 1. Within range of both start and end
          // 2. Closer to the midpoint of the route
          // 3. Have better availability
          const midpoint = {
            latitude: (start.latitude + end.latitude) / 2,
            longitude: (start.longitude + end.longitude) / 2,
          };
          const distanceToMidpoint = calculateDistance(
            charger.lat,
            charger.lng,
            midpoint.latitude,
            midpoint.longitude
          );

          const maxRangeMeters = (maxRange || 300) * 1000;
          const isWithinRange =
            distanceFromStart <= maxRangeMeters &&
            distanceToEnd <= maxRangeMeters;

          const availabilityScore =
            charger.availability === "AVAILABLE" ? 1 : 0.5;
          const rangeScore = isWithinRange ? 1 : 0.5;
          const midpointScore = 1 - distanceToMidpoint / (maxRangeMeters * 2);

          return {
            ...charger,
            score:
              availabilityScore * 0.4 + rangeScore * 0.4 + midpointScore * 0.2,
          };
        });

        scoredChargers.sort((a, b) => b.score - a.score);
        return scoredChargers[0];
      };

      // Find additional chargers needed to complete the journey
      let currentPosition = initialChargerCoord;
      let remainingRoute = [
        currentPosition,
        coordinates[coordinates.length - 1],
      ];
      let chargingStops = [closestCharger];
      let excludedChargers = new Set([
        `${closestCharger.lat},${closestCharger.lng}`,
      ]);

      while (true) {
        const distanceToDestination = calculateDistance(
          currentPosition.latitude,
          currentPosition.longitude,
          coordinates[coordinates.length - 1].latitude,
          coordinates[coordinates.length - 1].longitude
        );

        if (distanceToDestination <= (maxRange || 300)) {
          console.log("Can reach destination from current position");
          break;
        }

        console.log(
          `Need additional charger, ${Math.round(
            distanceToDestination
          )}km remaining`
        );

        const nextCharger = await findChargerForSegment(
          currentPosition,
          coordinates[coordinates.length - 1],
          (maxRange || 300) * 1000,
          excludedChargers
        );

        if (!nextCharger) {
          console.log("No suitable charger found to complete journey");
          break;
        }

        const nextChargerCoord = {
          latitude: nextCharger.lat,
          longitude: nextCharger.lng,
        };

        chargingStops.push(nextCharger);
        excludedChargers.add(`${nextCharger.lat},${nextCharger.lng}`);
        currentPosition = nextChargerCoord;

        // Add delay between charger searches
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Build the final route with all charging stops
      const finalRoute = [
        coordinates[0],
        ...chargingStops.map((charger) => ({
          latitude: charger.lat,
          longitude: charger.lng,
        })),
        coordinates[coordinates.length - 1],
      ];

      console.log(
        `Final route has ${finalRoute.length} points with ${chargingStops.length} charging stops`
      );
      setRouteWithStops(finalRoute);
      setIsRangeSufficient(false);
      setShowRangeMessage(true);
    } catch (error) {
      console.error("Error calculating route:", error);
      Alert.alert("Error", "Could not calculate route.");
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const isChargerInRoute = (charger: any): boolean => {
    return routeWithStops.some(
      (point) =>
        point.latitude === charger.lat && point.longitude === charger.lng
    );
  };

  const handleChargerSelect = async (
    charger: any,
    action: "add" | "remove"
  ) => {
    if (action === "add") {
      if (isChargerInRoute(charger)) {
        return;
      }

      const newRoute = [...routeWithStops];
      const insertIndex = Math.floor(routeWithStops.length / 2);
      newRoute.splice(insertIndex, 0, {
        latitude: charger.lat,
        longitude: charger.lng,
      });
      setRouteWithStops(newRoute);

      setSelectedChargers((prev) => [...prev, charger]);
    } else if (action === "remove") {
      const newRoute = routeWithStops.filter(
        (point) =>
          point.latitude !== charger.lat || point.longitude !== charger.lng
      );
      setRouteWithStops(newRoute);

      setSelectedChargers((prev) =>
        prev.filter((c) => !(c.lat === charger.lat && c.lng === charger.lng))
      );
    }
  };

  const fetchAmenitiesForCharger = async (charger: any) => {
    const chargerId = `${charger.lat},${charger.lng}`;

    if (chargerAmenities[chargerId] || loadingChargerAmenities[chargerId]) {
      return;
    }

    setLoadingChargerAmenities((prev) => ({
      ...prev,
      [chargerId]: true,
    }));

    try {
      const amenities = await checkNearbyAmenities(
        charger.lat,
        charger.lng,
        Object.keys(googleTypes)
      );

      setChargerAmenities((prev) => ({
        ...prev,
        [chargerId]: amenities || [],
      }));
    } catch (error) {
      console.error(
        `Error fetching amenities for charger ${chargerId}:`,
        error
      );
      setChargerAmenities((prev) => ({
        ...prev,
        [chargerId]: [],
      }));
    } finally {
      setLoadingChargerAmenities((prev) => ({
        ...prev,
        [chargerId]: false,
      }));
    }
  };

  const handleAmenityPress = async (amenity: any) => {
    setSelectedAmenity(amenity);
    setAmenityModalVisible(true);
    await getPlaceDetails(amenity.placeId);
  };

  const getPlaceDetails = async (placeId: string) => {
    if (!placeId) {
      console.error("Error: Invalid placeId received for fetching details.");
      return;
    }

    setLoadingAmenityDetails(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${Constants.expoConfig?.extra?.googlePlacesApiKey}&fields=name,rating,reviews,formatted_address,photos,opening_hours`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.result) {
        console.error("API Error: No place details found.");
        setAmenityDetails(null);
        return;
      }

      const details = {
        name: data.result.name,
        address: data.result.formatted_address || "No address available",
        rating: data.result.rating,
        reviews: data.result.reviews || [],
        photos:
          data.result.photos?.map(
            (photo: any) =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${Constants.expoConfig?.extra?.googlePlacesApiKey}`
          ) || [],
        opening_hours: data.result.opening_hours || { weekday_text: [] },
      };

      setAmenityDetails(details);
    } catch (error) {
      console.error("Error fetching place details:", error);
      setAmenityDetails(null);
    } finally {
      setLoadingAmenityDetails(false);
    }
  };

  const fetchRouteChargers = async () => {
    setLoadingRouteChargers(true);
    try {
      console.log("Fetching chargers along route...");
      if (!coordinates) {
        console.error("No coordinates available to fetch chargers");
        return;
      }

      // Extract points along the route
      const routePoints: [number, number][] = routeWithStops.map((point) => [
        point.longitude,
        point.latitude,
      ]);

      // Calculate total route distance (for reference)
      const totalRouteDistance = routeWithStops.reduce((acc, point, index) => {
        if (index === 0) return 0;
        const prevPoint = routeWithStops[index - 1];
        const dist = calculateDistance(
          prevPoint.latitude,
          prevPoint.longitude,
          point.latitude,
          point.longitude
        );
        return acc + dist;
      }, 0);

      console.log(`Total route distance: ${Math.round(totalRouteDistance)} km`);

      // Calculate dynamic search radius based on route length
      const baseRadius = 15000;
      const additionalRadius = Math.floor(totalRouteDistance / 200) * 5000;
      const searchRadius = Math.min(baseRadius + additionalRadius, 30000);

      console.log(`Using dynamic search radius: ${Math.round(searchRadius)}m`);

      // Optimize search points based on route length
      let searchPoints: Coordinate[] = [];

      if (totalRouteDistance <= 50) {
        searchPoints = [
          routeWithStops[0],
          routeWithStops[routeWithStops.length - 1],
        ];
      } else if (totalRouteDistance <= 200) {
        const midIndex = Math.floor(routeWithStops.length / 2);
        searchPoints = [
          routeWithStops[0],
          routeWithStops[midIndex],
          routeWithStops[routeWithStops.length - 1],
        ];
      } else {
        const numPoints = Math.min(5, Math.ceil(totalRouteDistance / 100));
        const step = Math.floor(routeWithStops.length / (numPoints - 1));

        for (let i = 0; i < numPoints; i++) {
          const index = i * step;
          if (index < routeWithStops.length) {
            searchPoints.push(routeWithStops[index]);
          }
        }

        if (!searchPoints.includes(routeWithStops[routeWithStops.length - 1])) {
          searchPoints.push(routeWithStops[routeWithStops.length - 1]);
        }
      }

      console.log(
        `Fetching chargers along route with ${searchPoints.length} optimized search points`
      );

      // Check cache first
      const cacheKey = getCacheKey(searchPoints, searchRadius);
      const cachedData = chargerCache.current[cacheKey];
      const now = Date.now();

      if (cachedData && now - cachedData.timestamp < CACHE_LIFETIME) {
        console.log("Using cached charger data");
        setRouteChargers(cachedData.chargers);
        setLoadingRouteChargers(false);
        return;
      }

      // Fetch chargers along the route
      const chargers = await fetchEVChargersAlongRoute(
        searchPoints,
        searchRadius,
        filters || {}
      );

      // Update cache
      chargerCache.current[cacheKey] = {
        chargers,
        timestamp: now,
      };

      console.log(`Found ${chargers.length} chargers along route`);

      // Filter chargers by range constraints
      const filteredChargers = chargers.filter((charger) => {
        const distanceFromStart = calculateDistance(
          routeWithStops[0].latitude,
          routeWithStops[0].longitude,
          charger.lat,
          charger.lng
        );

        const distanceToDestination = calculateDistance(
          charger.lat,
          charger.lng,
          routeWithStops[routeWithStops.length - 1].latitude,
          routeWithStops[routeWithStops.length - 1].longitude
        );

        // More lenient range constraints
        const isReachable = distanceFromStart <= (availableRange || 300) * 1.1; // Allow up to 110% of range
        const canCompleteJourney =
          distanceToDestination <= (availableRange || 300) * 1.1 || // Allow up to 110% of range
          distanceFromStart + distanceToDestination <= totalRouteDistance * 1.5; // Allow up to 50% detour

        if (!isReachable) {
          console.log(
            `Charger at ${charger.lat},${charger.lng} is not reachable:`,
            {
              distance: `${Math.round(distanceFromStart)}km`,
              maxRange: `${Math.round((availableRange || 300) * 1.1)}km`,
            }
          );
        }
        if (!canCompleteJourney) {
          console.log(
            `Cannot complete journey from charger at ${charger.lat},${charger.lng}:`,
            {
              distance: `${Math.round(distanceToDestination)}km`,
              maxRange: `${Math.round((availableRange || 300) * 1.1)}km`,
              totalRouteDistance: `${Math.round(totalRouteDistance)}km`,
            }
          );
        }

        return isReachable && canCompleteJourney;
      });

      console.log(`Chargers after range filtering: ${filteredChargers.length}`);

      const sortChargers = (chargers: any[]) => {
        return chargers.sort((a, b) => {
          const aSelected = isChargerInRoute(a);
          const bSelected = isChargerInRoute(b);

          if (aSelected && !bSelected) return -1;
          if (!aSelected && bSelected) return 1;

          const distanceA = calculateDistance(
            routeWithStops[0].latitude,
            routeWithStops[0].longitude,
            a.lat,
            a.lng
          );
          const distanceB = calculateDistance(
            routeWithStops[0].latitude,
            routeWithStops[0].longitude,
            b.lat,
            b.lng
          );
          return distanceA - distanceB;
        });
      };

      const sortedChargers = filteredChargers.sort((a, b) => {
        const distanceA = calculateDistance(
          routeWithStops[0].latitude,
          routeWithStops[0].longitude,
          a.lat,
          a.lng
        );
        const distanceB = calculateDistance(
          routeWithStops[0].latitude,
          routeWithStops[0].longitude,
          b.lat,
          b.lng
        );
        return distanceA - distanceB;
      });

      const finalChargers = sortChargers(sortedChargers);
      setRouteChargers(finalChargers);

      // Prefetch amenities for all chargers
      console.log("Prefetching amenities for all chargers...");
      finalChargers.forEach((charger) => {
        fetchAmenitiesForCharger(charger);
      });
    } catch (error: any) {
      console.error("Error fetching route chargers:", error);
      let errorMessage = "Failed to fetch chargers along the route";

      if (error?.status === 429 || error?.message?.includes("429")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
        setShowRouteChargersModal(false);
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoadingRouteChargers(false);
    }
  };

  const getPointsAlongRoute = async (
    start: Coordinate,
    end: Coordinate
  ): Promise<Coordinate[]> => {
    const NUM_POINTS = 5; // Check 5 points along the segment
    const points: Coordinate[] = [];

    for (let i = 0; i < NUM_POINTS; i++) {
      const t = i / (NUM_POINTS - 1);
      points.push({
        latitude: start.latitude + (end.latitude - start.latitude) * t,
        longitude: start.longitude + (end.longitude - start.longitude) * t,
      });
    }

    return points;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="rgba(130, 157, 131, 0.95)"
        translucent={true}
      />

      {/* Status bar area */}
      <View
        style={{
          backgroundColor: "rgba(130, 157, 131, 0.95)",
          height: insets.top,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 11,
        }}
      />

      <MapboxNavigationView
        style={styles.map}
        coordinates={
          routeWithStops.length > 0 ? routeWithStops : coordinates || []
        }
        routeProfile="driving"
        mapStyle="mapbox://styles/mapbox/outdoors-v11"
        useRouteMatchingApi={false}
        mute={false}
        onCancelNavigation={() => navigation.goBack()}
      />

      {isCalculatingRoute && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>
              Calculating optimal charging stops...
            </Text>
            <Text style={styles.loadingSubtext}>
              This may take a few moments
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.routeChargersButton}
        onPress={() => {
          setShowRouteChargersModal(true);
          fetchRouteChargers();
        }}
      >
        <Image
          source={require("../assets/eco-battery.png")}
          style={styles.routeChargersIcon}
        />
      </TouchableOpacity>

      <RangeMessage
        showRangeMessage={showRangeMessage}
        fadeAnim={fadeAnim}
        setShowRangeMessage={setShowRangeMessage}
        isRangeSufficient={isRangeSufficient}
        selectedChargerInfo={selectedChargerInfo}
      />

      <AmenityModal
        visible={amenityModalVisible}
        onClose={() => setAmenityModalVisible(false)}
        amenityDetails={amenityDetails}
        loading={loadingAmenityDetails}
        onPhotoPress={(photoUrl) => setExpandedPhoto(photoUrl)}
      />

      <ExpandedPhotoModal
        photoUrl={expandedPhoto}
        onClose={() => setExpandedPhoto(null)}
      />

      <RouteChargerModal
        visible={showRouteChargersModal}
        onClose={() => setShowRouteChargersModal(false)}
        chargers={routeChargers}
        loading={loadingRouteChargers}
        loadingAmenities={loadingChargerAmenities}
        chargerAmenities={chargerAmenities}
        isChargerInRoute={isChargerInRoute}
        onChargerSelect={handleChargerSelect}
        onAmenityPress={handleAmenityPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(114, 185, 117, 0.95)",
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  loadingSubtext: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 8,
    opacity: 0.8,
    textAlign: "center",
  },
  routeChargersButton: {
    position: "absolute",
    bottom: "55%",
    right: 20,
    backgroundColor: "#FFFFFF",
    width: 52,
    height: 52,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeChargersIcon: {
    width: 24,
    height: 24,
    tintColor: "#000000",
  },
});
