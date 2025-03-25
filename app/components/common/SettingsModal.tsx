import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Modal,
  Portal,
  Text,
  Button,
  SegmentedButtons,
  IconButton,
  Switch,
  Chip,
} from "react-native-paper";
import { Dropdown } from "react-native-element-dropdown";
import { Slider } from "@rneui/themed";
import debounce from "lodash/debounce";

// Import only what's needed from the existing components
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

interface SettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  // ChargerSettings props
  filters: {
    chargingSpeed: string | null;
    minRating: number | null;
    brand: string[];
    connectorType: string | null;
    amenities: string[];
    availableOnly: boolean;
  };
  setFilters: (filters: SettingsModalProps["filters"]) => void;
  // CarSettings props
  range: {
    availableRange: number;
    maxRange: number;
  };
  setRange: (range: { availableRange: number; maxRange: number }) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onDismiss,
  filters,
  setFilters,
  range,
  setRange,
}) => {
  const [activeTab, setActiveTab] = useState<string>("charger");

  // State for the range tab
  const [availableRange, setAvailableRange] = useState<number>(
    Number(range.availableRange) || 0
  );
  const [maxRange, setMaxRange] = useState<number>(Number(range.maxRange) || 0);

  // State for the charger settings tab
  const [displayRating, setDisplayRating] = useState<number>(
    Number(filters.minRating) || 0
  );
  const [tooltipInfo, setTooltipInfo] = useState<{
    title: string;
    message: string;
  } | null>(null);

  // Debounced functions
  const debouncedSetRange = useCallback(
    debounce((available, max) => {
      setRange({ availableRange: available, maxRange: max });
    }, 500),
    []
  );

  const debouncedSetRating = useCallback(
    debounce((value: number) => {
      setFilters({ ...filters, minRating: value });
    }, 500),
    []
  );

  // Event handlers for Range tab
  const handleAvailableRangeChange = (value: number) => {
    const safeValue = Number(value) || 0;
    setAvailableRange(safeValue);
    debouncedSetRange(safeValue, maxRange);
  };

  const handleMaxRangeChange = (value: number) => {
    const safeValue = Number(value) || 0;
    setMaxRange(safeValue);
    debouncedSetRange(availableRange, safeValue);
  };

  // Event handlers for Charger Settings tab
  const handleRatingChange = (value: number) => {
    const safeValue = Number(value) || 0;
    setDisplayRating(safeValue);
    debouncedSetRating(safeValue);
  };

  // Reset tab state when modal is opened
  React.useEffect(() => {
    if (visible) {
      setAvailableRange(Number(range.availableRange) || 0);
      setMaxRange(Number(range.maxRange) || 0);
      setDisplayRating(Number(filters.minRating) || 0);
    }
  }, [visible, range, filters]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>EV Settings</Text>

        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: "charger",
              label: "Charger Settings",
              style:
                activeTab === "charger"
                  ? styles.activeSegmentButton
                  : styles.segmentButton,
              labelStyle:
                activeTab === "charger"
                  ? styles.activeSegmentLabel
                  : styles.segmentLabel,
            },
            {
              value: "car",
              label: "Range Settings",
              style:
                activeTab === "car"
                  ? styles.activeSegmentButton
                  : styles.segmentButton,
              labelStyle:
                activeTab === "car"
                  ? styles.activeSegmentLabel
                  : styles.segmentLabel,
            },
          ]}
          style={styles.segmentedButtons}
        />

        <View style={styles.scrollIndicator}>
          <View style={styles.scrollIndicatorLine} />
        </View>

        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === "charger" ? (
            // Charger Settings Content
            <>
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
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.brandScrollView}
                  contentContainerStyle={styles.brandScrollContent}
                >
                  <View style={styles.brandChipsContainer}>
                    {brands.map((brand) => (
                      <Chip
                        key={brand}
                        selected={filters.brand.includes(brand)}
                        onPress={() => {
                          const newBrands = filters.brand.includes(brand)
                            ? filters.brand.filter((b) => b !== brand)
                            : [...filters.brand, brand];
                          setFilters({ ...filters, brand: newBrands });
                        }}
                        style={[
                          styles.brandChip,
                          filters.brand.includes(brand) &&
                            styles.brandChipSelected,
                        ]}
                        textStyle={[
                          styles.brandChipText,
                          filters.brand.includes(brand) &&
                            styles.brandChipTextSelected,
                        ]}
                        showSelectedCheck={false}
                      >
                        {brand}
                      </Chip>
                    ))}
                  </View>
                </ScrollView>
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
                  onChange={(item: { value: string }) =>
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
                    <Text style={styles.sectionTitle}>
                      Available Chargers Only
                    </Text>
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
                        [
                          {
                            text: "OK",
                            onPress: () => console.log("Alert closed"),
                          },
                        ]
                      );
                    }}
                    color="#4CD964" // iOS green color
                  />
                </View>
              </View>
            </>
          ) : (
            // Range Settings Content
            <>
              <View style={styles.sliderContainer}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Current Available Range</Text>
                  <Text style={styles.valueDisplay}>{availableRange} km</Text>
                </View>
                <Slider
                  value={availableRange}
                  onValueChange={handleAvailableRangeChange}
                  minimumValue={0}
                  maximumValue={1000}
                  step={10}
                  trackStyle={styles.track}
                  thumbStyle={styles.thumb}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#E5E5EA"
                  allowTouchTrack
                  thumbTintColor="#007AFF"
                />
              </View>

              <View style={styles.sliderContainer}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Maximum Range</Text>
                  <Text style={styles.valueDisplay}>{maxRange} km</Text>
                </View>
                <Slider
                  value={maxRange}
                  onValueChange={handleMaxRangeChange}
                  minimumValue={0}
                  maximumValue={1000}
                  step={10}
                  trackStyle={styles.track}
                  thumbStyle={styles.thumb}
                  minimumTrackTintColor="#007AFF"
                  maximumTrackTintColor="#E5E5EA"
                  allowTouchTrack
                  thumbTintColor="#007AFF"
                />
              </View>
            </>
          )}
        </ScrollView>

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
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1a1a1a",
    textAlign: "center",
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  segmentButton: {
    borderColor: "#007AFF",
    backgroundColor: "#F5F5F5",
  },
  activeSegmentButton: {
    borderColor: "#007AFF",
    backgroundColor: "#007AFF",
  },
  segmentLabel: {
    color: "#333333",
    fontWeight: "500",
    fontSize: 14,
  },
  activeSegmentLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  scrollIndicator: {
    alignItems: "center",
    marginBottom: 12,
  },
  scrollIndicatorLine: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E5EA",
    borderRadius: 2,
  },
  contentContainer: {
    flexGrow: 1,
    maxHeight: "60%",
  },
  scrollContent: {
    paddingBottom: 20,
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
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
  sliderContainer: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
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
  toggleButton: {
    borderRadius: 20,
    minWidth: 60,
    marginLeft: 8,
  },
  ratingRow: {},
  brandScrollView: {
    flexGrow: 1,
    marginHorizontal: -4, // Compensate for padding
  },
  brandScrollContent: {
    paddingHorizontal: 4,
  },
  brandChipsContainer: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingRight: 8,
  },
  brandChip: {
    marginRight: 8,
    backgroundColor: "#F5F5F5",
    borderColor: "#E5E5EA",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 120,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  brandChipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
    elevation: 2,
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  brandChipText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
    flex: 1,
    textAlignVertical: "center",
  },
  brandChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default SettingsModal;
