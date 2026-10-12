export type Nearby = { latitude: number; longitude: number; radiusKm: number };
export function parseNearby(value: unknown): Nearby | null {
  if (value == null) return null;
  if (typeof value !== 'object') throw new Error('Invalid location');
  const v = value as Record<string, unknown>;
  const numeric = (n: unknown) => (typeof n === 'number' || (typeof n === 'string' && n.trim() !== '')) && Number.isFinite(Number(n));
  if (!numeric(v.latitude) || !numeric(v.longitude) || (v.radiusKm !== undefined && !numeric(v.radiusKm))) throw new Error('Invalid coordinates or radius');
  const latitude = Number(v.latitude), longitude = Number(v.longitude), radiusKm = v.radiusKm === undefined ? 5 : Number(v.radiusKm);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || radiusKm <= 0 || radiusKm > 100) throw new Error('Coordinates out of range or radius outside (0, 100] km');
  return { latitude, longitude, radiusKm };
}
export const wantsNearby = (text: string) => /quanh đây|quanh day|gần đây|gan day|gần tôi|gan toi|quanh tôi|quanh toi|near me|nearby|around me|bán kính|ban kinh|\bkm\b/i.test(text);
export function radiusFromText(text: string): number | undefined {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*km\b/i);
  return match ? Number(match[1].replace(',', '.')) : undefined;
}
