import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { googleTypes } from "../../helpers/amenityCategories";

const amenityOrder = [
  "restaurant",
  "cafe",
  "hotel",
  "supermarket",
  "convenience_store",
  "shopping_mall",
  "gym",
  "hospital",
  "gas_station",
  "pharmacy",
  "bank",
  "atm",
  "bar",
  "museum",
  "library",
  "movie_theater",
  "post_office",
  "school",
  "university",
];

const irishTerms: { [key: string]: string } = {
  shopping_mall: "Shopping Centre",
  movie_theater: "Cinema",
  gas_station: "Petrol Station",
  pharmacy: "Chemist",
  supermarket: "Supermarket",
  convenience_store: "Local Shop",
  restaurant: "Restaurant",
  cafe: "Café",
  hotel: "Hotel",
  gym: "Gym",
  hospital: "Hospital",
  bank: "Bank",
  atm: "ATM",
  bar: "Pub",
  museum: "Museum",
  library: "Library",
  post_office: "Post Office",
  school: "School",
  university: "University",
};

const formatAmenityName = (name: string): string => {
  if (irishTerms[name]) {
    return irishTerms[name];
  }
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface AmenityFilterProps {
  selectedAmenities: string[];
  toggleAmenity: (amenity: string) => void;
  clearAllAmenities?: () => void;
}

const AmenityFilter: React.FC<AmenityFilterProps> = ({
  selectedAmenities,
  toggleAmenity,
  clearAllAmenities = () => {
    // Default implementation if not provided
    selectedAmenities.forEach((amenity) => toggleAmenity(amenity));
  },
}) => {
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [expandedModalVisible, setExpandedModalVisible] = useState(false);

  const sortedAmenities = Object.keys(googleTypes)
    .filter((amenity) => amenity !== "parking")
    .sort((a, b) => {
      const indexA = amenityOrder.indexOf(a);
      const indexB = amenityOrder.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

  // Split amenities into visible and hidden
  const visibleAmenities = sortedAmenities.slice(0, 5);
  const hiddenAmenities = sortedAmenities.slice(5);

  // Check if any hidden amenities are selected
  const hasSelectedHiddenAmenities = selectedAmenities.some((amenity) =>
    hiddenAmenities.includes(amenity)
  );

  // Display the clear all button only when amenities are selected
  const showClearAll = selectedAmenities.length > 0;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Chip at the beginning */}
        <TouchableOpacity
          style={styles.infoChip}
          onPress={() => setInfoModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle" size={22} color="#1A73E8" />
        </TouchableOpacity>

        {/* Clear All chip - shown only when filters are active */}
        {showClearAll && (
          <TouchableOpacity
            style={styles.clearChip}
            onPress={clearAllAmenities}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={16} color="#5F6368" />
            <Text style={styles.clearChipText}>Clear all</Text>
          </TouchableOpacity>
        )}

        {/* First 5 amenity chips */}
        {visibleAmenities.map((amenity: string) => {
          const label = formatAmenityName(amenity);
          const isSelected = selectedAmenities.includes(amenity);

          return (
            <TouchableOpacity
              key={amenity}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleAmenity(amenity)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* More chip to show additional amenities */}
        {hiddenAmenities.length > 0 && (
          <TouchableOpacity
            style={[
              styles.chip,
              styles.moreChip,
              hasSelectedHiddenAmenities && styles.moreChipSelected,
            ]}
            onPress={() => setExpandedModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                styles.moreChipText,
                hasSelectedHiddenAmenities && styles.moreChipTextSelected,
              ]}
            >
              More
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={hasSelectedHiddenAmenities ? "#FFFFFF" : "#1A73E8"}
              style={styles.moreIcon}
            />
            {hasSelectedHiddenAmenities && (
              <View style={styles.selectionIndicator} />
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={infoModalVisible}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setInfoModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nearby Amenities</Text>
            <Text style={styles.modalText}>
              Select amenities to filter charging stations that have these
              facilities nearby. This helps you find charging spots close to
              places where you can spend your time while charging your vehicle.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Expanded Amenities Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={expandedModalVisible}
        onRequestClose={() => setExpandedModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.expandedModalContainer}
          activeOpacity={1}
          onPress={() => setExpandedModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.expandedModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.expandedModalHeader}>
              <Text style={styles.expandedModalTitle}>All Amenities</Text>
              {selectedAmenities.length > 0 && (
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={() => {
                    clearAllAmenities();
                    // Keep the modal open to show the cleared state
                  }}
                >
                  <Text style={styles.clearAllButtonText}>Clear all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setExpandedModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#5F6368" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={sortedAmenities}
              numColumns={2}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const label = formatAmenityName(item);
                const isSelected = selectedAmenities.includes(item);

                return (
                  <TouchableOpacity
                    style={[
                      styles.expandedChip,
                      isSelected && styles.chipSelected,
                    ]}
                    onPress={() => toggleAmenity(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.expandedChipList}
            />

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setExpandedModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoChip: {
    backgroundColor: "white",
    borderRadius: 24,
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  infoChipText: {
    fontSize: 14,
    color: "#1A73E8",
    fontWeight: "500",
    marginLeft: 6,
  },
  chip: {
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    marginRight: 10,
    minHeight: 44,
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  moreChip: {
    backgroundColor: "#E8F0FE",
    borderColor: "#1A73E8",
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    minWidth: 80,
  },
  moreChipSelected: {
    backgroundColor: "#1A73E8",
    borderColor: "#1A73E8",
  },
  chipSelected: {
    backgroundColor: "#1A73E8",
    borderColor: "#1A73E8",
  },
  chipText: {
    fontSize: 14,
    color: "#202124",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "80%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#202124",
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5F6368",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#1A73E8",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-end",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 14,
  },
  expandedModalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  expandedModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },
  expandedModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EAED",
    marginBottom: 16,
  },
  expandedModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#202124",
  },
  closeButton: {
    padding: 8,
  },
  expandedChipList: {
    paddingBottom: 16,
  },
  expandedChip: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    margin: 6,
    minHeight: 44,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  doneButton: {
    backgroundColor: "#1A73E8",
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 16,
  },
  doneButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  clearChip: {
    backgroundColor: "#F1F3F4",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E8EAED",
    marginRight: 10,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  clearChipText: {
    fontSize: 14,
    color: "#5F6368",
    fontWeight: "500",
    marginLeft: 6,
  },
  clearAllButton: {
    marginRight: "auto",
    marginLeft: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearAllButtonText: {
    fontSize: 14,
    color: "#1A73E8",
    fontWeight: "500",
  },
  moreChipText: {
    color: "#1A73E8",
    fontWeight: "700",
    fontSize: 15,
  },
  moreChipTextSelected: {
    color: "#FFFFFF",
  },
  moreIcon: {
    marginLeft: 4,
  },
  selectionIndicator: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#DB4437",
    borderWidth: 2,
    borderColor: "white",
  },
});

// Export a memoized version with custom comparison
export default React.memo(AmenityFilter, (prevProps, nextProps) => {
  // Only re-render if the selected amenities have changed
  return (
    JSON.stringify(prevProps.selectedAmenities) ===
    JSON.stringify(nextProps.selectedAmenities)
  );
});
