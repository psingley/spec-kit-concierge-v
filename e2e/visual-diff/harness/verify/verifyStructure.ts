import type { DomNode } from '../contract/normalizeDom';
import type { VerificationFailure } from './verifyElements';

const missing = (expected: string[], actual: string[], label: string): VerificationFailure[] =>
  expected
    .filter((entry) => !actual.includes(entry))
    .slice(0, 10)
    .map((entry) => ({ layer: 'structure', message: `missing ${label} node: ${entry}`, expected: entry, actual: 'missing' }));

const structuralDom = (node: DomNode): string[] => [
  ...(node.marker ? [`marker|${node.marker}`] : []),
  ...node.children.flatMap(structuralDom)
];

export const verifyStructure = (designDom: DomNode, shippedDom: DomNode): VerificationFailure[] => [
  ...missing(structuralDom(designDom), structuralDom(shippedDom), 'DOM')
];
