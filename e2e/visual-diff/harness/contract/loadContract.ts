import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { contractsDir } from '../paths';
import { parseCommentedJson, type VisualDiffContract } from './generateContract';

export const loadContract = async (screenName: string): Promise<VisualDiffContract> =>
  parseCommentedJson(await readFile(path.join(contractsDir, `${screenName}.contract.json`), 'utf8')) as VisualDiffContract;
