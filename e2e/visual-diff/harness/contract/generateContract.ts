import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { JSXAttribute, JSXElement, JSXExpressionContainer, JSXText, Node } from '@babel/types';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { screenByName, screens } from '../screens.config';
import { contractsDir } from '../paths';

export type RequiredText = { value: string; note?: string };
export type RequiredHeading = { level: number; text: string };
export type RequiredControl = { role: 'button'; name: string; count: number };
export type RequiredVisualMarker = { name: string; selector: string; designSelector: string };
export type StyleSample = {
  name: string;
  designSelector: string;
  shippedSelector: string;
  properties: string[];
  tolerance?: number;
};
export type VisualDiffContract = {
  name: string;
  designPath: string;
  primaryRegion: { designSelector: string; shippedSelector: string };
  required: {
    texts: RequiredText[];
    headings: RequiredHeading[];
    controls: RequiredControl[];
    visualMarkers: RequiredVisualMarker[];
  };
  styleSamples: StyleSample[];
  pixel: { maxDiffPercent: number; warnDiffPercent?: number };
};

const markerPatterns = [/signin-mark/, /brand-orb/, /spinner/, /activity-glyph/, /ap-spinner/, /pulse-dot/];
const textNoise = new Set(['✓', '×', '›', '…', '']);

const textFromNode = (node: Node | null | undefined): string => {
  if (!node) return '';
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'JSXText') return node.value;
  if (node.type === 'JSXExpressionContainer') return textFromNode(node.expression);
  if (node.type === 'TemplateLiteral') return node.quasis.map((quasi) => quasi.value.cooked ?? '').join(' ');
  return '';
};

const attrValue = (element: JSXElement, name: string): string => {
  const attr = element.openingElement.attributes.find(
    (entry): entry is JSXAttribute => entry.type === 'JSXAttribute' && entry.name.type === 'JSXIdentifier' && entry.name.name === name
  );
  if (!attr) return '';
  if (!attr.value) return 'true';
  if (attr.value.type === 'StringLiteral') return attr.value.value;
  if (attr.value.type === 'JSXExpressionContainer') return expressionText(attr.value);
  return '';
};

const expressionText = (container: JSXExpressionContainer): string => {
  const expression = container.expression;
  if (expression.type === 'StringLiteral') return expression.value;
  if (expression.type === 'TemplateLiteral') return expression.quasis.map((quasi) => quasi.value.cooked ?? '').join(' ');
  return '';
};

const collectText = (element: JSXElement): string => {
  const parts: string[] = [];
  const visit = (node: Node): void => {
    if (node.type === 'JSXText') parts.push((node as JSXText).value);
    if (node.type === 'JSXExpressionContainer') parts.push(textFromNode(node));
    if (node.type === 'JSXElement') node.children.forEach(visit);
  };
  element.children.forEach(visit);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const elementName = (element: JSXElement): string => {
  const name = element.openingElement.name;
  return name.type === 'JSXIdentifier' ? name.name : '';
};

const guessPrimaryRegion = (screenName: string): { designSelector: string; shippedSelector: string } => {
  if (screenName.startsWith('signin')) return { designSelector: '.signin-card', shippedSelector: '.signin-card' };
  if (screenName.includes('modal')) return { designSelector: '.modal', shippedSelector: '.modal' };
  if (screenName.startsWith('activity-rail')) return { designSelector: '.activity', shippedSelector: '.activity' };
  if (screenName.startsWith('activity-pill')) return { designSelector: '.activity-pill', shippedSelector: '.activity-pill' };
  if (screenName.startsWith('workspace-titlebar')) return { designSelector: '.titlebar', shippedSelector: '.titlebar' };
  if (screenName === 'workspace-shell-layout') return { designSelector: '.app', shippedSelector: '.workspace' };
  if (screenName.startsWith('stepper')) return { designSelector: '.stepper', shippedSelector: '.stepper' };
  return { designSelector: 'body', shippedSelector: 'body' };
};

export const parseCommentedJson = (source: string): unknown =>
  JSON.parse(source.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''));

export const extractContractFromSource = (screenName: string, designPath: string, source: string): VisualDiffContract => {
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const texts = new Set<string>();
  const headings: RequiredHeading[] = [];
  const controls = new Map<string, number>();
  const markers = new Map<string, RequiredVisualMarker>();

  traverse(ast, {
    JSXElement(path) {
      const element = path.node;
      const name = elementName(element);
      const text = collectText(element);
      if (text && text.length > 1 && !textNoise.has(text)) texts.add(text);
      if (/^h[1-6]$/.test(name) && text) headings.push({ level: Number(name.slice(1)), text });
      if (name === 'button' && text) controls.set(text, (controls.get(text) ?? 0) + 1);
      const className = attrValue(element, 'className');
      for (const pattern of markerPatterns) {
        const match = className.match(pattern);
        if (match?.[0]) {
          const markerName = match[0];
          markers.set(markerName, {
            name: markerName,
            selector: `[data-vd-role="${markerName}"]`,
            designSelector: `.${markerName}`
          });
        }
      }
    }
  });

  for (const heading of headings) texts.delete(heading.text);
  for (const control of controls.keys()) texts.delete(control);

  return {
    name: screenName,
    designPath,
    primaryRegion: guessPrimaryRegion(screenName),
    required: {
      texts: [...texts].sort().map((value) => ({ value })),
      headings,
      controls: [...controls.entries()].map(([name, count]) => ({ role: 'button', name, count })),
      visualMarkers: [...markers.values()]
    },
    styleSamples: [],
    pixel: { maxDiffPercent: 4, warnDiffPercent: 2.5 }
  };
};

export const writeContract = async (screenName: string): Promise<void> => {
  const screen = screenByName(screenName);
  const source = await readFile(path.join(process.cwd(), screen.designPath), 'utf8');
  const contract = extractContractFromSource(screen.name, screen.designPath, source);
  await mkdir(contractsDir, { recursive: true });
  const body = `// Generated from ${screen.designPath}. Reviewed contract: required items are the source of truth.\n${JSON.stringify(contract, null, 2)}\n`;
  await writeFile(path.join(contractsDir, `${screen.name}.contract.json`), body);
};

const cliNames = process.argv.slice(2);
if (process.env.npm_lifecycle_event === 'vd:generate-contract') {
  const selected = cliNames.length > 0 ? cliNames : screens.map((screen) => screen.name);
  for (const name of selected) await writeContract(name);
}
