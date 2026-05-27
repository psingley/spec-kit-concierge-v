import { readFile } from 'node:fs/promises';

export type AnnotatedFixtureLine = {
  direction: 'client->agent' | 'agent->client';
  wire: Record<string, unknown>;
};

export const parseAnnotatedAcpJsonl = (contents: string): AnnotatedFixtureLine[] =>
  contents
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const direction = parsed.direction;
      if (direction !== 'client->agent' && direction !== 'agent->client') {
        throw new Error('ACP fixture line is missing a valid direction annotation.');
      }

      delete parsed.direction;
      const wire = parsed;
      return { direction, wire };
    });

export const readAnnotatedAcpJsonl = async (fixturePath: string): Promise<AnnotatedFixtureLine[]> =>
  parseAnnotatedAcpJsonl(await readFile(fixturePath, 'utf8'));
