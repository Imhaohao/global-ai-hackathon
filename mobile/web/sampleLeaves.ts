// Held-out test images the model never trained on, three per condition so a tree can reach the
// three-leaf agreement the plant vote needs. BRACOL (studio) and RoCoLe (field) are CC BY 4.0;
// see docs/data-card.md.
export type SampleCondition = { key: string; label: string; images: number[] };

export const SAMPLE_CONDITIONS: SampleCondition[] = [
  {
    key: 'rust',
    label: 'Leaf rust',
    images: [require('./samples/rust-1.jpg'), require('./samples/rust-2.jpg'), require('./samples/rust-3.jpg')],
  },
  {
    key: 'phoma',
    label: 'Phoma',
    images: [require('./samples/phoma-1.jpg'), require('./samples/phoma-2.jpg'), require('./samples/phoma-3.jpg')],
  },
  {
    key: 'miner',
    label: 'Leaf miner',
    images: [require('./samples/miner-1.jpg'), require('./samples/miner-2.jpg'), require('./samples/miner-3.jpg')],
  },
  {
    key: 'healthy',
    label: 'Healthy',
    images: [require('./samples/healthy-1.jpg'), require('./samples/healthy-2.jpg'), require('./samples/healthy-3.jpg')],
  },
];
