export const clusterChargers = (chargers: any[], zoomLevel: number) => {
  if (zoomLevel > 14) {
    return chargers.map((charger) => ({
      ...charger,
      cluster: false,
    }));
  }

  const clusters: any[] = [];
  const visited = new Set();

  for (let i = 0; i < chargers.length; i++) {
    if (visited.has(i)) continue;

    const cluster = [chargers[i]];
    visited.add(i);

    for (let j = i + 1; j < chargers.length; j++) {
      if (visited.has(j)) continue;

      const distance = haversineDistance(
        chargers[i].lat,
        chargers[i].lng,
        chargers[j].lat,
        chargers[j].lng
      );

      if (distance < 1) {
        cluster.push(chargers[j]);
        visited.add(j);
      }
    }

    clusters.push({
      lat: cluster.reduce((sum, c) => sum + c.lat, 0) / cluster.length,
      lng: cluster.reduce((sum, c) => sum + c.lng, 0) / cluster.length,
      chargers: cluster,
      cluster: true,
      id: `cluster-${i}`,
    });
  }

  return clusters;
};

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
