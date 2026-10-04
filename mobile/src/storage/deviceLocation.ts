import * as Location from 'expo-location';

export type DeviceLocation = { latitude: number; longitude: number; accuracyMeters?: number };

const FIX_TIMEOUT_MS = 8000;

function toDeviceLocation(position: Location.LocationObject | null): DeviceLocation | null {
  if (!position) return null;
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy ?? undefined,
  };
}

function timeoutAfter(milliseconds: number): Promise<null> {
  return new Promise((resolve) => setTimeout(() => resolve(null), milliseconds));
}

export async function askForLocationPermission(): Promise<boolean> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    return permission.granted;
  } catch {
    return false;
  }
}

async function hasLocationPermission(): Promise<boolean> {
  const permission = await Location.getForegroundPermissionsAsync();
  return permission.granted;
}

export async function readCurrentLocation(): Promise<DeviceLocation | null> {
  try {
    if (!(await hasLocationPermission())) return null;
    const fresh = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const position = await Promise.race([fresh, timeoutAfter(FIX_TIMEOUT_MS)]);
    return toDeviceLocation(position ?? (await Location.getLastKnownPositionAsync()));
  } catch {
    return null;
  }
}

export async function readLastKnownLocation(): Promise<DeviceLocation | null> {
  try {
    if (!(await hasLocationPermission())) return null;
    return toDeviceLocation(await Location.getLastKnownPositionAsync());
  } catch {
    return null;
  }
}
