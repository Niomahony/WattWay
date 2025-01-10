import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  Alert,
  AppState,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";
import {
  fetchPlaceDetails,
  fetchPlaceDetailsByCoordinates,
  calculateDrivingDistance,
} from "../api/googlePlaces";
import { SearchBar } from "./SearchBar";
import { PlaceInfoBox } from "../components/PlaceInfoBox";
import { styles } from "../styles/styles";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/NavigationTypes";

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;
MapboxGL.setAccessToken(mapboxAccessToken);

export default function MapScreen() {
  const [centerCoordinate, setCenterCoordinate] = useState<
    [number, number] | null
  >(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [pinCoordinate, setPinCoordinate] = useState<[number, number] | null>(
    null
  );
  const [placeInfo, setPlaceInfo] = useState<{
    name: string;
    photoUrl: string | null;
    distance: string;
  } | null>(null);
  const [isAppActive, setIsAppActive] = useState(true);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(true);

  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const appStateListener = AppState.addEventListener(
      "change",
      (nextAppState) => {
        setIsAppActive(nextAppState === "active");
      }
    );

    getUserLocation();
    return () => appStateListener.remove();
  }, []);

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
      const location = await Location.getCurrentPositionAsync({});
      const coords: [number, number] = [
        location.coords.longitude,
        location.coords.latitude,
      ];
      setUserLocation(coords);
      setCenterCoordinate(coords);

      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        zoomLevel: 12,
        animationDuration: 1000,
      });
    } catch (error) {
      Alert.alert("Error", "Could not fetch location.");
    }
  };

  const handleMapPress = async (e: any) => {
    if (!isAppActive) return;
    const [longitude, latitude] = e.geometry.coordinates;
    setPinCoordinate([longitude, latitude]);
    setShowSearchSuggestions(false);
    setPlaceInfo({
      name: "Unknown",
      photoUrl: null,
      distance: "Calculating...",
    });

    try {
      const placeDetails = await fetchPlaceDetailsByCoordinates(
        latitude,
        longitude
      );
      let distance = "Distance not available";
      if (userLocation) {
        distance = await calculateDrivingDistance(userLocation, [
          longitude,
          latitude,
        ]);
      }
      setPlaceInfo({
        name: placeDetails?.name || "Unknown",
        photoUrl: placeDetails?.photoUrl || null,
        distance,
      });
    } catch (error) {
      setPlaceInfo({
        name: "Unknown",
        photoUrl: null,
        distance: "Error calculating distance",
      });
    }
  };

  const handleSuggestionSelect = async (placeId: string) => {
    setShowSearchSuggestions(false);
    try {
      const placeDetails = await fetchPlaceDetails(placeId);
      if (placeDetails) {
        setPinCoordinate(placeDetails.coordinates as [number, number]);
        setCenterCoordinate(placeDetails.coordinates as [number, number]);

        if (userLocation) {
          const distance = await calculateDrivingDistance(
            userLocation,
            placeDetails.coordinates as [number, number]
          );
          setPlaceInfo({
            name: placeDetails.name,
            photoUrl: placeDetails.photoUrl,
            distance,
          });
        }
      }
    } catch (error) {
      Alert.alert("Error", "Could not fetch location details.");
    }
  };

  const handleStartNavigation = () => {
    if (userLocation && pinCoordinate) {
      navigation.navigate("NavigationScreen", {
        coordinates: [
          { latitude: userLocation[1], longitude: userLocation[0] },
          { latitude: pinCoordinate[1], longitude: pinCoordinate[0] },
        ],
      });
    } else {
      Alert.alert("Error", "Please select a destination first!");
    }
  };

  const handleClearPin = () => {
    setPinCoordinate(null);
    setPlaceInfo(null);
  };

  const resetCameraToUserLocation = () => {
    if (userLocation) {
      cameraRef.current?.setCamera({
        centerCoordinate: userLocation,
        zoomLevel: 12,
        animationDuration: 1000,
      });
    } else {
      Alert.alert("Error", "User location not available.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchBar
        onSuggestionSelect={handleSuggestionSelect}
        showSuggestions={showSearchSuggestions}
      />

      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        onPress={handleMapPress}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={centerCoordinate || [0, 0]}
          zoomLevel={12}
        />

        {}
        {userLocation && (
          <MapboxGL.PointAnnotation id="userLocation" coordinate={userLocation}>
            <View style={styles.emojiMarker}>
              <Text style={styles.emojiText}>🚗</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {}
        {pinCoordinate && (
          <MapboxGL.PointAnnotation id="pinLocation" coordinate={pinCoordinate}>
            <View style={styles.defaultPin}>
              <Text style={styles.pinText}>📍</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      {}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetCameraToUserLocation}
      >
        <Text style={styles.resetButtonText}>📍</Text>
      </TouchableOpacity>

      {pinCoordinate && (
        <View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleStartNavigation}
          >
            <Text style={styles.actionButtonText}>Start Navigation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "red" }]}
            onPress={handleClearPin}
          >
            <Text style={styles.actionButtonText}>Clear Pin & Info</Text>
          </TouchableOpacity>
        </View>
      )}

      {placeInfo && <PlaceInfoBox {...placeInfo} />}
    </SafeAreaView>
  );
}

//test commit
