export type PieceType = 'bit' | 'ramp' | 'crossover' | 'interceptor' | 'gear' | 'gearbit';

export const PIECE_SIZES: Record<PieceType, { w: number; h: number }> = {
  bit:         { w: 24.3, h: 24.5 },
  ramp:        { w: 26.3, h: 18.1 },
  crossover:   { w: 31.7, h: 28.2 },
  interceptor: { w: 22.2, h: 15.4 },
  gear:        { w: 25.8, h: 26.4 },
  gearbit:     { w: 26.9, h: 27.6 },
};

export const PIECE_SCALE = 2.5;