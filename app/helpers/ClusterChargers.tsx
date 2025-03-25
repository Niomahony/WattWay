import { Platform } from "react-native";

// Distance calculation using Haversine formula for accuracy
export const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Adaptive clustering based on zoom level and device performance
export const clusterChargers = (chargers: any[], zoomLevel: number) => {
  // If no chargers, return empty array
  if (!chargers || chargers.length === 0) {
    return [];
  }

  // At zoom level 14 or higher, don't cluster to show individual chargers
  if (zoomLevel >= 14) {
    console.log(
      `Zoom level ${zoomLevel.toFixed(
        2
      )} >= 14: Showing all individual chargers (${chargers.length})`
    );
    return chargers.map((charger) => ({
      ...charger,
      cluster: false,
      count: 1,
    }));
  }

  // Define clustering radius based on zoom level - exponentially larger at lower zoom levels
  // This creates more aggressive clustering when zoomed out
  let clusterRadius: number;

  if (zoomLevel < 8) {
    clusterRadius = 5.0; // Very large clusters at very low zoom
  } else if (zoomLevel < 10) {
    clusterRadius = 3.0; // Large clusters at low zoom
  } else if (zoomLevel < 12) {
    clusterRadius = 1.5; // Medium clusters at medium zoom
  } else if (zoomLevel < 13) {
    clusterRadius = 0.8; // Smaller clusters approaching individual view
  } else if (zoomLevel < 14) {
    clusterRadius = 0.4; // Minimal clustering just before individual view
  } else {
    clusterRadius = 0; // No clustering at zoom 14 or higher (shouldn't reach here due to early return)
  }

  console.log(
    `Clustering at zoom ${zoomLevel.toFixed(
      2
    )} with radius ${clusterRadius.toFixed(2)}km`
  );

  // Limit the maximum number of clusters for performance
  const maxClusters = Platform.OS === "android" ? 100 : 150;

  // Start with hierarchical clustering approach
  let remainingChargers = [...chargers];
  const clusters: any[] = [];

  // First pass: create initial clusters
  while (remainingChargers.length > 0 && clusters.length < maxClusters) {
    const seed = remainingChargers[0];
    const clusterChargers = [seed];
    let nearbyIndices: number[] = [];

    // Find all chargers within radius of this seed
    for (let i = 1; i < remainingChargers.length; i++) {
      const distance = haversineDistance(
        seed.lat,
        seed.lng,
        remainingChargers[i].lat,
        remainingChargers[i].lng
      );

      if (distance < clusterRadius) {
        clusterChargers.push(remainingChargers[i]);
        nearbyIndices.push(i);
      }
    }

    // Remove the clustered chargers from the remaining set (in reverse order to maintain indices)
    for (let i = nearbyIndices.length - 1; i >= 0; i--) {
      remainingChargers.splice(nearbyIndices[i], 1);
    }
    // Remove the seed
    remainingChargers.shift();

    // Create cluster or single charger point
    if (clusterChargers.length > 1) {
      // Calculate weighted center of the cluster
      const clusterCenter = calculateWeightedCenter(clusterChargers);

      clusters.push({
        ...clusterCenter,
        chargers: clusterChargers,
        cluster: true,
        count: clusterChargers.length,
        id: `cluster-${clusters.length}`,
      });
    } else {
      // Single charger, no clustering needed
      clusters.push({
        ...clusterChargers[0],
        cluster: false,
        count: 1,
        id: `charger-${clusters.length}`,
      });
    }
  }

  // If we reached the max clusters limit or have more than 75% of max clusters,
  // do a second pass to merge nearby clusters if zoom level is low
  if (
    remainingChargers.length > 0 ||
    (zoomLevel < 12 && clusters.length > maxClusters * 0.75)
  ) {
    // Adjust merge radius based on zoom level - at medium zoom levels, merge less aggressively
    const mergeMultiplier = zoomLevel < 10 ? 1.5 : 1.2;
    const mergedClusters = mergeClusters(
      clusters,
      remainingChargers,
      clusterRadius * mergeMultiplier
    );

    console.log(
      `Created ${mergedClusters.length} clusters from ${chargers.length} chargers`
    );
    return mergedClusters;
  }

  // Add remaining chargers as a final cluster if needed
  if (remainingChargers.length > 0) {
    const clusterCenter = calculateWeightedCenter(remainingChargers);

    clusters.push({
      ...clusterCenter,
      chargers: remainingChargers,
      cluster: true,
      count: remainingChargers.length,
      id: `cluster-remaining`,
    });
  }

  console.log(
    `Created ${clusters.length} clusters from ${chargers.length} chargers`
  );
  return clusters;
};

// Merge clusters that are close to each other
const mergeClusters = (
  clusters: any[],
  remainingChargers: any[],
  mergeRadius: number
) => {
  const mergedClusters: any[] = [];
  const processed = new Set();

  // First, add all remaining individual chargers to the clusters array
  const allPoints = [...clusters];
  remainingChargers.forEach((charger, index) => {
    allPoints.push({
      ...charger,
      cluster: false,
      count: 1,
      id: `remaining-${index}`,
      chargers: [charger],
    });
  });

  // Process each point to see if it forms a larger cluster
  for (let i = 0; i < allPoints.length; i++) {
    if (processed.has(i)) continue;

    const currentPoint = allPoints[i];
    const toMerge = [currentPoint];
    processed.add(i);

    // Find nearby clusters/points to merge
    for (let j = 0; j < allPoints.length; j++) {
      if (i === j || processed.has(j)) continue;

      const otherPoint = allPoints[j];
      const distance = haversineDistance(
        currentPoint.lat,
        currentPoint.lng,
        otherPoint.lat,
        otherPoint.lng
      );

      if (distance < mergeRadius) {
        toMerge.push(otherPoint);
        processed.add(j);
      }
    }

    if (toMerge.length > 1) {
      // Combine all chargers from the clusters being merged
      const allChargers = toMerge.flatMap((point) => point.chargers);
      const clusterCenter = calculateWeightedCenter(allChargers);

      mergedClusters.push({
        ...clusterCenter,
        chargers: allChargers,
        cluster: true,
        count: allChargers.length,
        id: `merged-${i}`,
      });
    } else {
      // Just add the single point/cluster
      mergedClusters.push(currentPoint);
    }
  }

  return mergedClusters;
};

// Calculate the weighted center of a cluster (gives more weight to higher rated chargers)
const calculateWeightedCenter = (chargers: any[]) => {
  // If there's a rating property, use it for weighting
  const hasRatings = chargers.some(
    (c) => c.rating !== undefined && c.rating !== null
  );

  if (hasRatings) {
    // Calculate weighted average based on ratings
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLng = 0;

    chargers.forEach((charger) => {
      // Default rating of 1 if none provided
      const weight = charger.rating ? charger.rating : 1;
      totalWeight += weight;
      weightedLat += charger.lat * weight;
      weightedLng += charger.lng * weight;
    });

    return {
      lat: weightedLat / totalWeight,
      lng: weightedLng / totalWeight,
    };
  } else {
    // Simple average if no ratings
    return {
      lat: chargers.reduce((sum, c) => sum + c.lat, 0) / chargers.length,
      lng: chargers.reduce((sum, c) => sum + c.lng, 0) / chargers.length,
    };
  }
};
