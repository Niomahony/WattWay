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
import { Dropdown } from "react-native-element-dropdown";

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

  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const filterMenuAnim = useRef(new Animated.Value(-250)).current;

  const [filters, setFilters] = useState({
    chargerType: null,
    chargingSpeed: null,
    minRating: null,
    brand: null,
  });

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

  useEffect(() => {
    Animated.timing(filterMenuAnim, {
      toValue: filterMenuVisible ? 0 : -250,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [filterMenuVisible]);

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
    setFilterMenuVisible(false);
  };

  const prevCenter = useRef<[number, number] | null>(null);
  const prevZoom = useRef<number | null>(null);

  const handleMapChange = async () => {
    if (!mapRef.current) return;
    try {
      const newZoom = await mapRef.current.getZoom();
      const mapCenter = (await mapRef.current.getCenter()) as [number, number];
      if (
        prevCenter.current &&
        mapCenter[0] === prevCenter.current[0] &&
        mapCenter[1] === prevCenter.current[1] &&
        newZoom === prevZoom.current
      ) {
        return;
      }
      console.log("📍 Map Moved! New Center:", mapCenter);
      console.log("🔎 New Zoom Level:", newZoom);
      prevCenter.current = mapCenter;
      prevZoom.current = newZoom;
      setCenterCoordinate(mapCenter);
      setCurrentZoom(newZoom);
    } catch (error) {
      console.error("Error getting map zoom or center:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {}
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={() => setFilterMenuVisible(!filterMenuVisible)}
      >
        <Text style={styles.hamburgerText}>☰</Text>
      </TouchableOpacity>

      {}
      <Animated.View
        pointerEvents={filterMenuVisible ? "auto" : "none"}
        style={[
          styles.filterMenuContainer,
          {
            transform: [{ translateX: filterMenuAnim }],
          },
        ]}
      >
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
        <Dropdown
          data={[
            { label: "Slow (2.3 - 6 kW)", value: "slow" },
            { label: "Fast (7 - 22 kW)", value: "fast" },
            { label: "Rapid (50 - 100 kW)", value: "rapid" },
            { label: "Ultra-Rapid (100+ kW)", value: "ultra-rapid" },
          ]}
          placeholder="Charging Speed"
          labelField="label"
          valueField="value"
          value={filters.chargingSpeed}
          onChange={(item) =>
            setFilters({ ...filters, chargingSpeed: item.value })
          }
          style={styles.dropdown}
        />
        <Dropdown
          data={[
            { label: "1+", value: 1 },
            { label: "2+", value: 2 },
            { label: "3+", value: 3 },
            { label: "4+", value: 4 },
          ]}
          placeholder="Min Rating"
          labelField="label"
          valueField="value"
          value={filters.minRating}
          onChange={(item) => setFilters({ ...filters, minRating: item.value })}
          style={styles.dropdown}
        />
        <Dropdown
          data={[
            { label: "Tesla", value: "Tesla" },
            { label: "ChargePoint", value: "ChargePoint" },
            { label: "EVgo", value: "EVgo" },
          ]}
          placeholder="Brand"
          labelField="label"
          valueField="value"
          value={filters.brand}
          onChange={(item) => setFilters({ ...filters, brand: item.value })}
          style={styles.dropdown}
        />
      </Animated.View>

      <SearchBar onSuggestionSelect={handleSelectSearchLocation} />

      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        onPress={() => {
          dismissPopup();
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
          filters={{
            chargerType: filters.chargerType,
            chargingSpeed: filters.chargingSpeed,
            minRating: filters.minRating,
            brand: filters.brand,
          }}
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
