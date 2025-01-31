import React, { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
} from "react-native";
import { fetchPlaceDetails, fetchSuggestions } from "../api/googlePlaces";
import { styles } from "../styles/styles";

interface SearchBarProps {
  onSuggestionSelect: (location: {
    name: string;
    coordinates: [number, number];
  }) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSuggestionSelect }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: string; place_name: string }[]
  >([]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      const results = await fetchSuggestions(query);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (placeId: string) => {
    const placeDetails = await fetchPlaceDetails(placeId);
    if (placeDetails) {
      onSuggestionSelect({
        name: placeDetails.name,
        coordinates: placeDetails.coordinates as [number, number],
      });
      setSearchQuery(placeDetails.name);
      setSuggestions([]);
    }
  };

  return (
    <View style={styles.searchBar}>
      <TextInput
        placeholder="Search for a location..."
        value={searchQuery}
        onChangeText={handleSearch}
      />
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelectSuggestion(item.id)}>
              <Text style={styles.suggestionItem}>{item.place_name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};
