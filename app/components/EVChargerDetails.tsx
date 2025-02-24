import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { styles } from "../styles/styles";
import { fetchEVChargers } from "../api/googlePlaces";
import { clusterChargers } from "../helpers/ClusterChargers";

interface EVChargerDetailsProps {
  centerCoordinate: [number, number] | null;
  currentZoom: number;
  onChargerSelect: (charger: any) => void;
  cameraRef: React.RefObject<MapboxGL.Camera>;
  filters: {
    connectorSet?: string | null;
    minPowerKW?: number | null;
    chargerType?: string | null;
    chargingSpeed?: string | null;
    minRating?: number | null;
    brand?: string | null;
  };
}

const EVChargerDetails = ({
  centerCoordinate,
  currentZoom,
  onChargerSelect,
  cameraRef,
  filters,
}: EVChargerDetailsProps) => {
  const [evChargers, setEvChargers] = useState<any[]>([]);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [expandedChargers, setExpandedChargers] = useState<any[]>([]);

  const prevRenderedChargers = useRef(new Set<string>());
  const prevZoom = useRef<number | null>(null);

  useEffect(() => {
    if (centerCoordinate) {
      fetchChargers();
    }
  }, [centerCoordinate, filters, currentZoom]);

  const fetchChargers = async () => {
    if (!centerCoordinate) return;

    try {
      console.log("🚗 Fetching EV chargers from TomTom POI Search...");
      console.log("📍 Center Coordinate:", centerCoordinate);
      console.log("🔎 Applied Filters:", filters);

      const chargers = await fetchEVChargers(centerCoordinate, filters);

      if (!chargers || chargers.length === 0) {
        console.log("⚠️ No chargers found.");
        setEvChargers([]);
        return;
      }

      if (
        prevZoom.current !== null &&
        Math.abs(currentZoom - prevZoom.current) > 1
      ) {
        console.log("🔄 Significant zoom change, resetting charger cache.");
        prevRenderedChargers.current.clear();
      }
      prevZoom.current = currentZoom;

      interface Charger {
        place_id?: string;
        lat: number;
        lng: number;
        cluster?: boolean;
        chargers?: Charger[];
      }

      const uniqueChargers = chargers.filter((charger: Charger) => {
        const key = charger.place_id || `${charger.lat}-${charger.lng}`;
        if (prevRenderedChargers.current.has(key)) {
          return false;
        }
        prevRenderedChargers.current.add(key);
        return true;
      });

      const clusteredChargers = clusterChargers(uniqueChargers, currentZoom);

      if (clusteredChargers.length > 0 || evChargers.length === 0) {
        setEvChargers(clusteredChargers);
      }
    } catch (error) {
      console.error("❌ Error fetching chargers:", error);
    }
  };

  const handleClusterPress = async (clusterId: string, chargers: any[]) => {
    if (!cameraRef.current) return;
    if (expandedCluster === clusterId) return;

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

    setExpandedCluster(clusterId);
    setExpandedChargers(chargers);
  };

  return (
    <>
      {evChargers.map((charger, index) => {
        if (!charger.lat || !charger.lng) return null;

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
          return expandedChargers.map((expandedCharger) => {
            const chargerKey = expandedCharger.place_id
              ? `ev-${expandedCharger.place_id}`
              : `ev-${expandedCharger.lat}-${expandedCharger.lng}`;

            return (
              <MapboxGL.PointAnnotation
                key={chargerKey}
                id={chargerKey}
                coordinate={[expandedCharger.lng, expandedCharger.lat]}
                onSelected={() => onChargerSelect(expandedCharger)}
              >
                <View style={styles.evMarker}>
                  <Text style={styles.evMarkerText}>⚡</Text>
                </View>
              </MapboxGL.PointAnnotation>
            );
          });
        }

        const key = `ev-${charger.place_id || charger.lat}-${charger.lng}`;
        return (
          <MapboxGL.PointAnnotation
            key={key}
            id={key}
            coordinate={[charger.lng, charger.lat]}
            onSelected={() => onChargerSelect(charger)}
          >
            <View style={styles.evMarker}>
              <Text style={styles.evMarkerText}>⚡</Text>
            </View>
          </MapboxGL.PointAnnotation>
        );
      })}
    </>
  );
};

export default EVChargerDetails;
