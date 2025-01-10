import React from "react";
import { View, Text, Image } from "react-native";
import { styles } from "../styles/styles";

interface PlaceInfoBoxProps {
  name: string;
  photoUrl: string | null;
  distance: string;
}

export const PlaceInfoBox = ({
  name,
  photoUrl,
  distance,
}: PlaceInfoBoxProps) => (
  <View style={styles.infoBox}>
    {photoUrl && <Image source={{ uri: photoUrl }} style={styles.placeImage} />}
    <Text>Name: {name}</Text>
    <Text>Distance: {distance}</Text>
  </View>
);
