import React, { useState } from "react";
import { TextInput, FlatList, TouchableOpacity, Text } from "react-native";
import { fetchSuggestions } from "../api/googlePlaces";
import { styles } from "../styles/styles";

interface SearchBarProps {
  onSuggestionSelect: (placeId: string) => void;
  showSuggestions?: boolean;
}

export const SearchBar = ({ onSuggestionSelect }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    { id: string; place_name: string }[]
  >([]);

  const handleInputChange = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setSuggestions([]);
      return;
    }
    const results = await fetchSuggestions(query);
    setSuggestions(results);
  };

  const handleSuggestionSelect = (placeId: string, placeName: string) => {
    setSearchQuery(placeName);
    setSuggestions([]);
    onSuggestionSelect(placeId);
  };

  return (
    <>
      <TextInput
        style={styles.searchBar}
        placeholder="Search for a location"
        value={searchQuery}
        onChangeText={handleInputChange}
      />
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSuggestionSelect(item.id, item.place_name)}
            >
              <Text style={styles.suggestionItem}>{item.place_name}</Text>
            </TouchableOpacity>
          )}
          style={styles.suggestionsList}
        />
      )}
    </>
  );
};
