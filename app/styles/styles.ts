import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  emojiMarker: {
    justifyContent: "center",
    alignItems: "center",
    fontSize: 32,
  },

  emojiText: {
    fontSize: 32,
    textAlign: "center",
  },

  container: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  largePinContainer: {
    justifyContent: "center",
    alignItems: "center",
    fontSize: 32,
    backgroundColor: "transparent",
  },

  searchBar: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    padding: 10,
    backgroundColor: "white",
    borderRadius: 10,
    zIndex: 2,
  },

  suggestionsList: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: "white",
    zIndex: 2,
  },

  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },

  infoBox: {
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "white",
  },

  placeImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },

  defaultPin: {
    justifyContent: "center",
    alignItems: "center",
    fontSize: 24,
  },

  pinText: {
    fontSize: 24,
    textAlign: "center",
  },

  resetButton: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "white",
    borderRadius: 50,
    padding: 10,
    elevation: 5,
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  resetButtonText: {
    fontSize: 24,
  },

  actionButton: {
    backgroundColor: "#1E90FF",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    margin: 5,
    position: "relative",
    zIndex: 1,
  },

  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
