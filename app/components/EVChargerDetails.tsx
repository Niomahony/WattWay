import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";

interface EVChargerDetailsProps {
  chargers: any[];
  onChargerSelect: (charger: any) => void;
  selectedCharger: any | null;
  onNavigate: (charger: any) => void;
}

const EVChargerDetails = ({
  chargers,
  onChargerSelect,
  selectedCharger,
  onNavigate,
}: EVChargerDetailsProps) => {
  return (
    <>
      {chargers.map((charger) => (
        <MapboxGL.PointAnnotation
          key={charger.place_id}
          id={`ev-${charger.place_id}`}
          coordinate={[charger.lng, charger.lat]}
          onSelected={() => onChargerSelect(charger)}
        >
          <View style={styles.evMarker}>
            <Text style={styles.evMarkerText}>⚡</Text>
          </View>
        </MapboxGL.PointAnnotation>
      ))}

      {selectedCharger && (
        <View style={styles.popupContainer}>
          <Text>Name: {selectedCharger.name}</Text>
          <Text>
            Availability: {selectedCharger.open_now ? "Open" : "Closed"}
          </Text>
          <Text>Type: {selectedCharger.type}</Text>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => onNavigate(selectedCharger)}
          >
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  evMarker: {
    backgroundColor: "green",
    padding: 10,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  evMarkerText: {
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
  },
  popupContainer: {
    position: "absolute",
    bottom: 50,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    width: "90%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  navigateButton: {
    backgroundColor: "blue",
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  navigateButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default EVChargerDetails;
