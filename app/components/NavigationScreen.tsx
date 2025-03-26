import React, { useState, useEffect } from "react";
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

      console.log("✅ Route fetched successfully.");
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
          `🔍 Searching waypoint ${i + 1}: (${waypoint.latitude}, ${
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
        console.log("❌ No suitable chargers found");
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
        console.log("❌ No suitable charger found");
      }
    } catch (error) {
      console.error("❌ Error finding optimal charger:", error);
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
        console.error("🚨 Error: Missing coordinates for route planning.");
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

      console.log(
        `Insufficient Range: Route is ${Math.round(
          routeDistance
        )}km, exceeds available range of ${availableRange}km.`
      );

      // Initialize route with charging stops
      let currentRoute = [...coordinates];
      let currentChargingStops: any[] = [];
      let currentChargerIndex = 0;

      // Function to check if a segment is within max range
      const isSegmentWithinRange = (
        start: Coordinate,
        end: Coordinate
      ): boolean => {
        const distance = calculateDistance(
          start.latitude,
          start.longitude,
          end.latitude,
          end.longitude
        );
        return distance <= (maxRange || availableRange || 300);
      };

      // Function to find the best charger for a segment
      const findChargerForSegment = async (
        start: Coordinate,
        end: Coordinate
      ) => {
        const SEARCH_RADIUS = Math.min(
          30000,
          (maxRange || availableRange || 300) * 400
        );

        // Calculate multiple points along the segment
        const NUM_POINTS = 5; // Check 5 points along the segment
        const searchPoints: Coordinate[] = [];

        for (let i = 0; i < NUM_POINTS; i++) {
          const t = i / (NUM_POINTS - 1);
          searchPoints.push({
            latitude: start.latitude + (end.latitude - start.latitude) * t,
            longitude: start.longitude + (end.longitude - start.longitude) * t,
          });
        }

        // Search for chargers at each point with delay between calls
        let allChargers: any[] = [];
        for (const point of searchPoints) {
          console.log(
            `Searching for chargers at point: (${point.latitude}, ${point.longitude})`
          );

          // Add delay between API calls (1 second)
          if (allChargers.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          try {
            const chargers = await fetchEVChargersAlongRoute(
              [point],
              SEARCH_RADIUS,
              filters
            );
            allChargers.push(...chargers);
          } catch (error: any) {
            if (error?.status === 429) {
              console.log("Rate limit hit, waiting 5 seconds before retry...");
              await new Promise((resolve) => setTimeout(resolve, 5000));
              // Retry once after waiting
              const chargers = await fetchEVChargersAlongRoute(
                [point],
                SEARCH_RADIUS,
                filters
              );
              allChargers.push(...chargers);
            } else {
              console.error("Error fetching chargers:", error);
            }
          }
        }

        // Remove duplicate chargers
        const uniqueChargers = Array.from(
          new Map(
            allChargers.map((charger) => [
              `${charger.lat},${charger.lng}`,
              charger,
            ])
          ).values()
        );

        console.log(
          `Found ${uniqueChargers.length} unique chargers along segment`
        );

        if (uniqueChargers.length === 0) {
          console.log("No chargers found at any point along the segment");
          return null;
        }

        // Find the best charger among all unique chargers
        const bestCharger = selectBestCharger(
          uniqueChargers,
          start,
          end,
          maxRange || availableRange || 300,
          calculateDistance(
            start.latitude,
            start.longitude,
            end.latitude,
            end.longitude
          )
        );

        if (bestCharger) {
          console.log(
            `Found best charger: ${bestCharger.name || "Unnamed"} at (${
              bestCharger.lat
            }, ${bestCharger.lng})`
          );
        } else {
          console.log("No suitable charger found among the available chargers");
        }

        return bestCharger;
      };

      // Function to plan charging stops for a route segment
      const planSegmentChargingStops = async (
        start: Coordinate,
        end: Coordinate,
        depth: number = 0,
        maxDepth: number = 5 // Prevent infinite recursion
      ): Promise<Coordinate[]> => {
        // If we've reached max depth or the segment is within range, return the segment
        if (depth >= maxDepth || isSegmentWithinRange(start, end)) {
          return [start, end];
        }

        // Add delay between recursive calls (2 seconds)
        if (depth > 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        console.log(`Planning segment ${depth + 1}/${maxDepth}:`, {
          start: `${start.latitude},${start.longitude}`,
          end: `${end.latitude},${end.longitude}`,
          distance: Math.round(
            calculateDistance(
              start.latitude,
              start.longitude,
              end.latitude,
              end.longitude
            )
          ),
        });

        const charger = await findChargerForSegment(start, end);
        if (!charger) {
          console.log("No suitable charger found, returning direct segment");
          return [start, end];
        }

        const chargerCoord = {
          latitude: charger.lat,
          longitude: charger.lng,
        };

        // Calculate distances to verify charger placement
        const distanceToCharger = calculateDistance(
          start.latitude,
          start.longitude,
          chargerCoord.latitude,
          chargerCoord.longitude
        );

        const distanceFromCharger = calculateDistance(
          chargerCoord.latitude,
          chargerCoord.longitude,
          end.latitude,
          end.longitude
        );

        console.log("Charger placement distances:", {
          toCharger: Math.round(distanceToCharger),
          fromCharger: Math.round(distanceFromCharger),
          maxRange: maxRange || availableRange || 300,
        });

        // Check if we need additional charging stops for either segment
        let firstSegment = [start, chargerCoord];
        let secondSegment = [chargerCoord, end];

        // If the first segment is too long, plan additional stops
        if (!isSegmentWithinRange(start, chargerCoord)) {
          console.log("First segment needs additional charging stops");
          firstSegment = await planSegmentChargingStops(
            start,
            chargerCoord,
            depth + 1,
            maxDepth
          );
        }

        // If the second segment is too long, plan additional stops
        if (!isSegmentWithinRange(chargerCoord, end)) {
          console.log("Second segment needs additional charging stops");
          secondSegment = await planSegmentChargingStops(
            chargerCoord,
            end,
            depth + 1,
            maxDepth
          );
        }

        // Combine segments, removing duplicate charger coordinate
        const combinedRoute = [...firstSegment, ...secondSegment.slice(1)];

        console.log(`Planned route with ${combinedRoute.length} points`);
        return combinedRoute;
      };

      // Plan charging stops for the entire route
      console.log("Starting route planning...");
      const routeWithChargingStops = await planSegmentChargingStops(
        coordinates[0],
        coordinates[coordinates.length - 1]
      );

      console.log(`Final route has ${routeWithChargingStops.length} points`);

      // Update the route with charging stops
      setRouteWithStops(routeWithChargingStops);

      // If we added any charging stops, show the range message
      if (routeWithChargingStops.length > coordinates.length) {
        setIsRangeSufficient(false);
        setShowRangeMessage(true);
      }
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
        point.longitude, // Longitude first for Mapbox
        point.latitude,
      ]);

      console.log(
        `Fetching chargers along route with ${routePoints.length} points`
      );

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

      // Fetch chargers along the route
      const chargers = await fetchEVChargersAlongRoute(
        routeWithStops,
        10000, // Use a 10km search radius
        filters || {}
      );

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

        const isReachable = distanceFromStart <= (availableRange || 300) * 0.95;

        const canCompleteJourney =
          distanceToDestination <= (availableRange || 300) * 0.95 ||
          distanceFromStart + distanceToDestination <= totalRouteDistance * 1.2;

        if (!isReachable) {
          console.log(
            `Charger at ${charger.lat},${charger.lng} is not reachable:`,
            {
              distance: `${Math.round(distanceFromStart)}km`,
              maxRange: `${Math.round((availableRange || 300) * 0.95)}km`,
            }
          );
        }
        if (!canCompleteJourney) {
          console.log(
            `Cannot complete journey from charger at ${charger.lat},${charger.lng}:`,
            {
              distance: `${Math.round(distanceToDestination)}km`,
              maxRange: `${Math.round((availableRange || 300) * 0.95)}km`,
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
