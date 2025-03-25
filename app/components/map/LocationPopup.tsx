import React from "react";
import { Animated, TouchableOpacity, Text, View } from "react-native";
import { styles } from "../../styles/styles";
import { PlaceInfoBox } from "../common/PlaceInfoBox";

interface LocationPopupProps {
  popupAnimation: Animated.Value;
  searchedLocation: {
    name: string;
    coordinates: [number, number];
  } | null;
  selectedCharger: any | null;
  userLocation: [number, number] | null;
  selectedAmenities: string[];
  onDismiss: () => void;
  onNavigate: () => void;
}

export const LocationPopup: React.FC<LocationPopupProps> = ({
  popupAnimation,
  searchedLocation,
  selectedCharger,
  userLocation,
  selectedAmenities,
  onDismiss,
  onNavigate,
}) => {
  return (
    <Animated.View
      style={[
        styles.popupContainer,
        {
          opacity: popupAnimation,
          transform: [
            {
              translateY: popupAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
            {
              scale: popupAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      {searchedLocation ? (
        <PlaceInfoBox
          name={searchedLocation?.name || "Unknown Location"}
          photoUrl={null}
          origin={userLocation as [number, number]}
          destination={[
            searchedLocation.coordinates[1],
            searchedLocation.coordinates[0],
          ]}
          selectedAmenities={selectedAmenities}
          nearbyPlaces={[]}
        />
      ) : selectedCharger ? (
        <PlaceInfoBox
          name={selectedCharger?.name || "Unknown Charger"}
          photoUrl={selectedCharger?.photoUrl || null}
          origin={userLocation as [number, number]}
          destination={[selectedCharger.lat, selectedCharger.lng]}
          selectedAmenities={selectedAmenities}
          nearbyPlaces={selectedCharger.nearbyPlaces || []}
        />
      ) : (
        <Text style={{ textAlign: "center", padding: 10, color: "#888" }}>
          No location selected
        </Text>
      )}

      {(selectedCharger || searchedLocation) && (
        <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
          <Text style={styles.navigateButtonText}>Navigate</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};
