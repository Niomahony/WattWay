import { useState, useMemo } from "react";

export interface FiltersState {
  chargingSpeed: string | null;
  minRating: number | null;
  brand: string[];
  connectorType: string | null;
  amenities: string[];
  availableOnly: boolean;
}

export const useFilters = () => {
  const [filters, setFilters] = useState<FiltersState>({
    chargingSpeed: null,
    minRating: null,
    brand: [],
    connectorType: null,
    amenities: [],
    availableOnly: false,
  });

  // Memoize the filters object to prevent unnecessary re-renders
  const filtersMemo = useMemo(() => filters, [filters]);

  const toggleAmenity = (amenity: string) => {
    const updatedAmenities = filtersMemo.amenities.includes(amenity)
      ? filtersMemo.amenities.filter((item) => item !== amenity)
      : [...filtersMemo.amenities, amenity];
    setFilters({ ...filtersMemo, amenities: updatedAmenities });
  };

  const clearAllAmenities = () => {
    setFilters({ ...filtersMemo, amenities: [] });
  };

  return {
    filters: filtersMemo,
    setFilters,
    toggleAmenity,
    clearAllAmenities,
  };
};
