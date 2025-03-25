import React from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { styles } from "../../styles/styles";
import MapboxGL from "@rnmapbox/maps";

interface MapControlsProps {
  cameraRef: React.RefObject<MapboxGL.Camera>;
  userLocation: [number, number] | null;
  onSettingsPress: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  cameraRef,
  userLocation,
  onSettingsPress,
}) => {
  const resetCameraToUserLocation = () => {
    if (!userLocation || !cameraRef.current) {
      return;
    }

    // Convert from [lat, lng] to [lng, lat] for MapboxGL
    const mapboxCoords: [number, number] = [userLocation[1], userLocation[0]];

    cameraRef.current.setCamera({
      centerCoordinate: mapboxCoords,
      zoomLevel: 14,
      animationDuration: 500,
    });
  };

  const resetCameraToNorth = () => {
    if (!cameraRef.current) return;
    cameraRef.current.setCamera({
      heading: 0,
      animationDuration: 500,
    });
  };

  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetCameraToUserLocation}
      >
        <Image
          source={require("../../assets/marker.png")}
          style={{ width: 28, height: 28 }}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={resetCameraToNorth}>
        <Image
          source={require("../../assets/compass-north.png")}
          style={{ width: 28, height: 28 }}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={onSettingsPress}>
        <Image
          source={require("../../assets/car-charger-bolt.png")}
          style={{ width: 28, height: 28 }}
        />
      </TouchableOpacity>
    </View>
  );
};
