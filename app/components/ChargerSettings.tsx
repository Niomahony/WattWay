import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  Chip,
  IconButton,
  Switch,
} from "react-native-paper";
import { Dropdown } from "react-native-element-dropdown";
import { Slider } from "@rneui/themed";
import { googleTypes } from "../helpers/amenityCategories";
import debounce from "lodash/debounce";

interface CarSettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  filters: {
    chargingSpeed: string | null;
    minRating: number | null;
    brand: string | null;
    connectorType: string | null;
    amenities: string[];
    availableOnly: boolean;
  };
  setFilters: (filters: CarSettingsModalProps["filters"]) => void;
}

const brands = [
  "Blink Charging",
  "ESB",
  "EasyGo",
  "ChargePoint",
  "Tesla Supercharger",
  "EVBox",
  "Applegreen Electric",
];

const connectorTypes = [
  "IEC62196Type1",
  "IEC62196Type1CCS",
  "IEC62196Type2CCS",
  "Chademo",
  "Tesla",
];

const connectorTypeNames: { [key: string]: string } = {
  IEC62196Type1: "Type 1 (Standard AC)",
  IEC62196Type1CCS: "CCS Combo 1 (American DC)",
  IEC62196Type2CCS: "CCS Combo 2 (European DC)",
  Chademo: "CHAdeMO (Japanese DC)",
  Tesla: "Tesla Supercharger",
};

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
  // First check if we have an Irish term for this amenity
  if (irishTerms[name]) {
    return irishTerms[name];
  }

  // If no Irish term, fall back to the original formatting
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const CarSettingsModal: React.FC<CarSettingsModalProps> = ({
  visible,
  onDismiss,
  filters,
  setFilters,
}) => {
  const [displayRating, setDisplayRating] = useState(filters.minRating || 0);
  const [tooltipInfo, setTooltipInfo] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const toggleAmenity = (amenity: string) => {
    const updatedAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter((item) => item !== amenity)
      : [...filters.amenities, amenity];
    setFilters({ ...filters, amenities: updatedAmenities });
  };

  // Debounced function to limit updates
  const debouncedSetRating = useCallback(
    debounce((value: number) => {
      setFilters({ ...filters, minRating: value });
    }, 500),
    []
  );

  const handleRatingChange = (value: number) => {
    setDisplayRating(value);
    debouncedSetRating(value);
  };

  const sortedAmenities = Object.keys(googleTypes)
    .filter((amenity) => amenity !== "parking")
    .sort((a, b) => {
      const indexA = amenityOrder.indexOf(a);
      const indexB = amenityOrder.indexOf(b);
      // If both items are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only one item is in the order array, it should come first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // If neither item is in the order array, sort alphabetically
      return a.localeCompare(b);
    });

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Charger Settings</Text>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Brand</Text>
              <IconButton
                icon="information"
                size={16}
                style={styles.infoIcon}
                onPress={() =>
                  setTooltipInfo({
                    title: "Brand",
                    message:
                      "Filter chargers by specific charging network providers. This helps you find stations from your preferred charging networks.",
                  })
                }
              />
            </View>
          </View>
          <Dropdown
            data={brands.map((brand) => ({ label: brand, value: brand }))}
            placeholder="Select brand"
            value={filters.brand}
            labelField="label"
            valueField="value"
            onChange={(item) => setFilters({ ...filters, brand: item.value })}
            style={styles.dropdown}
            selectedTextStyle={styles.dropdownText}
            placeholderStyle={styles.dropdownPlaceholder}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Connector Type</Text>
              <IconButton
                icon="information"
                size={16}
                style={styles.infoIcon}
                onPress={() =>
                  setTooltipInfo({
                    title: "Connector Type",
                    message:
                      "Select the type of charging connector your vehicle uses. This ensures you only see stations compatible with your car.",
                  })
                }
              />
            </View>
          </View>
          <Dropdown
            data={connectorTypes.map((type) => ({
              label: connectorTypeNames[type],
              value: type,
            }))}
            placeholder="Select connector type"
            value={filters.connectorType}
            labelField="label"
            valueField="value"
            onChange={(item) =>
              setFilters({ ...filters, connectorType: item.value })
            }
            style={styles.dropdown}
            selectedTextStyle={styles.dropdownText}
            placeholderStyle={styles.dropdownPlaceholder}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
              <IconButton
                icon="information"
                size={16}
                style={styles.infoIcon}
                onPress={() =>
                  setTooltipInfo({
                    title: "Minimum Rating",
                    message:
                      "Filter chargers based on user ratings (0-4 stars). Higher ratings indicate better maintained and more reliable stations.",
                  })
                }
              />
            </View>
            <Text style={styles.valueDisplay}>{displayRating}+</Text>
          </View>
          <Slider
            value={displayRating}
            onValueChange={handleRatingChange}
            minimumValue={0}
            maximumValue={4}
            step={1}
            trackStyle={styles.track}
            thumbStyle={styles.thumb}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E5E5EA"
            allowTouchTrack
            thumbTintColor="#007AFF"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Available Chargers Only</Text>
              <IconButton
                icon="information"
                size={16}
                style={styles.infoIcon}
                onPress={() =>
                  setTooltipInfo({
                    title: "Available Chargers Only",
                    message:
                      "This feature requires a premium TomTom API subscription. When enabled, it would show only charging stations that currently have available chargers, helping you avoid stations that are fully occupied. Currently this setting has no effect.",
                  })
                }
              />
            </View>
            <Switch
              value={filters.availableOnly}
              onValueChange={() => {
                const newValue = !filters.availableOnly;
                setFilters({
                  ...filters,
                  availableOnly: newValue,
                });
                // Show alert when toggled
                Alert.alert(
                  "Premium Feature",
                  "This feature requires a premium TomTom API subscription and currently has no effect on search results.",
                  [{ text: "OK", onPress: () => console.log("Alert closed") }]
                );
              }}
              color="#4CD964" // iOS green color
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.sectionTitle}>Nearby Amenities</Text>
              <IconButton
                icon="information"
                size={16}
                style={styles.infoIcon}
                onPress={() =>
                  setTooltipInfo({
                    title: "Nearby Amenities",
                    message:
                      "Select amenities you'd like to find near charging stations. This helps you plan your charging stops around places where you can spend time while charging.",
                  })
                }
              />
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
          >
            <View style={styles.chipContainer}>
              {sortedAmenities.map((amenity: string) => (
                <Chip
                  key={amenity}
                  mode="outlined"
                  selected={filters.amenities.includes(amenity)}
                  onPress={() => toggleAmenity(amenity)}
                  style={[
                    styles.chip,
                    filters.amenities.includes(amenity) && styles.chipSelected,
                  ]}
                  textStyle={[
                    styles.chipText,
                    filters.amenities.includes(amenity) &&
                      styles.chipTextSelected,
                  ]}
                >
                  {formatAmenityName(amenity)}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>

        <Button
          mode="contained"
          onPress={onDismiss}
          style={styles.closeButton}
          labelStyle={styles.closeButtonLabel}
        >
          Close
        </Button>
      </Modal>

      <Portal>
        <Modal
          visible={!!tooltipInfo}
          onDismiss={() => setTooltipInfo(null)}
          contentContainerStyle={styles.tooltipModal}
        >
          <Text style={styles.tooltipTitle}>{tooltipInfo?.title}</Text>
          <Text style={styles.tooltipMessage}>{tooltipInfo?.message}</Text>
          <Button
            mode="contained"
            onPress={() => setTooltipInfo(null)}
            style={styles.tooltipButton}
          >
            Got it
          </Button>
        </Modal>
      </Portal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 28,
    color: "#1a1a1a",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  dropdown: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  dropdownText: {
    fontSize: 15,
    color: "#1a1a1a",
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: "#999",
  },
  chipScroll: {
    marginHorizontal: -4,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: "#E5E5EA",
  },
  chipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  chipText: {
    fontSize: 13,
    color: "#666",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  closeButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  valueDisplay: {
    fontSize: 24,
    fontWeight: "600",
    color: "#007AFF",
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5EA",
  },
  thumb: {
    height: 24,
    width: 24,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    margin: 0,
    padding: 0,
    marginLeft: 4,
  },
  tooltipModal: {
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  tooltipMessage: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    marginBottom: 20,
  },
  tooltipButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    borderRadius: 10,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  toggleChip: {
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    borderColor: "#E5E5EA",
    height: 32,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default CarSettingsModal;
