import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  Alert,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from "react-native";
import * as Location from "expo-location";
import { SearchBar } from "./SearchBar";
import { PlaceInfoBox } from "../components/PlaceInfoBox";
import { styles } from "../styles/styles";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/NavigationTypes";
import EVChargerDetails from "../components/EVChargerDetails";

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;
MapboxGL.setAccessToken(mapboxAccessToken);

export default function MapScreen() {
  const [centerCoordinate, setCenterCoordinate] = useState<
    [number, number] | null
  >(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [selectedCharger, setSelectedCharger] = useState<any | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(12);

  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const popupAnimation = useRef(new Animated.Value(0)).current;

  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [expandedChargers, setExpandedChargers] = useState<any[]>([]);

  const resetClusters = () => {
    setExpandedCluster(null);
    setExpandedChargers([]);
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (selectedCharger || searchedLocation) {
      Animated.timing(popupAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(popupAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedCharger, searchedLocation]);

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
    } catch (error) {
      Alert.alert("Error", "Could not fetch location.");
    }
  };

  const resetCameraToUserLocation = () => {
    if (!userLocation || !cameraRef.current) {
      Alert.alert("Error", "User location not available.");
      return;
    }

    cameraRef.current.setCamera({
      centerCoordinate: userLocation,
      zoomLevel: 14,
      animationDuration: 500,
    });
  };

  const resetCameraToNorth = () => {
    if (!cameraRef.current) return;

    cameraRef.current.setCamera({
      heading: 0,
      animationDuration: 500,
    });
  };

  const handleSelectSearchLocation = (location: {
    name: string;
    coordinates: [number, number];
  }) => {
    setSearchedLocation(location);
    setSelectedCharger(null);
  };

  const handleStartNavigation = () => {
    if (!userLocation || !(selectedCharger || searchedLocation)) {
      Alert.alert("Error", "Please select a destination first.");
      return;
    }

    navigation.navigate("NavigationScreen", {
      coordinates: [
        { latitude: userLocation[1], longitude: userLocation[0] },
        {
          latitude: searchedLocation?.coordinates[1] || selectedCharger?.lat,
          longitude: searchedLocation?.coordinates[0] || selectedCharger?.lng,
        },
      ],
    });
  };

  const dismissPopup = () => {
    setSelectedCharger(null);
    setSearchedLocation(null);
  };

  const handleMapChange = async () => {
    if (!mapRef.current) return;

    try {
      const newZoom = await mapRef.current.getZoom();
      console.log("New Zoom Level:", newZoom);

      if (Math.abs(newZoom - currentZoom) > 0.1) {
        setCurrentZoom(newZoom);
      }

      const mapCenter = (await mapRef.current.getCenter()) as [number, number];
      console.log("📍 Map Center Coordinates:", mapCenter);

      if (
        !centerCoordinate ||
        Math.abs(mapCenter[0] - centerCoordinate[0]) > 0.0001 ||
        Math.abs(mapCenter[1] - centerCoordinate[1]) > 0.0001
      ) {
        setCenterCoordinate(mapCenter);
      }
    } catch (error) {
      console.error("Error getting map zoom or center:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SearchBar onSuggestionSelect={handleSelectSearchLocation} />

      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        onPress={() => {
          dismissPopup();
          resetClusters();
        }}
        onRegionDidChange={handleMapChange}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={centerCoordinate || [0, 0]}
        />

        {userLocation && (
          <MapboxGL.PointAnnotation id="userLocation" coordinate={userLocation}>
            <View style={styles.emojiMarker}>
              <Text style={styles.emojiText}>🚗</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}

        <EVChargerDetails
          centerCoordinate={centerCoordinate}
          currentZoom={currentZoom}
          onChargerSelect={setSelectedCharger}
          cameraRef={cameraRef}
          resetClusters={resetClusters}
        />
      </MapboxGL.MapView>

      <Animated.View
        style={[
          styles.popupContainer,
          {
            transform: [
              {
                translateY: popupAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              },
            ],
          },
        ]}
      >
        {searchedLocation && (
          <PlaceInfoBox
            name={searchedLocation.name}
            photoUrl={null}
            distance={"Unknown distance"}
          />
        )}

        {selectedCharger && (
          <PlaceInfoBox
            name={selectedCharger.name}
            photoUrl={selectedCharger.photoUrl || null}
            distance={selectedCharger.distance}
          />
        )}

        {(selectedCharger || searchedLocation) && (
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleStartNavigation}
          >
            <Text style={styles.navigateButtonText}>Navigate</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetCameraToUserLocation}
        >
          <Text style={styles.resetButtonText}>📍</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetCameraToNorth}
        >
          <Text style={styles.resetButtonText}>🧭</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
