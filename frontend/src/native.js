import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function captureDeviceLocation() {
  try {
    let permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted') return null;
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
    const value = { lat: position.coords.latitude, lng: position.coords.longitude, capturedAt: Date.now() };
    localStorage.setItem('valor_location', JSON.stringify(value));
    return value;
  } catch {
    return null;
  }
}

export async function scheduleLocalReminder(title, at) {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return false;
    await LocalNotifications.schedule({ notifications: [{ id: Math.floor(Date.now() / 1000) % 2147483647, title: 'ValorBuddy Reminder', body: title, schedule: { at } }] });
    return true;
  } catch {
    return false;
  }
}

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}
