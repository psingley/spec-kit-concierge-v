import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { actualDir, referencesDir } from '../paths';
import { loadContract } from '../contract/loadContract';
import type { AomNode } from '../contract/normalizeAom';
import type { DomNode } from '../contract/normalizeDom';
import type { CapturedStyleSample } from '../capture/snapshotStyles';
import { verifyRequiredElements, type CapturedElementState, type VerificationFailure } from './verifyElements';
import { verifyStructure } from './verifyStructure';
import { verifyStyles } from './verifyStyles';
import { verifyPixels } from './verifyPixels';
import { scoreScreen } from './score';

export type ScreenVerificationResult = {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  failures: VerificationFailure[];
  pixelResidual: number;
  priorityScore: number;
};

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, 'utf8')) as T;

const elementStateFromAom = (aom: AomNode | null, dom: DomNode): CapturedElementState => {
  const buttons = new Map<string, number>();
  const headings: Array<{ level: number; text: string }> = [];
  const textParts: string[] = [];
  const markers: string[] = [];
  const walkAom = (node: AomNode): void => {
    if (node.name) textParts.push(node.name);
    if (node.role === 'button' && node.name) buttons.set(node.name, (buttons.get(node.name) ?? 0) + 1);
    const headingLevel = node.role.match(/^heading(?: level (\d+))?$/)?.[1];
    if (node.role === 'heading' && node.name) headings.push({ level: headingLevel ? Number(headingLevel) : 1, text: node.name });
    node.children.forEach(walkAom);
  };
  const walkDom = (node: DomNode): void => {
    if (node.text) textParts.push(node.text);
    if (node.tag === 'button' && node.text) buttons.set(node.text, (buttons.get(node.text) ?? 0) + 1);
    if (node.marker) markers.push(node.marker);
    node.children.forEach(walkDom);
  };
  if (aom) walkAom(aom);
  walkDom(dom);
  return {
    text: textParts.join(' '),
    headings,
    controls: [...buttons.entries()].map(([name, count]) => ({ role: 'button', name, count })),
    markers
  };
};

export const verifyScreen = async (screenName: string): Promise<ScreenVerificationResult> => {
  const contract = await loadContract(screenName);
  const referenceDir = path.join(referencesDir, screenName);
  const shippedDir = path.join(actualDir, screenName);
  await mkdir(shippedDir, { recursive: true });
  const designDom = await readJson<DomNode>(path.join(referenceDir, 'design.dom.json'));
  const shippedDom = await readJson<DomNode>(path.join(shippedDir, 'shipped.dom.json'));
  const shippedAom = await readJson<AomNode | null>(path.join(shippedDir, 'shipped.aom.json'));
  const designStyles = await readJson<CapturedStyleSample[]>(path.join(referenceDir, 'design.styles.json'));
  const shippedStyles = await readJson<CapturedStyleSample[]>(path.join(shippedDir, 'shipped.styles.json'));
  const pixel = await verifyPixels(path.join(referenceDir, 'design.png'), path.join(shippedDir, 'shipped.png'), path.join(shippedDir, 'diff.png'));
  const failures = [
    ...verifyRequiredElements(contract, elementStateFromAom(shippedAom, shippedDom)),
    ...verifyStructure(designDom, shippedDom),
    ...verifyStyles(contract, designStyles, shippedStyles)
  ];
  if (pixel.diffPercent > contract.pixel.maxDiffPercent) {
    failures.push({
      layer: 'pixels',
      message: `cropped pixel residual ${pixel.diffPercent}% exceeds ${contract.pixel.maxDiffPercent}%`,
      expected: `${contract.pixel.maxDiffPercent}%`,
      actual: `${pixel.diffPercent}%`
    });
  }
  const priorityScore = scoreScreen({
    elementFailures: failures.filter((failure) => failure.layer === 'elements').length,
    structureFailures: failures.filter((failure) => failure.layer === 'structure').length,
    styleFailures: failures.filter((failure) => failure.layer === 'styles').length,
    pixelResidual: pixel.diffPercent
  });
  return {
    name: screenName,
    status: failures.length > 0 ? 'FAIL' : pixel.diffPercent > (contract.pixel.warnDiffPercent ?? contract.pixel.maxDiffPercent) ? 'WARN' : 'PASS',
    failures,
    pixelResidual: pixel.diffPercent,
    priorityScore
  };
};
