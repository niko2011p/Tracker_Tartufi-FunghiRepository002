export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${(distanceKm * 1000).toFixed(0)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

export const formatDuration = (durationMin: number): string => {
  const hours = Math.floor(durationMin / 60);
  const minutes = Math.floor(durationMin % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}; 