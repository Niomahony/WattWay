import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";

interface AmenityDetails {
  name?: string;
  address?: string;
  rating?: number;
  reviews?: Array<{
    author_name: string;
    text: string;
  }>;
  photos?: string[];
  opening_hours?: {
    weekday_text: string[];
  };
}

interface AmenityModalProps {
  visible: boolean;
  onClose: () => void;
  amenityDetails: AmenityDetails | null;
  loading: boolean;
  onPhotoPress: (photoUrl: string) => void;
}

export default function AmenityModal({
  visible,
  onClose,
  amenityDetails,
  loading,
  onPhotoPress,
}: AmenityModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalContainer}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{amenityDetails?.name}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : amenityDetails ? (
            <ScrollView
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <Text style={styles.chargerAddress}>
                {amenityDetails.address}
              </Text>
              {amenityDetails?.rating && (
                <Text style={styles.rating}>
                  Rating: {amenityDetails.rating} / 5
                </Text>
              )}
              {(amenityDetails?.reviews?.length ?? 0) > 0 && (
                <ScrollView
                  style={styles.reviewsContainer}
                  nestedScrollEnabled={true}
                >
                  {amenityDetails?.reviews?.map((review, index) => (
                    <View key={index} style={styles.reviewItem}>
                      <Text style={styles.reviewAuthor}>
                        {review.author_name}:
                      </Text>
                      <Text style={styles.reviewText}>{review.text}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
              {(amenityDetails?.photos?.length ?? 0) > 0 && (
                <ScrollView
                  horizontal
                  style={styles.photosContainer}
                  nestedScrollEnabled={true}
                >
                  {amenityDetails?.photos?.map((photoUrl, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => onPhotoPress(photoUrl)}
                    >
                      <Image source={{ uri: photoUrl }} style={styles.photo} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </ScrollView>
          ) : (
            <Text style={styles.noAmenities}>No details available</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "500",
  },
  chargerAddress: {
    fontSize: 16,
    color: "#CCCCCC",
    marginBottom: 16,
  },
  rating: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 12,
  },
  reviewsContainer: {
    maxHeight: 200,
    marginVertical: 12,
  },
  reviewItem: {
    backgroundColor: "#2C2C2C",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewAuthor: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginBottom: 4,
  },
  reviewText: {
    color: "#CCCCCC",
    fontSize: 14,
  },
  photosContainer: {
    marginVertical: 12,
  },
  photo: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginRight: 8,
  },
  noAmenities: {
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
  },
});
