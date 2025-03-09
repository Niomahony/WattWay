import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Text, Button, TextInput } from "react-native-paper";
import { Slider } from "@rneui/themed";
import { Dropdown } from "react-native-element-dropdown";
import debounce from "lodash/debounce"; // Import debounce

interface CarSettingsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onRangeChange: (range: number) => void;
  filters: {
    chargerType: string | null;
    chargingSpeed: string | null;
    minRating: number | null;
    brand: string | null;
  };
  setFilters: (filters: {
    chargerType: string | null;
    chargingSpeed: string | null;
    minRating: number | null;
    brand: string | null;
  }) => void;
}

const CarSettingsModal: React.FC<CarSettingsModalProps> = ({
  visible,
  onDismiss,
  onRangeChange,
  filters,
  setFilters,
}) => {
  const [km, setKm] = useState("");

  // Debounced function to limit API calls
  const debouncedOnRangeChange = useCallback(
    debounce((value) => {
      onRangeChange(value);
    }, 500), // Adjust delay (500ms = half a second)
    []
  );

  const handleSliderChange = (value: number) => {
    setKm(value.toString());
    debouncedOnRangeChange(value); // Use debounced function
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Set your available range</Text>

        {/* Range Input */}
        <TextInput
          style={styles.input}
          value={km}
          onChangeText={(text) => setKm(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          mode="outlined"
          right={<TextInput.Affix text=" km" />}
        />
        <Slider
          value={parseFloat(km) || 0}
          onValueChange={handleSliderChange}
          minimumValue={0}
          maximumValue={1000}
          step={10}
          trackStyle={styles.track}
          thumbStyle={styles.thumb}
          minimumTrackTintColor="#6200EE"
          maximumTrackTintColor="#C0C0C0"
        />

        {/* Charger Type Dropdown */}
        <Dropdown
          data={[
            { label: "Fast Charger", value: "Fast Charger" },
            { label: "Standard Charger", value: "Standard Charger" },
          ]}
          placeholder="Select Charger Type"
          value={filters.chargerType}
          labelField="label"
          valueField="value"
          onChange={(item) =>
            setFilters({ ...filters, chargerType: item.value })
          }
          style={styles.dropdown}
        />

        {/* Charging Speed Dropdown */}
        <Dropdown
          data={[
            { label: "Slow (2.3 - 6 kW)", value: "slow" },
            { label: "Fast (7 - 22 kW)", value: "fast" },
            { label: "Rapid (50 - 100 kW)", value: "rapid" },
            { label: "Ultra-Rapid (100+ kW)", value: "ultra-rapid" },
          ]}
          placeholder="Charging Speed"
          value={filters.chargingSpeed}
          labelField="label"
          valueField="value"
          onChange={(item) =>
            setFilters({ ...filters, chargingSpeed: item.value })
          }
          style={styles.dropdown}
        />

        {/* Minimum Rating Dropdown */}
        <Dropdown
          data={[
            { label: "1+", value: 1 },
            { label: "2+", value: 2 },
            { label: "3+", value: 3 },
            { label: "4+", value: 4 },
          ]}
          placeholder="Min Rating"
          value={filters.minRating}
          labelField="label"
          valueField="value"
          onChange={(item) => setFilters({ ...filters, minRating: item.value })}
          style={styles.dropdown}
        />

        {/* Brand Dropdown */}
        <Dropdown
          data={[
            { label: "Tesla", value: "Tesla" },
            { label: "ChargePoint", value: "ChargePoint" },
            { label: "EVgo", value: "EVgo" },
          ]}
          placeholder="Brand"
          value={filters.brand}
          labelField="label"
          valueField="value"
          onChange={(item) => setFilters({ ...filters, brand: item.value })}
          style={styles.dropdown}
        />

        <Button mode="contained" onPress={onDismiss} style={styles.closeButton}>
          Close
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "rgb(66, 245, 105)",
  },
  input: {
    backgroundColor: "transparent",
    marginBottom: 10,
    color: "black",
  },
  dropdown: {
    marginBottom: 10,
    backgroundColor: "white",
    borderRadius: 5,
    padding: 10,
  },
  track: {
    height: 5,
    borderRadius: 5,
    color: "rgb(227, 225, 254)",
  },
  thumb: {
    height: 20,
    width: 20,
    backgroundColor: "#6200EE",
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: "rgb(227, 225, 254)",
  },
});

export default CarSettingsModal;
