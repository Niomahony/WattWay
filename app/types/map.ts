import { Animated } from "react-native";
import MapboxGL from "@rnmapbox/maps";

export type Coordinates = [number, number];

export interface Location {
  name: string;
  coordinates: Coordinates;
}

export interface MapState {
  selectedCharger: any | null;
  searchedLocation: Location | null;
  currentZoom: number;
  filterMenuVisible: boolean;
  settingsModalVisible: boolean;
  infoModalVisible: boolean;
  range: {
    availableRange: number;
    maxRange: number;
  };
}

export interface MapControlsProps {
  cameraRef: React.RefObject<MapboxGL.Camera>;
  userLocation: Coordinates | null;
  onSettingsPress: () => void;
}

export interface LocationPopupProps {
  popupAnimation: Animated.Value;
  searchedLocation: Location | null;
  selectedCharger: any | null;
  userLocation: Coordinates | null;
  selectedAmenities: string[];
  onDismiss: () => void;
  onNavigate: () => void;
}
