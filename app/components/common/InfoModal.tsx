import React, { useState } from "react";
import {
  Modal,
  Portal,
  Text,
  Button,
  useTheme,
  Surface,
  IconButton,
  List,
} from "react-native-paper";
import { ScrollView, StyleSheet, View } from "react-native";

interface InfoModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const InfoModal = ({ visible, onDismiss }: InfoModalProps) => {
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  const toggleSection = (index: number) => {
    setExpandedSections((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const sections = [
    {
      title: "Finding Chargers",
      content: [
        "Browse the map to locate EV charging stations shown as markers",
        "Clusters of chargers represent multiple chargers in one area",
        "Zoom in to see individual chargers in detail",
      ],
    },
    {
      title: "Search & Navigation",
      content: [
        "Use the search bar at the top to find locations",
        "Tap on any charger to see details about it",
        "Press the 'Navigate' button to start turn-by-turn directions",
      ],
    },
    {
      title: "Filters & Settings",
      content: [
        "Use the amenity filter bar to filter chargers by nearby amenities and to adjust your routes to find chargers with the selected amenities",
        "Tap the charger bolt icon to adjust your vehicle range and preferences",
        "Filter chargers by rating, brand, or connector type",
      ],
    },
    {
      title: "Map Controls",
      content: [
        "Use the marker button to center the map on your location",
        "The arrow pointing north will reset the map to point north",
      ],
    },
    {
      title: "Tips",
      content: [
        "Plan your route with chargers that have amenities you need",
        "Set your vehicle's range accurately for the best experience",
        "Check the charger details for real-time availability status (unfortunately this feature is not yet available as the free maps API does not support it and the premium version is only available to businesses)",
      ],
    },
  ];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent} elevation={4}>
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.modalTitle}>
              Welcome to WattWay
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onDismiss}
              style={styles.closeIcon}
            />
          </View>

          <ScrollView style={styles.scrollView}>
            {sections.map((section, index) => (
              <List.Accordion
                key={index}
                title={section.title}
                titleStyle={styles.accordionTitle}
                expanded={expandedSections.includes(index)}
                onPress={() => toggleSection(index)}
                style={styles.accordion}
                titleNumberOfLines={2}
                right={() => null}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={
                      expandedSections.includes(index)
                        ? "chevron-down"
                        : "chevron-right"
                    }
                    color="#007AFF"
                  />
                )}
              >
                {section.content.map((item, itemIndex) => (
                  <List.Item
                    key={itemIndex}
                    title={item}
                    titleStyle={styles.listItemTitle}
                    titleNumberOfLines={0}
                    descriptionStyle={styles.listItemDescription}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon="circle-small"
                        color="#007AFF"
                      />
                    )}
                    style={styles.listItem}
                    contentStyle={styles.listItemContent}
                  />
                ))}
              </List.Accordion>
            ))}
          </ScrollView>

          <Button
            mode="contained"
            onPress={onDismiss}
            style={styles.closeButton}
            labelStyle={styles.buttonLabel}
          >
            Got it!
          </Button>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingBottom: 15,
  },
  modalTitle: {
    flex: 1,
    textAlign: "center",
    marginRight: 40,
    color: "#007AFF",
    fontWeight: "600",
  },
  closeIcon: {
    margin: 0,
  },
  scrollView: {
    marginBottom: 20,
  },
  accordion: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingRight: 0,
    width: "100%",
  },
  accordionTitle: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "600",
    paddingRight: 0,
    flexWrap: "wrap",
  },
  listItem: {
    paddingRight: 0,
    marginRight: 0,
    width: "100%",
    paddingLeft: 0,
  },
  listItemContent: {
    paddingRight: 0,
    marginRight: 0,
    flex: 1,
  },
  listItemTitle: {
    color: "#333333",
    fontSize: 14,
    lineHeight: 20,
    paddingRight: 0,
    marginRight: 0,
    flex: 1,
  },
  listItemDescription: {
    paddingRight: 0,
    marginRight: 0,
    flex: 1,
  },
  closeButton: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default React.memo(InfoModal);
