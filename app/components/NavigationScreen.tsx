import React, { useState, useEffect } from "react";
import { SafeAreaView, StyleSheet, Alert, View, Text } from "react-native";
import { MapboxNavigationView } from "@youssefhenna/expo-mapbox-navigation";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/NavigationTypes";
import { fetchEVChargersAlongRoute } from "../api/mapApi";

type NavigationScreenRouteProp = RouteProp<
  RootStackParamList,
  "NavigationScreen"
>;

interface NavigationScreenProps {
  route: NavigationScreenRouteProp;
}

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;
Mapbox.setAccessToken(mapboxAccessToken);

export default function NavigationScreen({ route }: NavigationScreenProps) {
  const { coordinates, carRange } = route.params;
  const [evChargers, setEvChargers] = useState<any[]>([]);
  const [chargingStops, setChargingStops] = useState<any[]>([]);
  const [routeWithStops, setRouteWithStops] = useState<any[]>([]);

  useEffect(() => {
    planChargingStops();
  }, []);

  const planChargingStops = async () => {
    try {
      console.log("🔄 Fetching route details from Mapbox...");
      const route = await getRouteDetails(coordinates);

      if (!route) {
        Alert.alert("Error", "Could not fetch route details.");
        return;
      }

      const routeDistance = route.distance / 1000; // Convert meters to km
      console.log(`📏 Route Distance: ${routeDistance} km`);

      const routeCoordinates = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        })
      );

      let stops = [];
      let distanceCovered = 0;

      while (distanceCovered < routeDistance) {
        let nextStopDistance = distanceCovered + carRange * 0.8; // 80% of range
        if (nextStopDistance >= routeDistance) break;

        const closestPointIndex = Math.floor(
          (nextStopDistance / routeDistance) * routeCoordinates.length
        );
        const waypoint = routeCoordinates[closestPointIndex];

        console.log(
          `🚗 Checking for chargers near: ${waypoint.latitude}, ${waypoint.longitude}`
        );

        const chargers = await fetchEVChargersAlongRoute([waypoint]);
        console.log(`🔌 Found ${chargers.length} chargers at this point.`);

        if (chargers.length > 0) {
          stops.push(chargers[0]); // Pick the first available charger
        } else {
          console.warn("⚠️ No chargers found near this waypoint.");
        }

        distanceCovered = nextStopDistance;
      }

      if (stops.length === 0) {
        Alert.alert(
          "⚠️ No Charging Stops Found",
          "Try adjusting your route or filters."
        );
      }

      setChargingStops(stops);

      // Append chargers to the navigation route
      const newRoute = [
        {
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
        }, // Start Point
        ...stops.map((stop) => ({ latitude: stop.lat, longitude: stop.lng })), // Chargers
        {
          latitude: coordinates[1].latitude,
          longitude: coordinates[1].longitude,
        }, // End Point
      ];

      setRouteWithStops(newRoute);
      console.log("🛑 Updated route with charging stops:", newRoute);
    } catch (error) {
      console.error("❌ Error calculating charging stops:", error);
      Alert.alert("Error", "Could not calculate charging stops.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapboxNavigationView
        style={styles.map}
        coordinates={routeWithStops.length > 0 ? routeWithStops : coordinates}
        routeProfile="driving"
        mapStyle="mapbox://styles/mapbox/outdoors-v11"
        useRouteMatchingApi={false}
        mute={false}
      />

      {chargingStops.map((stop, index) => (
        <Mapbox.PointAnnotation
          key={`charge-${index}`}
          id={`charge-${index}`}
          coordinate={[stop.lng, stop.lat]}
        >
          <View style={styles.evMarker}>
            <Text style={styles.evMarkerText}>⚡</Text>
          </View>
        </Mapbox.PointAnnotation>
      ))}
    </SafeAreaView>
  );
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface RouteDetails {
  distance: number;
  geometry: {
    coordinates: [number, number][];
  };
}

const getRouteDetails = async (
  coordinates: Coordinate[]
): Promise<RouteDetails | null> => {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates
      .map((coord) => `${coord.longitude},${coord.latitude}`)
      .join(";")}?access_token=${mapboxAccessToken}&geometries=geojson`;

    console.log("🗺️ Fetching route from Mapbox:", url);

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      console.error("❌ No valid routes returned from Mapbox.");
      return null;
    }

    console.log("✅ Route fetched successfully.");
    return data.routes[0];
  } catch (error) {
    console.error("❌ Error fetching route details:", error);
    return null;
  }
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  evMarker: {
    backgroundColor: "green",
    padding: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  evMarkerText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
