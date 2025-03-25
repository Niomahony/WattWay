import { useState, useRef } from "react";
import { Animated, Easing } from "react-native";
import { MapState } from "../../types/map";

export const useMapState = () => {
  const [selectedCharger, setSelectedCharger] = useState<any | null>(null);
  const [searchedLocation, setSearchedLocation] =
    useState<MapState["searchedLocation"]>(null);
  const [currentZoom, setCurrentZoom] = useState(12);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [range, setRange] = useState({
    availableRange: 100,
    maxRange: 500,
  });

  const popupAnimation = useRef(new Animated.Value(0)).current;
  const filterMenuAnim = useRef(new Animated.Value(-250)).current;
  const prevCenter = useRef<[number, number] | null>(null);
  const prevZoom = useRef<number | null>(null);

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

  return {
    selectedCharger,
    setSelectedCharger,
    searchedLocation,
    setSearchedLocation,
    currentZoom,
    setCurrentZoom,
    filterMenuVisible,
    setFilterMenuVisible,
    settingsModalVisible,
    setSettingsModalVisible,
    infoModalVisible,
    setInfoModalVisible,
    range,
    setRange,
    popupAnimation,
    filterMenuAnim,
    prevCenter,
    prevZoom,
    dismissPopup,
  };
};
