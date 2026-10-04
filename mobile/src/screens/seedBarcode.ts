export type SeedPacket = { variety: string; lot: string; packedOn: string };

export type SeedScanResult =
  | { kind: 'genuine'; packet: SeedPacket }
  | { kind: 'recalled'; packet: SeedPacket }
  | { kind: 'unknown'; code: string };

type RegisteredPacket = { status: 'genuine' | 'recalled'; packet: SeedPacket };

export const DEMO_SEED_BARCODES = {
  genuine: 'SEED-BT-260417',
  recalled: 'SEED-RU-250923',
} as const;

const DEMO_SEED_REGISTRY: Record<string, RegisteredPacket> = {
  [DEMO_SEED_BARCODES.genuine]: {
    status: 'genuine',
    packet: { variety: 'Batian', lot: 'BT-2604-17', packedOn: '2026-04-17' },
  },
  [DEMO_SEED_BARCODES.recalled]: {
    status: 'recalled',
    packet: { variety: 'Ruiru 11', lot: 'RU-2509-23', packedOn: '2025-09-23' },
  },
};

export const SEED_BARCODE_TYPES = ['code128', 'ean13', 'qr'] as const;

export function lookUpSeedBarcode(scanned: string): SeedScanResult {
  const code = scanned.trim().toUpperCase();
  const registered = DEMO_SEED_REGISTRY[code];
  if (!registered) return { kind: 'unknown', code };
  return { kind: registered.status, packet: registered.packet };
}
