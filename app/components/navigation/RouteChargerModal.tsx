import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

interface ChargerData {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  operator?: string;
  distance?: number | string;
  categories?: string[];
}

interface RouteChargerModalProps {
  visible: boolean;
  onClose: () => void;
  chargers: ChargerData[];
  loading: boolean;
  loadingAmenities: Record<string, boolean>;
  chargerAmenities: Record<string, any[]>;
  isChargerInRoute: (charger: ChargerData) => boolean;
  onChargerSelect: (charger: ChargerData, action: "add" | "remove") => void;
  onAmenityPress: (amenity: any) => void;
}

// Helper function to format type names for display
const formatTypeForDisplay = (type: string): string => {
  if (!type) return "";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function RouteChargerModal({
  visible,
  onClose,
  chargers,
  loading,
  loadingAmenities,
  chargerAmenities,
  isChargerInRoute,
  onChargerSelect,
  onAmenityPress,
}: RouteChargerModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Route Chargers</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : chargers.length > 0 ? (
            <View style={styles.chargersContainer}>
              <ScrollView
                style={styles.chargersList}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.chargersListContent}
                scrollEventThrottle={16}
                bounces={true}
                overScrollMode="always"
              >
                {chargers.map((charger, index) => {
                  const chargerId = `${charger.lat},${charger.lng}`;
                  const hasLoadedAmenities =
                    chargerAmenities[chargerId] !== undefined;
                  const isSelected = isChargerInRoute(charger);

                  return (
                    <View
                      key={index}
                      style={[
                        styles.chargerItem,
                        isSelected && styles.selectedChargerItem,
                      ]}
                    >
                      <View style={styles.chargerItemHeader}>
                        <Text style={styles.chargerItemName}>
                          {charger.name || `Charging Station #${index + 1}`}
                        </Text>
                        <View style={styles.chargerActionButtons}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.addButton]}
                            onPress={() => onChargerSelect(charger, "add")}
                            disabled={isSelected}
                          >
                            <Text
                              style={[
                                styles.actionButtonText,
                                isSelected && styles.disabledButtonText,
                              ]}
                            >
                              +
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.removeButton]}
                            onPress={() => onChargerSelect(charger, "remove")}
                            disabled={!isSelected}
                          >
                            <Text
                              style={[
                                styles.actionButtonText,
                                !isSelected && styles.disabledButtonText,
                              ]}
                            >
                              -
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={styles.chargerItemAddress}>
                        {charger.address ||
                          `Location: ${charger.lat.toFixed(
                            5
                          )}, ${charger.lng.toFixed(5)}`}
                      </Text>
                      {charger.operator && charger.operator !== "Unknown" && (
                        <Text style={styles.chargerItemOperator}>
                          Operator: {charger.operator}
                        </Text>
                      )}
                      {typeof charger.distance === "number" && (
                        <Text style={styles.chargerItemDistance}>
                          Distance: {Math.round(charger.distance / 1000)} km
                        </Text>
                      )}
                      {typeof charger.distance === "string" && (
                        <Text style={styles.chargerItemDistance}>
                          Distance: {charger.distance}
                        </Text>
                      )}
                      {charger.categories && charger.categories.length > 0 && (
                        <Text style={styles.chargerItemCategories}>
                          {charger.categories.slice(0, 2).join(", ")}
                        </Text>
                      )}

                      {/* Display nearby amenities */}
                      <View style={styles.chargerAmenitiesContainer}>
                        <Text style={styles.chargerAmenitiesTitle}>
                          Nearby Amenities:
                        </Text>
                        {loadingAmenities[chargerId] ? (
                          <ActivityIndicator size="small" color="#007AFF" />
                        ) : hasLoadedAmenities &&
                          chargerAmenities[chargerId].length > 0 ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            style={styles.chargerAmenitiesScroll}
                            contentContainerStyle={
                              styles.amenitiesScrollContent
                            }
                          >
                            {chargerAmenities[chargerId].map((amenity, idx) => {
                              // Handle both property naming styles for compatibility
                              const matchingTypes =
                                amenity.matchingAmenityTypes ||
                                amenity.matchingTypes ||
                                [];
                              const hasMatchingTypes = matchingTypes.length > 0;

                              return (
                                <TouchableOpacity
                                  key={idx}
                                  style={styles.amenityBox}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    onAmenityPress(amenity);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={styles.amenityText}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    {amenity.name}
                                  </Text>
                                  <View style={styles.amenityTypeContainer}>
                                    {hasMatchingTypes ? (
                                      Array.from(
                                        new Set(
                                          matchingTypes.filter(
                                            (type: string) => type
                                          )
                                        ) as Set<string>
                                      )
                                        .slice(0, 1)
                                        .map((type, typeIdx) => (
                                          <View
                                            key={typeIdx}
                                            style={styles.amenityTypeTag}
                                          >
                                            <Text
                                              style={styles.amenityTypeText}
                                            >
                                              {formatTypeForDisplay(type)}
                                            </Text>
                                          </View>
                                        ))
                                    ) : (
                                      <View style={styles.amenityTypeTag}>
                                        <Text style={styles.amenityTypeText}>
                                          Place
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        ) : hasLoadedAmenities ? (
                          <Text style={styles.noAmenities}>
                            No amenities found nearby
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <Text style={styles.noAmenities}>
              No chargers found along the route
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
  },
  chargersContainer: {
    flex: 1,
  },
  chargersList: {
    flex: 1,
  },
  chargersListContent: {
    paddingBottom: 20,
  },
  chargerItem: {
    backgroundColor: "#2C2C2C",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedChargerItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    backgroundColor: "#1E1E1E", // Slightly darker than normal items
  },
  chargerItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chargerItemName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  chargerItemAddress: {
    color: "#CCCCCC",
    fontSize: 14,
  },
  chargerItemOperator: {
    color: "#CCCCCC",
    fontSize: 14,
  },
  chargerItemDistance: {
    color: "#CCCCCC",
    fontSize: 14,
  },
  chargerItemCategories: {
    color: "#AAAAAA",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 2,
  },
  chargerActionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: "#4CAF50", // Green
  },
  removeButton: {
    backgroundColor: "#F44336", // Red
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 22,
  },
  disabledButtonText: {
    opacity: 0.5,
  },
  chargerAmenitiesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  chargerAmenitiesTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 10,
  },
  chargerAmenitiesScroll: {
    maxHeight: 100,
  },
  amenitiesScrollContent: {
    paddingBottom: 6,
  },
  amenityBox: {
    backgroundColor: "#3A3A3A",
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
    width: 140,
    height: 75,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
    justifyContent: "space-between",
  },
  amenityText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
  },
  amenityTypeContainer: {
    flexDirection: "row",
    marginTop: "auto",
  },
  amenityTypeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 4,
  },
  amenityTypeText: {
    color: "#CCCCCC",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noAmenities: {
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
});
