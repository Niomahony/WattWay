import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { styles } from "../styles/styles";
import { fetchEVChargers } from "../api/googlePlaces";
import { clusterChargers } from "../helpers/ClusterChargers";
import { Easing } from "react-native";

interface EVChargerDetailsProps {
  centerCoordinate: [number, number] | null;
  currentZoom: number;
  onChargerSelect: (charger: any) => void;
  cameraRef: React.RefObject<MapboxGL.Camera>;
}

const EVChargerDetails = ({
  centerCoordinate,
  currentZoom,
  onChargerSelect,
  cameraRef,
}: EVChargerDetailsProps) => {
  const [evChargers, setEvChargers] = useState<any[]>([]);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [expandedChargers, setExpandedChargers] = useState<any[]>([]);
  const previousZoom = useRef(currentZoom);

  useEffect(() => {
    if (centerCoordinate) {
      fetchChargers();
    }
  }, [centerCoordinate, currentZoom]);

  const fetchChargers = async () => {
    if (!centerCoordinate) return;

    console.log("Fetching chargers near:", centerCoordinate);

    try {
      const chargers = await fetchEVChargers(centerCoordinate);
      console.log("Fetched chargers:", chargers);

      if (!chargers || chargers.length === 0) {
        console.warn("No chargers returned from API!");
        return;
      }

      const clusteredChargers = clusterChargers(chargers, currentZoom);
      console.log("Clustered chargers:", clusteredChargers);

      setEvChargers(clusteredChargers);

      if (Math.abs(previousZoom.current - currentZoom) > 1) {
        setExpandedCluster(null);
        setExpandedChargers([]);
      }
      previousZoom.current = currentZoom;
    } catch (error) {
      console.error("Error fetching chargers:", error);
    }
  };

  const handleClusterPress = async (clusterId: string, chargers: any[]) => {
    if (!cameraRef.current) return;

    const lats = chargers.map((c) => c.lat);
    const lngs = chargers.map((c) => c.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const padding = 0.02;

    await cameraRef.current.fitBounds(
      [minLng - padding, minLat - padding],
      [maxLng + padding, maxLat + padding],
      1200,
      1200
    );

    setTimeout(() => {
      setExpandedCluster(clusterId);
      setExpandedChargers(chargers);
    }, 1300);
  };

  return (
    <>
      {evChargers.map((charger, index) => {
        if (!charger.lat || !charger.lng) {
          console.warn("Skipping charger with missing coordinates:", charger);
          return null;
        }

        if (charger.cluster && expandedCluster !== `cluster-${index}`) {
          return (
            <MapboxGL.PointAnnotation
              key={`cluster-${index}`}
              id={`cluster-${index}`}
              coordinate={[charger.lng, charger.lat]}
              onSelected={() =>
                handleClusterPress(`cluster-${index}`, charger.chargers)
              }
            >
              <TouchableOpacity activeOpacity={0.7}>
                <View style={styles.clusterMarker}>
                  <Text style={styles.clusterText}>
                    {charger.chargers.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </MapboxGL.PointAnnotation>
          );
        }

        if (expandedCluster === `cluster-${index}`) {
          return expandedChargers.map((expandedCharger) => (
            <MapboxGL.PointAnnotation
              key={`ev-${expandedCharger.place_id}`}
              id={`ev-${expandedCharger.place_id}`}
              coordinate={[expandedCharger.lng, expandedCharger.lat]}
              onSelected={() => onChargerSelect(expandedCharger)}
            >
              <View style={styles.evMarker}>
                <Text style={styles.evMarkerText}>⚡</Text>
              </View>
            </MapboxGL.PointAnnotation>
          ));
        }

        return null;
      })}
    </>
  );
};

export default EVChargerDetails;
