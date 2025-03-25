import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Text, Animated } from "react-native";

interface RangeMessageProps {
  showRangeMessage: boolean;
  fadeAnim: Animated.Value;
  setShowRangeMessage: (show: boolean) => void;
  isRangeSufficient: boolean;
  selectedChargerInfo?: {
    name: string;
    distance: number;
    detourPercent: number;
    power?: number;
    availability?: string;
    operator?: string;
  } | null;
}

export default function RangeMessage({
  showRangeMessage,
  fadeAnim,
  setShowRangeMessage,
  isRangeSufficient,
  selectedChargerInfo,
}: RangeMessageProps) {
  // Use a ref to track animation state
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Clean up previous animation if it exists
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    if (showRangeMessage) {
      console.log("RangeMessage: Starting animation", {
        isRangeSufficient,
        hasChargerInfo: !!selectedChargerInfo,
      });

      // Reset opacity to 0
      fadeAnim.setValue(0);

      // Determine how long to show the message
      const delayTime = !isRangeSufficient && selectedChargerInfo ? 6000 : 3000;

      // Create the animation sequence
      animationRef.current = Animated.sequence([
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        // Hold
        Animated.delay(delayTime),
        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);

      // Start animation and clear showRangeMessage when done
      animationRef.current.start(({ finished }) => {
        if (finished) {
          console.log("RangeMessage: Animation completed");
          setShowRangeMessage(false);
        }
      });
    }

    // Cleanup function to stop animation if component unmounts or dependencies change
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [
    showRangeMessage,
    isRangeSufficient,
    selectedChargerInfo,
    fadeAnim,
    setShowRangeMessage,
  ]);

  // Don't render anything if not showing
  if (!showRangeMessage) {
    return null;
  }

  // Function to format charger reason message
  const getSelectionReason = () => {
    if (!selectedChargerInfo) return "";

    const reasons = [];

    if (selectedChargerInfo.detourPercent === 0) {
      reasons.push("on your route");
    } else if (selectedChargerInfo.detourPercent <= 5) {
      reasons.push("minimal detour");
    }

    if (selectedChargerInfo.power && selectedChargerInfo.power >= 100) {
      reasons.push("fast charging");
    }

    if (selectedChargerInfo.availability?.toLowerCase() === "available") {
      reasons.push("available now");
    }

    return reasons.length > 0
      ? `Selected for: ${reasons.join(", ")}`
      : "Selected based on optimal location";
  };

  return (
    <Animated.View
      style={[styles.rangeMessageContainer, { opacity: fadeAnim }]}
    >
      <View
        style={[
          styles.rangeMessage,
          isRangeSufficient
            ? styles.sufficientMessage
            : styles.insufficientMessage,
        ]}
      >
        <Text style={styles.rangeMessageText}>
          {isRangeSufficient
            ? "Sufficient range to reach destination"
            : "Insufficient range - added charging stop"}
        </Text>

        {!isRangeSufficient && selectedChargerInfo && (
          <View style={styles.chargerInfoContainer}>
            <Text style={styles.chargerNameText}>
              {selectedChargerInfo.name}
              {selectedChargerInfo.operator &&
                ` (${selectedChargerInfo.operator})`}
            </Text>
            <Text style={styles.chargerDetailsText}>
              {selectedChargerInfo.distance} km from start
              {selectedChargerInfo.detourPercent > 0 &&
                ` (+${selectedChargerInfo.detourPercent}% detour)`}
            </Text>

            {selectedChargerInfo.power && (
              <Text style={styles.chargerPowerText}>
                {selectedChargerInfo.power} kW
              </Text>
            )}

            <Text style={styles.selectionReasonText}>
              {getSelectionReason()}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rangeMessageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  rangeMessage: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    minWidth: 280,
    maxWidth: "80%",
  },
  sufficientMessage: {
    backgroundColor: "#2C2C2C",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  insufficientMessage: {
    backgroundColor: "#3A2C2C",
    borderColor: "rgba(255, 150, 150, 0.2)",
  },
  rangeMessageText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  chargerInfoContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  chargerNameText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  chargerDetailsText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 2,
  },
  chargerPowerText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "500",
  },
  selectionReasonText: {
    color: "rgba(255, 200, 140, 0.9)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
});
