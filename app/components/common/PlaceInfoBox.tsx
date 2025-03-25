import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Pressable,
  Image,
  Animated,
  Easing,
} from "react-native";
import { styles } from "../../styles/styles";
import {
  calculateDrivingDistanceAndTime,
  checkNearbyAmenities,
} from "../../api/mapApi";
import Constants from "expo-constants";

import {
  googleTypes,
  amenityTypeMapping,
} from "../../helpers/amenityCategories";

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.googlePlacesApiKey;

interface PlaceInfoBoxProps {
  name: string;
  photoUrl: string | null;
  origin: [number, number]; // MUST be in [latitude, longitude] format
  destination: [number, number]; // MUST be in [latitude, longitude] format
  selectedAmenities: string[];
  nearbyPlaces?: any[]; // Add this property to receive pre-fetched nearby places
}

interface Amenity {
  name: string;
  placeId: string;
  address?: string;
  types?: string[];
  matchingTypes?: string[];
  matchingAmenityTypes?: string[];
  emoji: string;
  type: string;
}

interface PlaceDetails {
  name: string;
  address: string;
  rating?: number;
  reviews?: { author_name: string; text: string }[];
  photos?: string[];
  opening_hours?: { weekday_text: string[] };
}

// Helper function to format type names for display
const formatTypeForDisplay = (type: string): string => {
  if (!type) return "";
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const PlaceInfoBox = ({
  name,
  photoUrl,
  origin,
  destination,
  selectedAmenities,
  nearbyPlaces = [], // Default to empty array
}: PlaceInfoBoxProps) => {
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [distance, setDistance] = useState<string>("Calculating...");
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [duration, setDuration] = useState<string>("Calculating...");
  const [loading, setLoading] = useState<boolean>(true);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState<boolean>(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Keep track of all amenities before filtering to avoid refetching
  const allAmenitiesRef = useRef<Amenity[]>([]);

  // Animation values
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const photoModalAnimation = useRef(new Animated.Value(0)).current;

  // Add an animated value for smooth transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Helper function to animate changes
  const animateContentChange = (callback: () => void) => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0.4,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Execute the state change
      callback();

      // Fade back in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  // Handle initial content appearance
  useEffect(() => {
    const animation = Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
      delay: 100,
    });

    animation.start();

    // Cleanup animations when component unmounts
    return () => {
      animation.stop();
      fadeAnim.setValue(1);
      contentOpacity.setValue(0);
    };
  }, []);

  const handleAmenityPress = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setModalVisible(true);
    getPlaceDetails(amenity.placeId);
  };

  // Animate modal when visibility changes
  useEffect(() => {
    if (modalVisible) {
      Animated.timing(modalAnimation, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }).start();
    } else {
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }).start();
    }
  }, [modalVisible, modalAnimation]);

  // Animate photo modal when expanded photo changes
  useEffect(() => {
    if (expandedPhoto) {
      Animated.timing(photoModalAnimation, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }).start();
    } else {
      Animated.timing(photoModalAnimation, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }).start();
    }
  }, [expandedPhoto, photoModalAnimation]);

  useEffect(() => {
    const fetchDistance = async () => {
      if (origin && destination) {
        try {
          // Origin and destination must be in [latitude, longitude] format
          console.log(`PlaceInfoBox distance calculation for ${name}:`);
          console.log(`Origin [lat, lng]: ${origin[0]}, ${origin[1]}`);
          console.log(
            `Destination [lat, lng]: ${destination[0]}, ${destination[1]}`
          );

          // Validate coordinates
          const isValidLat = (lat: number) => Math.abs(lat) <= 90;
          const isValidLng = (lng: number) => Math.abs(lng) <= 180;

          if (!isValidLat(origin[0]) || !isValidLng(origin[1])) {
            console.error("Invalid origin coordinates");
            setDistance("Invalid origin");
            setDuration("Invalid origin");
            return;
          }

          if (!isValidLat(destination[0]) || !isValidLng(destination[1])) {
            console.error("Invalid destination coordinates");
            setDistance("Invalid destination");
            setDuration("Invalid destination");
            return;
          }

          // Call the API with coordinates in [latitude, longitude] format
          const result = await calculateDrivingDistanceAndTime(
            origin,
            destination
          );

          setDistance(result.distance);
          setDuration(result.duration);
        } catch (error) {
          console.error("Error calculating distance:", error);
          setDistance("Error calculating");
          setDuration("Error calculating");
        }
      } else {
        console.warn("Missing origin or destination coordinates");
        setDistance("Missing coordinates");
        setDuration("Missing coordinates");
      }
    };

    fetchDistance();
  }, [origin, destination]);

  // Separate useEffect for amenities that only runs when filters or nearbyPlaces change
  useEffect(() => {
    const processAmenities = async () => {
      try {
        console.log("Processing amenities with filters:", selectedAmenities);

        // Determine if we need to reload data or just filter existing data
        const needsDataReload =
          nearbyPlaces.length > 0 || allAmenitiesRef.current.length === 0;

        if (needsDataReload) {
          // We need to load new data either from nearbyPlaces or API
          setLoading(true);
          // Only show spinner after a short delay
          loadingTimerRef.current = setTimeout(() => {
            setShowLoadingSpinner(true);
          }, 300);

          // If we have nearbyPlaces from the parent component, use those and avoid API calls
          let foundAmenities = [...nearbyPlaces];

          // Only make a new API call if we don't have nearbyPlaces passed in AND have no cached data
          if (
            nearbyPlaces.length === 0 &&
            allAmenitiesRef.current.length === 0 &&
            destination
          ) {
            console.log("No nearby places provided, fetching from API...");
            const lat = destination[0];
            const lon = destination[1];

            // When no specific amenities are selected, get all possible amenity types
            const amenityTypesToFetch = Object.keys(googleTypes);

            foundAmenities = await checkNearbyAmenities(
              lat,
              lon,
              amenityTypesToFetch
            );
          }

          // Type mapping to handle different naming conventions from Google Places API
          const typeMapping = amenityTypeMapping;

          const filteredAmenities = foundAmenities
            .filter(
              (place: any) =>
                place.placeId !== null && place.placeId !== undefined
            )
            .map((place: any) => {
              // Use matchingAmenityTypes if available (from fetchEVChargers)
              const existingMatchingTypes = place.matchingAmenityTypes || [];

              // Find all matching amenity types for this place if not already determined
              const matchingTypes: string[] =
                existingMatchingTypes.length > 0 ? existingMatchingTypes : [];

              // Only compute matchingTypes if we don't already have them
              if (
                matchingTypes.length === 0 &&
                place.types &&
                place.types.length > 0
              ) {
                // Check this place's types against our expanded mapping
                for (const [amenityType, googleTypesList] of Object.entries(
                  typeMapping
                )) {
                  // If any of this place's types match our mapping, add the amenity type
                  const hasMatchingType = place.types.some(
                    (placeType: string) =>
                      googleTypesList.includes(placeType.toLowerCase())
                  );

                  if (hasMatchingType) {
                    matchingTypes.push(amenityType);
                  }
                }
              }

              return {
                name: place.name,
                placeId: place.placeId,
                address: place.address,
                types: place.types,
                matchingTypes: matchingTypes,
                matchingAmenityTypes: existingMatchingTypes,
                emoji: place.emoji || "🏢",
                // Derive type from matchingTypes if available, or fallback to a default
                type:
                  matchingTypes.length > 0
                    ? matchingTypes[0]
                    : place.types && place.types.length > 0
                    ? place.types[0]
                    : "place",
              };
            })
            // Only keep places that match at least one defined amenity type
            .filter((place: any) => {
              const amenityTypes =
                place.matchingAmenityTypes || place.matchingTypes || [];
              return amenityTypes.some((type: string) => type in googleTypes);
            });

          // Store the full unfiltered list for future filter operations
          allAmenitiesRef.current = filteredAmenities;
        } else {
          // Using cached data, just update loading state for a brief moment
          animateContentChange(() => null);
        }

        // Filter the amenities based on selected filters
        let filteredAmenities = allAmenitiesRef.current;
        if (selectedAmenities.length > 0) {
          filteredAmenities = allAmenitiesRef.current.filter(
            (amenity: Amenity) => {
              const amenityTypes =
                amenity.matchingAmenityTypes || amenity.matchingTypes || [];
              return amenityTypes.some((type) =>
                selectedAmenities.includes(type)
              );
            }
          );
        } else {
          // When no filters are applied, sort amenities by their type
          filteredAmenities = [...allAmenitiesRef.current].sort((a, b) => {
            const aTypes = a.matchingAmenityTypes || a.matchingTypes || [];
            const bTypes = b.matchingAmenityTypes || b.matchingTypes || [];

            // First sort by the first matching type
            if (aTypes.length > 0 && bTypes.length > 0) {
              return aTypes[0].localeCompare(bTypes[0]);
            }

            // If one has types and the other doesn't, prioritize the one with types
            if (aTypes.length > 0) return -1;
            if (bTypes.length > 0) return 1;

            // Finally, sort by name if no other criteria apply
            return a.name.localeCompare(b.name);
          });
        }

        console.log(
          `✅ Filtered ${filteredAmenities.length} from ${allAmenitiesRef.current.length} total amenities`
        );

        // Clear any pending timer and update states
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }

        // Use animation when updating amenities to prevent flicker
        animateContentChange(() => {
          setAmenities(filteredAmenities);
          setLoading(false);
          setShowLoadingSpinner(false);
        });
      } catch (error) {
        console.error("Error processing amenities:", error);

        // Clean up timer if there's an error
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }

        setAmenities([]);
        setLoading(false);
        setShowLoadingSpinner(false);
      }
    };

    processAmenities();

    // Only clean up the timer when this effect is cleaned up
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [selectedAmenities, nearbyPlaces]);

  const getPlaceDetails = async (placeId: string) => {
    if (!placeId) {
      console.error("Error: Invalid placeId received for fetching details.");
      return;
    }

    setDetailsLoading(true);
    try {
      console.log(`Fetching details for placeId: ${placeId}`);

      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=name,rating,reviews,formatted_address,photos,opening_hours`;

      console.log(`Google API Request URL: ${url}`);

      const response = await fetch(url);
      const data = await response.json();

      console.log("API Response:", JSON.stringify(data, null, 2));

      if (!data.result) {
        console.error(
          "API Error: No place details found. Status:",
          data.status,
          "Message:",
          data.error_message
        );
        setPlaceDetails(null);
        return;
      }

      const details: PlaceDetails = {
        name: data.result.name,
        address: data.result.formatted_address || "No address available",
        rating: data.result.rating,
        reviews: data.result.reviews || [],
        photos:
          data.result.photos?.map(
            (photo: any) =>
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
          ) || [],
        opening_hours: data.result.opening_hours || { weekday_text: [] },
      };

      setPlaceDetails(details);
    } catch (error) {
      console.error("Error fetching place details:", error);
      setPlaceDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <>
      <Animated.View style={[styles.infoBox, { opacity: contentOpacity }]}>
        <Text style={styles.placeName}>{name}</Text>
        <Text style={styles.distance}>
          Distance: {distance}, {duration}
        </Text>

        <Text style={styles.sectionTitle}>
          {selectedAmenities.length > 0
            ? `Nearby ${selectedAmenities
                .map((a) => a.charAt(0).toUpperCase() + a.slice(1))
                .join(" / ")} Only`
            : "All Nearby Amenities"}
        </Text>

        <Animated.View style={{ opacity: fadeAnim, flex: 1, minHeight: 90 }}>
          {loading ? (
            <View
              style={{
                padding: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {showLoadingSpinner && (
                <ActivityIndicator size="small" color="#007AFF" />
              )}
            </View>
          ) : amenities.length > 0 ? (
            <>
              {/* Amenity Filter Info Section */}
              {selectedAmenities.length > 0 && (
                <View style={styles.amenityFilterInfo}>
                  <Text style={styles.amenityFilterInfo}>
                    {amenities.some(
                      (a) =>
                        (a.matchingAmenityTypes || a.matchingTypes || [])
                          .length > 0
                    )
                      ? `Found: ${Array.from(
                          // Use Set to ensure uniqueness
                          new Set(
                            amenities.flatMap((a) => {
                              // Handle both new and old property names
                              const matchingTypes =
                                a.matchingAmenityTypes || a.matchingTypes || [];
                              return matchingTypes.filter(
                                (type: string) =>
                                  type &&
                                  type in googleTypes &&
                                  selectedAmenities.includes(type)
                              );
                            })
                          )
                        )
                          .map(formatTypeForDisplay)
                          .join(", ")}`
                      : "No selected amenities found nearby"}
                  </Text>
                </View>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.amenitiesScroll}
              >
                {amenities.map((amenity, index) => {
                  // Handle both new matchingAmenityTypes and old matchingTypes for compatibility
                  const matchingTypes =
                    amenity.matchingAmenityTypes || amenity.matchingTypes || [];
                  const hasMatchingTypes = matchingTypes.length > 0;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.amenityBox,
                        // Highlight amenities that match the selected filters
                        selectedAmenities.length > 0 &&
                        hasMatchingTypes &&
                        matchingTypes.some((type) =>
                          selectedAmenities.includes(type)
                        )
                          ? styles.highlightedAmenityBox
                          : {},
                      ]}
                      onPress={() => handleAmenityPress(amenity)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.amenityText}>{amenity.name}</Text>
                      {hasMatchingTypes && (
                        <Text style={styles.amenityTypeText}>
                          {Array.from(
                            new Set(
                              matchingTypes.filter(
                                (type) =>
                                  type &&
                                  type in googleTypes &&
                                  (selectedAmenities.length === 0 ||
                                    selectedAmenities.includes(type))
                              )
                            )
                          )
                            .map(formatTypeForDisplay)
                            .join(", ")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : selectedAmenities.length > 0 ? (
            <Text style={{ textAlign: "center", color: "#666666" }}>
              {`No matching ${selectedAmenities
                .map((a) => a.charAt(0).toUpperCase() + a.slice(1))
                .join(" or ")} found nearby`}
            </Text>
          ) : (
            <Text style={{ textAlign: "center", color: "#666666" }}>
              No amenities found nearby
            </Text>
          )}
        </Animated.View>

        <Modal
          visible={modalVisible}
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
          animationType="none"
        >
          <Animated.View
            style={[
              styles.PlaceModalContainer,
              {
                opacity: modalAnimation,
                transform: [
                  {
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.PlaceModalContent,
                {
                  transform: [
                    {
                      translateY: modalAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {detailsLoading ? (
                <ActivityIndicator size="large" color="#007AFF" />
              ) : placeDetails ? (
                <>
                  <Text style={styles.PlaceModalTitle}>
                    {placeDetails.name}
                  </Text>
                  <Text style={styles.PlaceModalAddress}>
                    {placeDetails.address}
                  </Text>
                  {placeDetails?.rating && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginVertical: 5,
                      }}
                    >
                      <Text style={styles.rating}>
                        Rating: {placeDetails.rating} / 5
                      </Text>
                    </View>
                  )}

                  {(placeDetails?.photos?.length ?? 0) > 0 && (
                    <View style={{ width: "100%" }}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { marginTop: 10, alignSelf: "flex-start" },
                        ]}
                      >
                        Photos
                      </Text>
                      <ScrollView horizontal style={styles.photosContainer}>
                        {placeDetails?.photos?.map((photoUrl, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => setExpandedPhoto(photoUrl)}
                          >
                            <Image
                              source={{ uri: photoUrl }}
                              style={styles.photo}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {(placeDetails?.reviews?.length ?? 0) > 0 && (
                    <View style={{ width: "100%" }}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          { marginTop: 5, alignSelf: "flex-start" },
                        ]}
                      >
                        Reviews
                      </Text>
                      <ScrollView style={styles.reviewsContainer}>
                        {placeDetails?.reviews?.map((review, index) => (
                          <View key={index} style={styles.reviewItem}>
                            <Text style={styles.reviewAuthor}>
                              {review.author_name}:
                            </Text>
                            <Text style={styles.reviewText}>{review.text}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              ) : (
                <Text>No details available.</Text>
              )}

              <TouchableOpacity
                style={styles.PlaceModalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.PlaceModalCloseText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>
        <Modal
          visible={!!expandedPhoto}
          transparent={true}
          onRequestClose={() => setExpandedPhoto(null)}
          animationType="none"
        >
          <Animated.View
            style={[
              styles.expandedPhotoContainer,
              {
                opacity: photoModalAnimation,
              },
            ]}
          >
            <Pressable
              style={{
                width: "100%",
                height: "100%",
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => setExpandedPhoto(null)}
            >
              {expandedPhoto && (
                <Animated.Image
                  source={{ uri: expandedPhoto }}
                  style={[
                    styles.expandedPhoto,
                    {
                      transform: [
                        {
                          scale: photoModalAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}
            </Pressable>
          </Animated.View>
        </Modal>
      </Animated.View>
    </>
  );
};
