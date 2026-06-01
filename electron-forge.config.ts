import type { ForgeConfig } from '@electron-forge/shared-types';
import type { MakerOptions } from '@electron-forge/maker-base';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { buildForge } from 'app-builder-lib';
import MakerBase from '@electron-forge/maker-base';

// electron-forge-maker-nsis exports a plain function instead of a proper Maker
// class, causing forge 7.x to crash when it calls new MakerClass(config) —
// buildForge() fires immediately with dir=undefined. This inline class fixes
// that by deferring buildForge to the make() method as forge expects.
class MakerNSIS extends MakerBase<object> {
  name = 'maker-nsis';
  defaultPlatforms: string[] = ['win32'];

  isSupportedOnCurrentPlatform(): boolean {
    return process.platform === 'win32';
  }

  async make(opts: MakerOptions): Promise<string[]> {
    return buildForge({ dir: opts.dir }, { win: [`nsis:${opts.targetArch}`] });
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true
  },
  rebuildConfig: {},
  makers: [new MakerNSIS()],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts'
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts'
        }
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts'
        }
      ]
    })
  ]
};

export default config;
