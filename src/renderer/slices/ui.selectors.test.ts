import { describe, expect, it } from 'vitest';
import { createProductStore } from '../store';
import { artifactViewerOpened } from './ui';
import {
  selectUiArtifactViewerOrigin,
  selectUiArtifactViewerPath,
  selectUiShowArtifactViewer
} from './ui.selectors';

describe('ui file-display selectors', () => {
  it('selects shared artifact viewer state from the product store', () => {
    const store = createProductStore();

    store.dispatch(artifactViewerOpened({ path: 'spec.md', origin: 'passive' }));
    const state = store.getState();

    expect(selectUiShowArtifactViewer(state)).toBe(true);
    expect(selectUiArtifactViewerPath(state)).toBe('spec.md');
    expect(selectUiArtifactViewerOrigin(state)).toBe('passive');
  });
});
