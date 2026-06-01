import { STEP_ARTIFACT_MANIFEST } from '../../hooks/manifest';
import { commitCandidate, factoryEscape, readRequiredArtifact } from './factoryUtils';
import type { StepContractContext, StepContractResult } from './types';

const hasHostileFrontmatter = (rawText: string): boolean => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(rawText);
  if (match === null) {
    return false;
  }

  return (match[1] ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => /^[A-Za-z0-9_-]+\s*:/.test(line));
};

const extractClarificationBody = (rawText: string): string | undefined => {
  const marker = /^## Clarifications\s*$/m.exec(rawText);
  if (marker === null) {
    return undefined;
  }

  const afterMarker = rawText.slice(marker.index + marker[0].length);
  const nextSection = /\n##\s+/.exec(afterMarker);
  return nextSection === null ? afterMarker : afterMarker.slice(0, nextSection.index);
};

// spec-kit's real clarify agent records single-line bullets under
// "## Clarifications / ### Session YYYY-MM-DD":
//   - Q: <question text> → A: <answer-or-Pending>
// Tolerate the unicode arrow the agent emits (→), the ASCII arrow (->), and
// en-dash / em-dash variants. A bullet that opens with "- Q:" but carries no
// "<arrow> A:" segment at all is genuinely broken.
const ARROW = String.raw`(?:->|→|–>|—>|‒>|⟶|⇒)`;
const QA_BULLET = new RegExp(String.raw`^\s*-\s*Q\s*:\s*(.+?)\s*${ARROW}\s*A\s*:\s*(.+?)\s*$`, 'i');
const Q_BULLET_OPENING = /^\s*-\s*Q\s*:/i;

export const validateClarifyArtifacts = async (
  featureDir: string,
  context: StepContractContext = {}
): Promise<StepContractResult> => {
  const rawText = await readRequiredArtifact(featureDir, 'spec.md');
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return factoryEscape();
  }
  if (hasHostileFrontmatter(rawText) || /MALFORMED/i.test(rawText)) {
    return factoryEscape();
  }

  const committable = (): StepContractResult => ({
    ok: true,
    commit: commitCandidate('clarify', [...STEP_ARTIFACT_MANIFEST.clarify.requiredFiles], context)
  });

  if (rawText.trim() === 'no questions needed') {
    return committable();
  }

  const clarificationBody = extractClarificationBody(rawText);
  // No Clarifications section at all -> nothing to clarify -> committable.
  if (clarificationBody === undefined) {
    return committable();
  }

  const bulletLines = clarificationBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Q_BULLET_OPENING.test(line));

  // Clarifications section present but no "- Q:" bullets (e.g. empty section,
  // prose-only, or the no-questions-needed flow) -> committable.
  if (bulletLines.length === 0) {
    return committable();
  }

  // Every "- Q:" bullet must carry a well-formed "<arrow> A:" segment. Pending
  // answers are advisory, not blocking. A "- Q:" with no answer segment is the
  // only genuinely broken shape we reject.
  const broken = bulletLines.some((line) => !QA_BULLET.test(line));
  if (broken) {
    return factoryEscape();
  }

  return committable();
};
