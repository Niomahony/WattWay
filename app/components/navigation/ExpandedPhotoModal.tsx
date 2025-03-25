import React from "react";
import { StyleSheet, Modal, Pressable, Image } from "react-native";

interface ExpandedPhotoModalProps {
  photoUrl: string | null;
  onClose: () => void;
}

export default function ExpandedPhotoModal({
  photoUrl,
  onClose,
}: ExpandedPhotoModalProps) {
  return (
    <Modal
      visible={!!photoUrl}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.expandedPhotoContainer} onPress={onClose}>
        {photoUrl && (
          <Image source={{ uri: photoUrl }} style={styles.expandedPhoto} />
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  expandedPhotoContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  expandedPhoto: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});
