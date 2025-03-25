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
import {
  SearchBar,
  PlaceInfoBox,
  SettingsModal,
  AmenityFilter,
  InfoModal,
} from "../common";
import { styles } from "../../styles/styles";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/NavigationTypes";
import { MapControls, LocationPopup, EVChargerDetails } from "./";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useLocation, useMapState } from "../../hooks/map";
import { useFilters } from "../../hooks/filters";

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;
MapboxGL.setAccessToken(mapboxAccessToken);

const MemoizedAmenityFilter = React.memo(AmenityFilter);

const MemoizedPlaceInfoBox = React.memo(PlaceInfoBox);

const MemoizedSettingsModal = React.memo(SettingsModal);

function MapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const { centerCoordinate, userLocation, getUserLocation } = useLocation();
  const { filters, setFilters, toggleAmenity, clearAllAmenities } =
    useFilters();

  const [selectedCharger, setSelectedCharger] = useState<any | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<{
    name: string;
    coordinates: [number, number];
  } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [range, setRange] = useState({
    availableRange: 100,
    maxRange: 500,
  });
  const [mapCenterCoordinate, setMapCenterCoordinate] = useState<
    [number, number] | null
  >(null);

  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const popupAnimation = useRef(new Animated.Value(0)).current;
  const filterMenuAnim = useRef(new Animated.Value(-250)).current;
  const prevCenter = useRef<[number, number] | null>(null);
  const prevZoom = useRef<number | null>(null);

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

      setMapCenterCoordinate(mapCenter);
      prevCenter.current = mapCenter;
      prevZoom.current = newZoom;
      setCurrentZoom(newZoom);
    } catch (error) {
      console.error("Error getting map zoom or center:", error);
    }
  };

  const evChargerDetailsProps = useMemo(
    () => ({
      centerCoordinate: mapCenterCoordinate || centerCoordinate,
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
    [mapCenterCoordinate, currentZoom, filters, centerCoordinate]
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        translucent={true}
      />

      {}
      <View
        style={{
          backgroundColor: "#000000",
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
        onRegionDidChange={handleMapChange}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={centerCoordinate || [0, 0]}
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
        <EVChargerDetails
          centerCoordinate={evChargerDetailsProps.centerCoordinate}
          currentZoom={evChargerDetailsProps.currentZoom}
          onChargerSelect={evChargerDetailsProps.onChargerSelect}
          cameraRef={evChargerDetailsProps.cameraRef}
          filters={{
            chargingSpeed: evChargerDetailsProps.filters.chargingSpeed,
            minRating: evChargerDetailsProps.filters.minRating,
            brand: evChargerDetailsProps.filters.brand,
            amenities: evChargerDetailsProps.filters.amenities,
          }}
        />
      </MapboxGL.MapView>

      <SafeAreaView style={styles.safeArea} edges={["right", "left"]}>
        <View style={[styles.searchContainer, { marginTop: insets.top + 10 }]}>
          <SearchBar
            onSuggestionSelect={handleSelectSearchLocation}
            cameraRef={cameraRef}
          />
        </View>

        <View style={[styles.amenityFilterContainer, { top: insets.top + 65 }]}>
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

export default React.memo(MapScreen);
