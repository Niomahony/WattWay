import { useState, useEffect } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";

export const useLocation = () => {
  const [centerCoordinate, setCenterCoordinate] = useState<
    [number, number] | null
  >(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please enable location permissions."
        );
        return;
      }

      console.log("Getting user location...");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      // Store user location in [lat, lng] format for calculations
      const userCoords: [number, number] = [
        location.coords.latitude,
        location.coords.longitude,
      ];

      // Convert to MapboxGL format [lng, lat] for map display
      const mapboxCoords: [number, number] = [
        location.coords.longitude,
        location.coords.latitude,
      ];

      console.log("User location (lat, lng):", userCoords);
      console.log("MapboxGL coords (lng, lat):", mapboxCoords);

      setUserLocation(userCoords);
      setCenterCoordinate(mapboxCoords);
    } catch (error) {
      console.error("Error getting user location:", error);
      Alert.alert("Error", "Could not fetch location.");
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  return {
    centerCoordinate,
    userLocation,
    getUserLocation,
  };
};
