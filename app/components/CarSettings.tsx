import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Portal, Text, Button, TextInput } from "react-native-paper";
import { Slider } from "@rneui/themed";
import debounce from "lodash/debounce"; // Import debounce

interface RangeModalProps {
  visible: boolean;
  onDismiss: () => void;
  setRange: (range: { availableRange: number; maxRange: number }) => void;
  initialAvailableRange?: number;
  initialMaxRange?: number;
}

const RangeModal: React.FC<RangeModalProps> = ({
  visible,
  onDismiss,
  setRange,
  initialAvailableRange = 100,
  initialMaxRange = 500,
}) => {
  const [availableRange, setAvailableRange] = useState(
    initialAvailableRange.toString()
  );
  const [maxRange, setMaxRange] = useState(initialMaxRange.toString());

  // Debounced function to limit updates
  const debouncedSetRange = useCallback(
    debounce((available, max) => {
      setRange({ availableRange: available, maxRange: max });
    }, 500),
    []
  );

  const handleAvailableRangeChange = (value: number) => {
    setAvailableRange(value.toString());
    debouncedSetRange(value, parseInt(maxRange) || 0);
  };

  const handleMaxRangeChange = (value: number) => {
    setMaxRange(value.toString());
    debouncedSetRange(parseInt(availableRange) || 0, value);
  };

  const handleSave = () => {
    const available = parseInt(availableRange) || 0;
    const max = parseInt(maxRange) || 0;

    if (available > max) {
      alert("Available range cannot be greater than the maximum range!");
      return;
    }

    setRange({ availableRange: available, maxRange: max });
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text style={styles.modalTitle}>Set Your Range</Text>

        <View style={styles.sliderContainer}>
          <View style={styles.labelContainer}>
            <Text style={styles.label}>Current Available Range</Text>
            <Text style={styles.valueDisplay}>{availableRange} km</Text>
          </View>
          <Slider
            value={parseFloat(availableRange) || 0}
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
            value={parseFloat(maxRange) || 0}
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

        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          labelStyle={styles.saveButtonLabel}
        >
          Save & Close
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
  saveButton: {
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
  saveButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default RangeModal;
