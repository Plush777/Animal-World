interface LoadingUIInterface {
  init(): void;
  createAndShow(): void;
  setTotalModels(total: number): void;
  onModelLoaded(): void;
  onModelProgress(loaded: number, total: number): void;
  updateProgressText(text: string): void;
  forceHide(): void;
  onError(error: any): void;
}

declare global {
  interface Window {
    LoadingUI: LoadingUIInterface;
    globalControls: any; // OrbitControls 인스턴스
    globalCamera: any; // THREE.PerspectiveCamera 인스턴스
  }
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
