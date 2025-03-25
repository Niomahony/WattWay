import { Coordinates } from "../../types/map";

export const convertToMapboxCoordinates = (
  lat: number,
  lng: number
): Coordinates => {
  return [lng, lat];
};

export const convertFromMapboxCoordinates = (
  lng: number,
  lat: number
): Coordinates => {
  return [lat, lng];
};

export const areCoordinatesEqual = (
  coord1: Coordinates,
  coord2: Coordinates
): boolean => {
  return (
    Math.abs(coord1[0] - coord2[0]) < 0.0001 &&
    Math.abs(coord1[1] - coord2[1]) < 0.0001
  );
};
