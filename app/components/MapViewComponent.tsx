import React from "react";
import MapboxGL from "@rnmapbox/maps";
import { View, Text } from "react-native";
import Constants from "expo-constants";
import { styles } from "../styles/styles";

interface MapViewProps {
  centerCoordinate: [number, number];
  userLocation: [number, number] | null;
  pinCoordinate: [number, number] | null;
  onMapPress: (e: any) => void;
}

MapboxGL.setAccessToken(Constants.expoConfig?.extra?.mapboxAccessToken);

export const CustomMapView = ({
  centerCoordinate,
  userLocation,
  pinCoordinate,
  onMapPress,
}: MapViewProps) => {
  return (
    <MapboxGL.MapView style={styles.map} onPress={onMapPress}>
      <MapboxGL.Camera zoomLevel={12} centerCoordinate={centerCoordinate} />

      {userLocation && (
        <MapboxGL.ShapeSource
          id="userLocationSource"
          shape={{
            type: "Feature",
            geometry: { type: "Point", coordinates: userLocation },
            properties: {},
          }}
        >
          <MapboxGL.CircleLayer
            id="userLocationCircle"
            style={{ circleRadius: 10, circleColor: "blue" }}
          />
        </MapboxGL.ShapeSource>
      )}

      {pinCoordinate && (
        <MapboxGL.PointAnnotation
          id="selectedLocation"
          coordinate={pinCoordinate}
        >
          <View style={styles.largePinContainer}>
            <Text>📍</Text>
          </View>
        </MapboxGL.PointAnnotation>
      )}
    </MapboxGL.MapView>
  );
};
