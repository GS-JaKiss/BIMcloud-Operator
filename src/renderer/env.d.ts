import type { BranchConfigApi } from '../shared/contracts';

declare global {
  var branchConfig: BranchConfigApi;
  const __APP_VERSION__: string;
}

export {};