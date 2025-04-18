import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Alert,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Image,
  StatusBar,
  Easing,
} from "react-native";
import * as Location from "expo-location";
import { SearchBar } from "./common/SearchBar";
import { PlaceInfoBox } from "./common/PlaceInfoBox";
import { styles } from "../styles/styles";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/NavigationTypes";
import EVChargerDetails from "./map/EVChargerDetails";
import SettingsModal from "./common/SettingsModal";
import AmenityFilter from "./common/AmenityFilter";
import InfoModal from "./common/InfoModal";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocation } from "../hooks/map/useLocation";
import { useFilters } from "../hooks/filters/useFilters";
import { MapControls } from "./map/MapControls";
import { LocationPopup } from "./map/LocationPopup";

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;
MapboxGL.setAccessToken(mapboxAccessToken);

// Create a memoized version of AmenityFilter to prevent re-renders
const MemoizedAmenityFilter = React.memo(AmenityFilter);

// Create a memoized version of PlaceInfoBox to prevent re-renders
const MemoizedPlaceInfoBox = React.memo(PlaceInfoBox);

// Create a memoized version of SettingsModal to prevent re-renders
const MemoizedSettingsModal = React.memo(SettingsModal);

// Define the main component function
function MapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Custom hooks
  const { centerCoordinate, userLocation, getUserLocation } = useLocation();
  const { filters, setFilters, toggleAmenity, clearAllAmenities } =
    useFilters();

  // State
  const [selectedCharger, setSelectedCharger] = useState<any | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [range, setRange] = useState({
    availableRange: 100,
    maxRange: 500,
  });

  // Refs
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const popupAnimation = useRef(new Animated.Value(0)).current;
  const filterMenuAnim = useRef(new Animated.Value(-250)).current;
  const prevCenter = useRef<[number, number] | null>(null);
  const prevZoom = useRef<number | null>(null);

  // Effects
  useEffect(() => {
    if (selectedCharger || searchedLocation) {
      Animated.timing(popupAnimation, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }).start();
    } else {
      Animated.timing(popupAnimation, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
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

  useEffect(() => {
    if (centerCoordinate && !mapCenter) {
      setMapCenter(centerCoordinate);
    }
  }, [centerCoordinate, mapCenter]);

  // Handlers
  const handleSelectSearchLocation = (location: {
    name: string;
    coordinates: [number, number];
  }) => {
    console.log("Selected search location:", location.name);
    console.log("Search coordinates (lng,lat):", location.coordinates);
    setSearchedLocation(location);
    setSelectedCharger(null);
  };

  const handleStartNavigation = () => {
    if (!userLocation || !(selectedCharger || searchedLocation)) {
      Alert.alert("Error", "Please select a destination first.");
      return;
    }

    const originCoord = {
      latitude: userLocation[0],
      longitude: userLocation[1],
    };

    let destinationCoord;
    if (searchedLocation) {
      destinationCoord = {
        latitude: searchedLocation.coordinates[1],
        longitude: searchedLocation.coordinates[0],
      };
    } else {
      destinationCoord = {
        latitude: selectedCharger.lat,
        longitude: selectedCharger.lng,
      };
    }

    navigation.navigate("NavigationScreen", {
      coordinates: [originCoord, destinationCoord],
      availableRange: range.availableRange,
      maxRange: range.maxRange,
      filters: {
        minRating: filters.minRating || undefined,
        brand: filters.brand || undefined,
        connectorType: filters.connectorType || undefined,
        amenities: filters.amenities,
      },
    });
  };

  const dismissPopup = () => {
    Animated.timing(popupAnimation, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }).start(({ finished }) => {
      if (finished) {
        setSelectedCharger(null);
        setSearchedLocation(null);
        setFilterMenuVisible(false);
      }
    });
  };

  const handleMapChange = async () => {
    if (!mapRef.current) return;

    try {
      const newZoom = await mapRef.current.getZoom();
      const mapCenter = (await mapRef.current.getCenter()) as [number, number];

      if (
        prevCenter.current &&
        Math.abs(mapCenter[0] - prevCenter.current[0]) < 0.0001 &&
        Math.abs(mapCenter[1] - prevCenter.current[1]) < 0.0001 &&
        newZoom === prevZoom.current
      ) {
        return;
      }

      prevCenter.current = mapCenter;
      prevZoom.current = newZoom;
      setCurrentZoom(newZoom);
      setMapCenter(mapCenter);
    } catch (error) {
      console.error("Error getting map zoom or center:", error);
    }
  };

  // Memoize the EVChargerDetails props
  const evChargerDetailsProps = useMemo(
    () => ({
      centerCoordinate: mapCenter,
      currentZoom,
      onChargerSelect: setSelectedCharger,
      cameraRef,
      filters: {
        chargingSpeed: filters.chargingSpeed,
        minRating: filters.minRating,
        brand: filters.brand,
        amenities: filters.amenities,
      },
    }),
    [mapCenter, currentZoom, filters]
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="rgba(130, 157, 131, 0.95)"
        translucent={true}
      />

      {/* Black status bar area */}
      <View
        style={{
          backgroundColor: "rgba(130, 157, 131, 0.95)",
          height: insets.top,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 11,
        }}
      />

      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL="mapbox://styles/mapbox/outdoors-v11"
        onPress={dismissPopup}
        onMapIdle={handleMapChange}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={mapCenter || centerCoordinate || [0, 0]}
        />
        {userLocation && (
          <MapboxGL.PointAnnotation
            id="userLocation"
            coordinate={[userLocation[1], userLocation[0]]}
          >
            <View style={styles.emojiMarker}>
              <Text style={styles.emojiText}>🚗</Text>
            </View>
          </MapboxGL.PointAnnotation>
        )}
        <EVChargerDetails {...evChargerDetailsProps} />
      </MapboxGL.MapView>

      <SafeAreaView
        style={styles.safeArea}
        edges={["right", "left"]} // Don't apply safe area to top/bottom
      >
        <View
          style={[
            styles.searchContainer,
            { marginTop: insets.top + 10 }, // Adjust for status bar
          ]}
        >
          <SearchBar
            onSuggestionSelect={handleSelectSearchLocation}
            cameraRef={cameraRef}
          />
        </View>

        <View
          style={[
            styles.amenityFilterContainer,
            { top: insets.top + 65 }, // Adjust for status bar
          ]}
        >
          <MemoizedAmenityFilter
            selectedAmenities={filters.amenities}
            toggleAmenity={toggleAmenity}
            clearAllAmenities={clearAllAmenities}
          />
        </View>

        <LocationPopup
          popupAnimation={popupAnimation}
          searchedLocation={searchedLocation}
          selectedCharger={selectedCharger}
          userLocation={userLocation}
          selectedAmenities={filters.amenities}
          onDismiss={dismissPopup}
          onNavigate={handleStartNavigation}
        />

        <MapControls
          cameraRef={cameraRef}
          userLocation={userLocation}
          onSettingsPress={() => setSettingsModalVisible(true)}
        />

        <View style={styles.infoButtonContainer}>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setInfoModalVisible(true)}
          >
            <Text style={styles.infoButtonText}>i</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <MemoizedSettingsModal
        visible={settingsModalVisible}
        onDismiss={() => setSettingsModalVisible(false)}
        filters={filters}
        setFilters={setFilters}
        range={range}
        setRange={setRange}
      />

      <InfoModal
        visible={infoModalVisible}
        onDismiss={() => setInfoModalVisible(false)}
      />
    </View>
  );
}

// Export a memoized version of the component
export default React.memo(MapScreen);
