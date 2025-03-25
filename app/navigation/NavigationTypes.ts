export type Coordinate = {
  latitude: number;
  longitude: number;
};

// In NavigationTypes.ts
export type RootStackParamList = {
  MapScreen: undefined;
  NavigationScreen: {
    coordinates: { latitude: number; longitude: number }[];
    availableRange: number;
    maxRange: number;
    filters: {
      minRating?: number;
      brand?: string[];
      connectorType?: string;
      amenities?: string[];
    };
  };
  // ...other screens
};
