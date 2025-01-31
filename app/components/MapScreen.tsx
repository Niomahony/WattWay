import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  Alert,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import * as Location from "expo-location";
import { fetchEVChargers, calculateDrivingDistance } from "../api/googlePlaces";
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
  const [evChargers, setEvChargers] = useState<any[]>([]);
  const [selectedCharger, setSelectedCharger] = useState<any | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [lastFetchedCenter, setLastFetchedCenter] = useState<
    [number, number] | null
  >(null);

  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    getUserLocation();
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
      if (currentZoom >= 12) fetchChargersNear(coords);

      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        zoomLevel: 12,
        animationDuration: 1000,
      });
    } catch (error) {
      Alert.alert("Error", "Could not fetch location.");
    }
  };

  const fetchChargersNear = async (coords: [number, number]) => {
    if (!coords || currentZoom < 12) return;

    const distanceThreshold = 0.05;
    if (
      lastFetchedCenter &&
      Math.abs(coords[0] - lastFetchedCenter[0]) < distanceThreshold &&
      Math.abs(coords[1] - lastFetchedCenter[1]) < distanceThreshold
    ) {
      return;
    }

    setLastFetchedCenter(coords);

    try {
      const chargers = await fetchEVChargers(coords);
      setEvChargers(chargers || []);
    } catch (error) {
      console.error("Error fetching chargers:", error);
    }
  };

  const handleMapChange = async () => {
    if (!mapRef.current) return;
    try {
      const newCenter = await mapRef.current.getCenter();
      const newZoom = await mapRef.current.getZoom();
      setCurrentZoom(newZoom);

      if (newZoom >= 12) {
        fetchChargersNear([newCenter[0], newCenter[1]]);
      } else {
        setEvChargers([]);
      }
    } catch (error) {
      console.error("Error getting map details:", error);
    }
  };

  const handleSelectCharger = async (charger: any) => {
    if (!userLocation) return;

    try {
      const distance = await calculateDrivingDistance(userLocation, [
        charger.lng,
        charger.lat,
      ]);
      setSelectedCharger({
        ...charger,
        distance,
      });
    } catch (error) {
      console.error("Error calculating distance:", error);
      setSelectedCharger({
        ...charger,
        distance: "Unknown distance",
      });
    }
  };

  const handleStartNavigation = () => {
    if (!userLocation || !searchedLocation) {
      Alert.alert("Error", "Please select a destination first.");
      return;
    }

    navigation.navigate("NavigationScreen", {
      coordinates: [
        { latitude: userLocation[1], longitude: userLocation[0] },
        {
          latitude: searchedLocation.coordinates[1],
          longitude: searchedLocation.coordinates[0],
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchBar onSuggestionSelect={setSearchedLocation} />

      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        onRegionDidChange={handleMapChange}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={centerCoordinate || [0, 0]}
          zoomLevel={12}
        />

        {userLocation && (
          <MapboxGL.PointAnnotation id="userLocation" coordinate={userLocation}>
            <View style={styles.emojiMarker}>
              <Text style={styles.emojiText}>🚗</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {currentZoom >= 12 &&
          evChargers.map((charger) => (
            <MapboxGL.PointAnnotation
              key={`ev-${charger.place_id}`}
              id={`ev-${charger.place_id}`}
              coordinate={[charger.lng, charger.lat]}
              onSelected={() => handleSelectCharger(charger)}
            >
              <View style={styles.evMarker}>
                <Text style={styles.evMarkerText}>⚡</Text>
              </View>
            </MapboxGL.PointAnnotation>
          ))}
      </MapboxGL.MapView>

      {searchedLocation && (
        <View style={styles.popupContainer}>
          <PlaceInfoBox
            name={searchedLocation.name}
            photoUrl={null}
            distance={"Unknown distance"}
          />
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleStartNavigation}
          >
            <Text style={styles.navigateButtonText}>Start Navigation</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedCharger && (
        <View style={styles.popupContainer}>
          <PlaceInfoBox
            name={selectedCharger.name}
            photoUrl={selectedCharger.photoUrl || null}
            distance={selectedCharger.distance}
          />
          <Text>
            Availability: {selectedCharger.open_now ? "Open" : "Closed"}
          </Text>
          <Text>Charger Type: {selectedCharger.type}</Text>
          <Text>Speed: {selectedCharger.speed ?? "Standard Speed"}</Text>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() =>
              navigation.navigate("NavigationScreen", {
                coordinates: [
                  { latitude: userLocation![1], longitude: userLocation![0] },
                  {
                    latitude: selectedCharger.lat,
                    longitude: selectedCharger.lng,
                  },
                ],
              })
            }
          >
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navigateButton,
              { backgroundColor: "red", marginTop: 10 },
            ]}
            onPress={() => setSelectedCharger(null)}
          >
            <Text style={styles.navigateButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.resetButton} onPress={getUserLocation}>
        <Text style={styles.resetButtonText}>📍</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
