import type { AccountingApi, HrApi } from './types';

export interface StrateraWindow {
  platform: string;
  appName: string;
  isElectron: boolean;
  /** Legacy single-app preload */
  api?: AccountingApi | HrApi;
  accounting?: AccountingApi;
  hr?: HrApi;
}

declare global {
  interface Window {
    stratera?: StrateraWindow;
  }
}
