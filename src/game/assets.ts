export class AssetLoader {
  images: Record<string, HTMLImageElement> = {};
  totalAssets: number = 0;
  loadedAssets: number = 0;
  onProgress?: (progress: number) => void;

  async loadImages(assetMap: Record<string, string>): Promise<void> {
    const entries = Object.entries(assetMap);
    this.totalAssets = entries.length;
    this.loadedAssets = 0;

    const promises = entries.map(([name, url]) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          this.images[name] = img;
          this.loadedAssets++;
          if (this.onProgress) {
            this.onProgress(this.loadedAssets / this.totalAssets);
          }
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load asset: ${url}. Using fallback.`);
          this.loadedAssets++; // Still count as "processed" to avoid getting stuck
          if (this.onProgress) {
            this.onProgress(this.loadedAssets / this.totalAssets);
          }
          resolve(); // Resolve anyway to allow game to start
        };
      });
    });

    await Promise.all(promises);
  }

  get(name: string): HTMLImageElement {
    return this.images[name];
  }
}

export const assetLoader = new AssetLoader();
