import React, { useEffect, useState } from "react";
import { View, Text, Image } from "react-native";
import { styles } from "../styles/styles";
import { calculateDrivingDistanceAndTime } from "../api/mapApi"; // Ensure correct import

interface PlaceInfoBoxProps {
  name: string;
  photoUrl: string | null;
  origin: [number, number]; // User's location
  destination: [number, number]; // Place coordinates
}

export const PlaceInfoBox = ({
  name,
  photoUrl,
  origin,
  destination,
}: PlaceInfoBoxProps) => {
  const [distance, setDistance] = useState<string>("Calculating...");

  useEffect(() => {
    const fetchDistance = async () => {
      if (origin && destination) {
        const result = await calculateDrivingDistanceAndTime(
          origin,
          destination
        );
        setDistance(result.distance);
      }
    };

    fetchDistance();
  }, [origin, destination]);

  return (
    <View style={styles.infoBox}>
      {photoUrl && (
        <Image source={{ uri: photoUrl }} style={styles.placeImage} />
      )}
      <Text>Name: {name}</Text>
      <Text>Distance: {distance}</Text>
    </View>
  );
};
