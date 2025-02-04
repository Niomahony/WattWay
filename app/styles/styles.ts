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

  evMarker: {
    backgroundColor: "green",
    padding: 15,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    height: 60,
  },

  evMarkerText: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
  },

  chargerList: {
    position: "absolute",
    bottom: 100,
    left: 10,
    right: 10,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    maxHeight: 200,
    elevation: 5,
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  chargerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    alignItems: "center",
  },

  chargerText: {
    fontSize: 16,
    fontWeight: "bold",
  },

  popupContainer: {
    position: "absolute",
    bottom: 50,
    left: 10,
    right: 10,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: "center",
  },

  navigateButton: {
    backgroundColor: "blue",
    padding: 12,
    marginTop: 10,
    borderRadius: 5,
    alignItems: "center",
  },

  navigateButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },

  buttonContainer: {
    position: "absolute",
    bottom: 300,
    right: 20,
    alignItems: "center",
    gap: 10,
  },

  resetButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 50,
    elevation: 5,
    alignItems: "center",
    justifyContent: "center",
    width: 50,
    height: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  resetButtonText: {
    fontSize: 20,
  },
  clusterMarker: {
    backgroundColor: "#ADD8E6",
    borderRadius: 50,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterMarkerLarge: {
    backgroundColor: "#ADD8E6",
    borderRadius: 50,
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFF",
  },
});
