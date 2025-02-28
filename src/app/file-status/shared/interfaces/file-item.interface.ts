// file-status/interfaces/file-item.interface.ts
export interface FileItem {
  filename: string;
  dlStatus: number;
  downloadedTime: Date | null;
  lastModified: string;
  truncatedName?: string;
  failedReason?: string;
  isImported?: boolean;
  importedTime?: Date | null; // Added property
}
