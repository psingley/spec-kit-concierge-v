export type ScoreInput = {
  elementFailures: number;
  structureFailures: number;
  styleFailures: number;
  pixelResidual: number;
};

export const scoreScreen = (input: ScoreInput): number =>
  Math.min(100, Math.round(input.elementFailures * 30 + input.structureFailures * 8 + input.styleFailures * 5 + input.pixelResidual));
