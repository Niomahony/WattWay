import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { styles } from "../../styles/styles";
import { fetchEVChargers } from "../../api/mapApi";
import { googleTypes } from "../../helpers/amenityCategories";
import { clusterChargers } from "../../helpers/ClusterChargers";

interface EVChargerDetailsProps {
  centerCoordinate: [number, number] | null;
  currentZoom: number;
  onChargerSelect: (charger: any) => void;
  cameraRef: React.RefObject<MapboxGL.Camera>;
  filters: {
    connectorType?: string | null;
    minPowerKW?: number | null;
    chargerType?: string | null;
    chargingSpeed?: string | null;
    minRating?: number | null;
    brand?: string[] | null;
    amenities?: string[];
  };
}

// Interface for our charger cache entries
interface ChargerCacheEntry {
  chargers: any[];
  coordinates: [number, number];
  timestamp: number;
  filters: any;
}

// Create a memoized Marker component to prevent re-renders
const ChargerMarker = React.memo(
  ({
    charger,
    onSelected,
    cameraRef,
    index,
  }: {
    charger: any;
    onSelected: () => void;
    cameraRef: React.RefObject<MapboxGL.Camera>;
    index: number;
  }) => {
    // Create a truly unique key using both coordinates and index
    const key = `ev-${charger.lat}-${charger.lng}-${index}`;

    return (
      <MapboxGL.PointAnnotation
        key={key}
        id={key}
        coordinate={[charger.lng, charger.lat]}
        onSelected={onSelected}
      >
        <View style={styles.evMarker}>
          <Image
            source={require("../../assets/charger-icon.png")}
            style={{ width: 36, height: 36 }}
          />
        </View>
      </MapboxGL.PointAnnotation>
    );
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.charger.lat === nextProps.charger.lat &&
      prevProps.charger.lng === nextProps.charger.lng &&
      prevProps.index === nextProps.index
    );
  }
);

// Create a memoized Cluster Marker component
const ClusterMarker = React.memo(
  ({
    cluster,
    onSelected,
    cameraRef,
    index,
  }: {
    cluster: any;
    onSelected: () => void;
    cameraRef: React.RefObject<MapboxGL.Camera>;
    index: number;
  }) => {
    const key = `cluster-${cluster.lat}-${cluster.lng}-${index}`;
    const count = cluster.count || cluster.chargers.length;

    // Format count for display - handle large numbers
    let displayCount = count.toString();
    let fontSize = clusterStyles.normalText;

    if (count > 999) {
      displayCount = `${Math.floor(count / 1000)}k+`;
    } else if (count > 99) {
      displayCount = "99+";
    } else if (count > 50) {
      // Keep original count but use smaller text
      fontSize = clusterStyles.smallerText;
    }

    // Determine cluster size and color based on number of chargers
    let sizeClass = clusterStyles.small;
    let colorClass = clusterStyles.lowDensity;

    if (count > 100) {
      sizeClass = clusterStyles.extraLarge;
      colorClass = clusterStyles.veryHighDensity;
    } else if (count > 50) {
      sizeClass = clusterStyles.large;
      colorClass = clusterStyles.highDensity;
    } else if (count > 10) {
      sizeClass = clusterStyles.medium;
      colorClass = clusterStyles.mediumDensity;
    }

    return (
      <MapboxGL.PointAnnotation
        key={key}
        id={key}
        coordinate={[cluster.lng, cluster.lat]}
        onSelected={onSelected}
      >
        <View style={[clusterStyles.clusterContainer, sizeClass, colorClass]}>
          <Text style={[clusterStyles.clusterText, fontSize]}>
            {displayCount}
          </Text>
        </View>
      </MapboxGL.PointAnnotation>
    );
  },
  // Custom comparison function for clusters
  (prevProps, nextProps) => {
    return (
      prevProps.cluster.lat === nextProps.cluster.lat &&
      prevProps.cluster.lng === nextProps.cluster.lng &&
      prevProps.cluster.count === nextProps.cluster.count &&
      prevProps.index === nextProps.index
    );
  }
);

const EVChargerDetails = ({
  centerCoordinate,
  currentZoom,
  onChargerSelect,
  cameraRef,
  filters,
}: EVChargerDetailsProps) => {
  const [evChargers, setEvChargers] = useState<any[]>([]);
  const [clusteredChargers, setClusteredChargers] = useState<any[]>([]);
  const prevZoom = useRef<number | null>(null);
  const prevFilters = useRef(filters);
  const prevCenter = useRef<[number, number] | null>(null);
  const chargersCache = useRef<ChargerCacheEntry[]>([]);

  // Time in milliseconds that a cache entry remains valid
  const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes

  // Distance threshold in degrees for fetching new chargers
  const DISTANCE_THRESHOLD = 0.05; // Roughly 5km

  // Calculate distance between two coordinates
  const calculateDistance = (
    coord1: [number, number],
    coord2: [number, number]
  ): number => {
    // Simple Euclidean distance for quick calculation
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Apply clustering whenever chargers or zoom level changes
  useEffect(() => {
    if (evChargers.length > 0) {
      const clusters = clusterChargers(evChargers, currentZoom);
      setClusteredChargers(clusters);
    } else {
      setClusteredChargers([]);
    }
  }, [evChargers, currentZoom]);

  // Find cached chargers for the current location and filters
  const findCachedChargers = (): any[] | null => {
    if (!centerCoordinate) return null;

    // Clean up expired cache entries
    const now = Date.now();
    chargersCache.current = chargersCache.current.filter(
      (entry) => now - entry.timestamp < CACHE_LIFETIME
    );

    // Only use cache entries that match BOTH filters AND location
    for (const entry of chargersCache.current) {
      const distance = calculateDistance(centerCoordinate, entry.coordinates);
      const sameFilters =
        JSON.stringify(entry.filters) === JSON.stringify(filters);

      if (distance < DISTANCE_THRESHOLD && sameFilters) {
        console.log(
          `Found valid cached chargers from ${
            (now - entry.timestamp) / 1000
          }s ago`
        );
        return entry.chargers;
      }
    }

    return null;
  };

  // Check if we need to refresh chargers data
  const shouldRefreshChargers = (): boolean => {
    if (!centerCoordinate || !prevCenter.current) return true;

    // Immediately refresh when filters change
    if (JSON.stringify(prevFilters.current) !== JSON.stringify(filters)) {
      console.log("Filters changed, refreshing chargers");
      return true;
    }

    // Check if we've moved significantly from the previous center
    const distance = calculateDistance(centerCoordinate, prevCenter.current);
    const significantMove = distance > DISTANCE_THRESHOLD;

    // Check if zoom has changed significantly
    const significantZoomChange =
      prevZoom.current !== null && Math.abs(currentZoom - prevZoom.current) > 2;

    return significantMove || significantZoomChange;
  };

  useEffect(() => {
    if (centerCoordinate) {
      // Always fetch new chargers when filters change
      if (JSON.stringify(prevFilters.current) !== JSON.stringify(filters)) {
        console.log("Filters changed, forcing refresh");
        // Important: If amenity filters have changed, clear the entire cache
        // to prevent showing incorrectly filtered chargers
        if (
          (filters.amenities?.length || 0) > 0 ||
          (prevFilters.current?.amenities?.length || 0) > 0
        ) {
          console.log("Amenity filters changed, clearing cache");
          chargersCache.current = [];
        }
        fetchChargers();
      }
      // Only fetch new chargers if necessary based on location/zoom
      else if (shouldRefreshChargers()) {
        fetchChargers();
      } else {
        console.log("Using cached chargers - no significant changes");
      }
    }
  }, [centerCoordinate, currentZoom, JSON.stringify(filters)]);

  const fetchChargers = async () => {
    if (!centerCoordinate) return;

    try {
      console.log("Fetching EV chargers...");
      console.log("Center Coordinate:", centerCoordinate);
      console.log("Applied Filters:", filters);

      // Clear cache entries with the same location but different filters
      if (JSON.stringify(prevFilters.current) !== JSON.stringify(filters)) {
        const now = Date.now();
        console.log("Clearing conflicting cache entries due to filter change");
        chargersCache.current = chargersCache.current.filter((entry) => {
          const distance = calculateDistance(
            centerCoordinate,
            entry.coordinates
          );
          // Keep entries that are far away or have matching filters
          return (
            distance >= DISTANCE_THRESHOLD ||
            JSON.stringify(entry.filters) === JSON.stringify(filters)
          );
        });
      }

      // Check cache first
      const cachedChargers = findCachedChargers();
      if (cachedChargers) {
        console.log(`Using ${cachedChargers.length} cached chargers`);
        setEvChargers(cachedChargers);
        return;
      }

      // Fetch more chargers at lower zoom levels to ensure good clustering
      const searchRadius =
        currentZoom < 10
          ? 20000 // 20km at low zoom
          : currentZoom < 12
          ? 15000 // 15km at medium zoom
          : 10000; // 10km at high zoom

      const chargers = await fetchEVChargers(
        centerCoordinate,
        {
          ...filters,
          brand: filters.brand || undefined,
        },
        searchRadius
      );

      if (!chargers || chargers.length === 0) {
        console.log("No chargers found.");
        setEvChargers([]);
        return;
      }

      // Update reference values
      prevFilters.current = { ...filters };
      prevZoom.current = currentZoom;
      prevCenter.current = [...centerCoordinate];

      console.log(`Found ${chargers.length} new chargers from API`);

      // Filter chargers based on amenities selection
      let filteredChargers = chargers;

      // Only apply amenity filtering if amenities are selected
      if (filters.amenities && filters.amenities.length > 0) {
        console.log(
          `Filtering chargers by amenities: ${filters.amenities.join(", ")}`
        );

        // Type mapping to handle different naming conventions from Google Places API
        const typeMapping: Record<string, string[]> = {
          restaurant: ["restaurant", "meal_delivery", "meal_takeaway", "food"],
          cafe: ["cafe", "bakery", "coffee_shop"],
          hospital: [
            "hospital",
            "health_care",
            "medical_center",
            "doctor",
            "emergency_room",
          ],
          hotel: ["lodging", "hotel", "motel", "guest_house"],
          gas_station: [
            "gas_station",
            "fuel",
            "electric_vehicle_charging_station",
          ],
          supermarket: [
            "supermarket",
            "grocery_or_supermarket",
            "convenience_store",
            "food_market",
          ],
          convenience_store: [
            "convenience_store",
            "grocery_or_supermarket",
            "store",
            "food",
            "general_store",
            "corner_store",
            "mini_market",
            "local_store",
          ],
          shopping_mall: [
            "shopping_mall",
            "shopping_center",
            "department_store",
            "marketplace",
          ],
          pharmacy: ["pharmacy", "drugstore", "health"],
          bank: ["bank", "finance", "financial_institution"],
          atm: ["atm", "finance", "money_service"],
          gym: [
            "gym",
            "fitness_center",
            "health_club",
            "sports_center",
            "recreation_center",
          ],
          bar: ["bar", "night_club", "pub"],
          museum: ["museum", "art_gallery", "tourist_attraction"],
          library: ["library", "book_store"],
          movie_theater: ["movie_theater", "cinema"],
          post_office: ["post_office", "courier_service"],
          parking: ["parking", "parking_lot"],
        };

        // Convert selected amenities to Google Places API types
        const selectedAmenityTypes = filters.amenities
          .map((amenity) => googleTypes[amenity as keyof typeof googleTypes])
          .filter(Boolean);

        console.log("Selected amenity types:", selectedAmenityTypes);

        filteredChargers = chargers.filter((charger: any) => {
          // Skip if the charger doesn't have nearbyPlaces
          if (!charger.nearbyPlaces || charger.nearbyPlaces.length === 0) {
            return false;
          }

          // Check if any of the charger's nearby places match the selected amenities
          const hasMatchingAmenity = charger.nearbyPlaces.some((place: any) => {
            if (!place.types || place.types.length === 0) {
              return false;
            }

            // For each place, check if any of its types match our filtered amenity types
            for (const amenityType of filters.amenities || []) {
              const googleTypesList = typeMapping[amenityType] || [];

              // Check if any of the place's types match the expected Google types
              const hasMatchingType = place.types.some((placeType: string) =>
                googleTypesList.includes(placeType)
              );

              if (hasMatchingType) {
                console.log(
                  `✅ Match found: ${amenityType} at ${place.name} for charger ${charger.name}`
                );
                return true;
              }
            }

            return false;
          });

          if (!hasMatchingAmenity) {
            console.log(`❌ No matching amenity for charger ${charger.name}`);
          }

          return hasMatchingAmenity;
        });

        console.log(
          `Filtered to ${filteredChargers.length} chargers with the selected amenities nearby`
        );
      }

      // Remove duplicates by comparing coordinates (rounding to 6 decimal places)
      const uniqueChargersMap = new Map();
      filteredChargers.forEach((charger: any) => {
        // Round coordinates to 6 decimal places to handle small precision differences
        const roundedLat = Math.round(charger.lat * 1000000) / 1000000;
        const roundedLng = Math.round(charger.lng * 1000000) / 1000000;
        const key = `${roundedLat},${roundedLng}`;

        // Only keep the first occurrence of each charger location
        if (!uniqueChargersMap.has(key)) {
          uniqueChargersMap.set(key, charger);
        }
      });

      const uniqueFilteredChargers = Array.from(uniqueChargersMap.values());
      console.log(
        `Reduced to ${uniqueFilteredChargers.length} unique chargers after deduplication`
      );

      // Save to cache before setting state
      chargersCache.current.push({
        chargers: uniqueFilteredChargers,
        coordinates: centerCoordinate,
        timestamp: Date.now(),
        filters: { ...filters },
      });

      // Limit cache size to prevent memory issues
      if (chargersCache.current.length > 5) {
        chargersCache.current.shift(); // Remove oldest entry
      }

      setEvChargers(uniqueFilteredChargers);
    } catch (error) {
      console.error("Error fetching chargers:", error);
    }
  };

  // Handle cluster selection
  const handleClusterSelect = (cluster: any) => {
    if (cameraRef.current) {
      console.log(
        `Handling cluster with ${
          cluster.count || 0
        } chargers at zoom ${currentZoom.toFixed(2)}`
      );

      // Get all chargers in the cluster
      const clusterChargers = cluster.chargers || [];

      if (clusterChargers.length === 0) {
        console.log("Warning: Empty cluster selected");
        return;
      }

      if (clusterChargers.length === 1) {
        // If only one charger, just zoom to it directly
        cameraRef.current.setCamera({
          centerCoordinate: [clusterChargers[0].lng, clusterChargers[0].lat],
          zoomLevel: Math.max(currentZoom + 2, 15.5), // Always zoom in at least 2 levels
          animationDuration: 800,
          animationMode: "flyTo",
        });
        console.log(
          `Zooming to single charger at zoom level ${Math.max(
            currentZoom + 2,
            15.5
          )}`
        );
        return;
      }

      // Calculate the bounding box of all chargers in the cluster
      let minLat = Number.MAX_VALUE;
      let maxLat = -Number.MAX_VALUE;
      let minLng = Number.MAX_VALUE;
      let maxLng = -Number.MAX_VALUE;

      clusterChargers.forEach((charger: any) => {
        minLat = Math.min(minLat, charger.lat);
        maxLat = Math.max(maxLat, charger.lat);
        minLng = Math.min(minLng, charger.lng);
        maxLng = Math.max(maxLng, charger.lng);
      });

      // Calculate the geographical span of the cluster
      const latDiff = maxLat - minLat;
      const lngDiff = maxLng - minLng;
      const maxDiff = Math.max(latDiff, lngDiff);

      // Log the size of the cluster's bounding box for debugging
      console.log(
        `Cluster spans: ${(latDiff * 111).toFixed(2)}km latitude, ${(
          lngDiff *
          111 *
          Math.cos((minLat * Math.PI) / 180)
        ).toFixed(2)}km longitude`
      );

      // Special case for very small clusters (points very close together)
      // Just zoom in by a fixed amount to break them apart
      if (maxDiff < 0.005) {
        // Less than ~500m
        const newZoom = Math.max(currentZoom + 2.5, 16);
        console.log(`Small cluster, forcing zoom to ${newZoom}`);

        cameraRef.current.setCamera({
          centerCoordinate: [cluster.lng, cluster.lat],
          zoomLevel: newZoom,
          animationDuration: 800,
          animationMode: "flyTo",
        });
        return;
      }

      // Special case for large clusters (many chargers or wide area)
      if (clusterChargers.length > 50 || maxDiff > 0.1) {
        // More than 50 chargers or span > ~10km
        // Add a larger padding (10%) for better context when looking at large clusters
        const latPadding = latDiff * 0.1;
        const lngPadding = lngDiff * 0.1;

        minLat -= latPadding;
        maxLat += latPadding;
        minLng -= lngPadding;
        maxLng += lngPadding;

        console.log(
          `Large cluster with ${clusterChargers.length} chargers, using larger padding`
        );
      } else {
        // Add a small padding (5%) to the bounding box for regular clusters
        const latPadding = latDiff * 0.05;
        const lngPadding = lngDiff * 0.05;

        minLat -= latPadding;
        maxLat += latPadding;
        minLng -= lngPadding;
        maxLng += lngPadding;
      }

      // Calculate target zoom level based on the geographical size
      // The magic number 14 controls how zoomed in we get - higher = more zoomed in
      let targetZoomLevel = Math.min(
        Math.max(14 - Math.log2(maxDiff * 100), 11),
        16
      );

      // CRITICAL: Ensure we ALWAYS zoom in by at least 1.5 levels from current zoom
      // This guarantees that clicking a cluster always provides meaningful zoom
      targetZoomLevel = Math.max(targetZoomLevel, currentZoom + 1.5);

      console.log(
        `Zooming to cluster with ${
          clusterChargers.length
        } chargers, size: ${maxDiff.toFixed(
          5
        )}, current zoom: ${currentZoom.toFixed(
          2
        )}, target zoom: ${targetZoomLevel.toFixed(2)}`
      );

      // Determine if bounding box is too small or too large
      const isBoxTooSmall = maxDiff < 0.01; // ~1km
      const isBoxTooLarge = maxDiff > 0.5; // ~50km

      if (isBoxTooSmall || targetZoomLevel - currentZoom < 1.8) {
        // Box is too small or zoom change is insufficient - force a direct zoom
        const newZoom = Math.min(Math.max(currentZoom + 2, 14), 16.5);
        console.log(
          `Small box or insufficient zoom change, forcing zoom to ${newZoom.toFixed(
            2
          )}`
        );

        cameraRef.current.setCamera({
          centerCoordinate: [cluster.lng, cluster.lat],
          zoomLevel: newZoom,
          animationDuration: 800,
          animationMode: "flyTo",
        });
      } else if (isBoxTooLarge) {
        // Box is very large - limit how far we zoom out
        console.log(`Box too large, limiting zoom level change`);
        cameraRef.current.setCamera({
          centerCoordinate: [cluster.lng, cluster.lat],
          zoomLevel: Math.min(Math.max(currentZoom + 1, 11), 13),
          animationDuration: 1000,
          animationMode: "flyTo",
        });
      } else {
        // Normal case - use fitBounds for natural camera movement
        console.log(`Using fitBounds for cluster visualization`);
        cameraRef.current.fitBounds(
          [minLng, minLat],
          [maxLng, maxLat],
          60, // Padding in pixels
          800 // Animation duration in ms
        );
      }
    }
  };

  // Use useMemo to memoize the markers
  const markers = useMemo(() => {
    // Add debug logging to see if any chargers without amenities are being included
    if (filters.amenities && filters.amenities.length > 0) {
      console.log(
        `Rendering ${
          clusteredChargers.length
        } clustered chargers with amenity filter(s): ${filters.amenities.join(
          ", "
        )}`
      );

      // Verify each charger has the requested amenities when filtered
      const chargersWithoutAmenities = clusteredChargers.filter(
        (item) =>
          !item.cluster &&
          (!item.nearbyPlaces || item.nearbyPlaces.length === 0)
      );

      if (chargersWithoutAmenities.length > 0) {
        console.warn(
          `Warning: ${chargersWithoutAmenities.length} chargers shown without required amenities`
        );
      }
    }

    return clusteredChargers.map((item, index) => {
      if (!item.lat || !item.lng) return null;

      // Render cluster or individual charger
      if (item.cluster) {
        return (
          <ClusterMarker
            key={`cluster-${item.lat}-${item.lng}-${index}`}
            cluster={item}
            onSelected={() => handleClusterSelect(item)}
            cameraRef={cameraRef}
            index={index}
          />
        );
      } else {
        return (
          <ChargerMarker
            key={`ev-${item.lat}-${item.lng}-${index}`}
            charger={item}
            onSelected={() => {
              onChargerSelect(item);
              // Focus camera on this charger with smoother animation
              if (cameraRef.current) {
                cameraRef.current.setCamera({
                  centerCoordinate: [item.lng, item.lat],
                  zoomLevel: 15,
                  animationDuration: 800,
                  animationMode: "flyTo",
                });
              }
            }}
            cameraRef={cameraRef}
            index={index}
          />
        );
      }
    });
  }, [clusteredChargers, onChargerSelect, currentZoom, filters.amenities]);

  return <>{markers}</>;
};

// Styles for cluster markers
const clusterStyles = StyleSheet.create({
  clusterContainer: {
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    // Add shadow for better visibility against map backgrounds
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    padding: 4,
  },
  small: {
    width: 44,
    height: 44,
  },
  medium: {
    width: 56,
    height: 56,
  },
  large: {
    width: 68,
    height: 68,
  },
  extraLarge: {
    width: 80,
    height: 80,
  },
  clusterText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
    // Add text shadow for better readability
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  normalText: {
    fontSize: 18,
  },
  smallerText: {
    fontSize: 16,
  },
  tapHint: {
    color: "white",
    fontSize: 10,
    opacity: 0.9,
    textAlign: "center",
    marginTop: 2,
  },
  lowDensity: {
    backgroundColor: "rgba(52, 152, 219, 0.9)", // Blue for low density
  },
  mediumDensity: {
    backgroundColor: "rgba(243, 156, 18, 0.9)", // Orange for medium density
  },
  highDensity: {
    backgroundColor: "rgba(231, 76, 60, 0.9)", // Red for high density
  },
  veryHighDensity: {
    backgroundColor: "rgba(142, 68, 173, 0.9)", // Purple for very high density
  },
});

export default EVChargerDetails;
