import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Button, View } from "react-native";
import { MapboxNavigationView } from "@youssefhenna/expo-mapbox-navigation";
import Mapbox from "@rnmapbox/maps";
import Constants from "expo-constants";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/NavigationTypes";

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
  const [navigationStarted, setNavigationStarted] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <MapboxNavigationView
        style={styles.map}
        coordinates={coordinates}
        routeProfile="driving"
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        useRouteMatchingApi={false}
        mute={false}
        onCancelNavigation={() => setNavigationStarted(false)}
        onFinalDestinationArrival={() => setNavigationStarted(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
  },
});
