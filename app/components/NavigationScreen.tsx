import React, { useState, useEffect } from "react";
import { SafeAreaView, StyleSheet, Alert, View, Text } from "react-native";
import { MapboxNavigationView } from "@youssefhenna/expo-mapbox-navigation";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/NavigationTypes";
import { fetchEVChargersAlongRoute } from "../api/googlePlaces";

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
  const { coordinates } = route.params;
  const [evChargers, setEvChargers] = useState<any[]>([]);

  useEffect(() => {
    findEVChargers();
  }, []);

  const findEVChargers = async () => {
    try {
      const results = await fetchEVChargersAlongRoute(coordinates);
      setEvChargers(results);
    } catch (error) {
      Alert.alert("Error", "Could not fetch EV chargers.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapboxNavigationView
        style={styles.map}
        coordinates={coordinates}
        routeProfile="driving"
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        useRouteMatchingApi={false}
        mute={false}
      />

      {evChargers.map((charger, index) => (
        <Mapbox.PointAnnotation
          key={`ev-${index}`}
          id={`ev-${index}`}
          coordinate={[
            charger.geometry.location.lng,
            charger.geometry.location.lat,
          ]}
        >
          <View style={styles.evMarker}>
            <Text>⚡</Text>
          </View>
        </Mapbox.PointAnnotation>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  evMarker: { backgroundColor: "green", padding: 5, borderRadius: 10 },
});
