import React, { useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { Searchbar, useTheme } from "react-native-paper";
import { fetchPlaceDetails, fetchSuggestions } from "../../api/mapApi";
import { styles as baseStyles } from "../../styles/styles";
import MapboxGL from "@rnmapbox/maps";

interface SearchBarProps {
  onSuggestionSelect: (location: {
    name: string;
    coordinates: [number, number];
  }) => void;
  cameraRef: React.RefObject<MapboxGL.Camera>;
}

interface Suggestion {
  id: string;
  place_name: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

const styles = StyleSheet.create({
  ...baseStyles,
  searchContainer: {
    position: "relative",
    zIndex: 1,
    paddingTop: 8,
    alignItems: "center",
    width: "100%",
  },
  searchBar: {
    backgroundColor: "white",
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 56,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  suggestionsList: {
    backgroundColor: "white",
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 300,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 11,
    position: "absolute",
    top: 64,
    width: "90%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  suggestionItemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionMainText: {
    fontSize: 16,
    color: "#202124",
    fontWeight: "500",
    marginBottom: 4,
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: "#5F6368",
    lineHeight: 20,
  },
  suggestionText: {
    fontSize: 16,
    color: "#202124",
    lineHeight: 24,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: "#5F6368",
    textAlign: "center",
  },
});

export const SearchBar: React.FC<SearchBarProps> = ({
  onSuggestionSelect,
  cameraRef,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      setIsLoading(true);
      try {
        const results = await fetchSuggestions(query);
        setSuggestions(results);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (placeId: string) => {
    setIsLoading(true);
    try {
      const placeDetails = await fetchPlaceDetails(placeId);
      if (placeDetails) {
        const selectedLocation = {
          name: placeDetails.name,
          coordinates: placeDetails.coordinates as [number, number],
        };

        onSuggestionSelect(selectedLocation);
        setSearchQuery(placeDetails.name);
        setSuggestions([]);

        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: selectedLocation.coordinates,
            zoomLevel: 14,
            animationDuration: 1000,
          });
        }
      }
    } catch (error) {
      console.error("Error selecting suggestion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSuggestionItem = ({ item }: { item: Suggestion }) => {
    if (item.structured_formatting) {
      return (
        <TouchableOpacity
          style={styles.suggestionItemContainer}
          onPress={() => handleSelectSuggestion(item.id)}
        >
          <Text style={styles.suggestionMainText}>
            {item.structured_formatting.main_text}
          </Text>
          <Text style={styles.suggestionSecondaryText}>
            {item.structured_formatting.secondary_text}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.suggestionItemContainer}
        onPress={() => handleSelectSuggestion(item.id)}
      >
        <Text style={styles.suggestionText}>{item.place_name}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.noResultsContainer}>
      <Text style={styles.noResultsText}>
        {searchQuery.length > 2
          ? "No results found"
          : "Type at least 3 characters to search"}
      </Text>
    </View>
  );

  return (
    <View style={styles.searchContainer}>
      <Searchbar
        placeholder="Search for a location..."
        value={searchQuery}
        onChangeText={handleSearch}
        style={styles.searchBar}
        iconColor={theme.colors.primary}
        inputStyle={{ color: "#202124", fontSize: 16 }}
        loading={isLoading}
        elevation={0}
        placeholderTextColor="#5F6368"
      />
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={renderSuggestionItem}
          style={styles.suggestionsList}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={renderEmptyComponent}
        />
      )}
    </View>
  );
};
