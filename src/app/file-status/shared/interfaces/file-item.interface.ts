// file-status/interfaces/file-item.interface.ts
export interface FileItem {
  filename: string;
  dlStatus: number;
  spStatus?: string | number;  // Added property to handle spStatus (can be a string or a number)
  downloadedTime: Date | null;
  lastModified: string;
  truncatedName?: string;
  failedReason?: string;
  isImported?: boolean;
  importedTime?: Date | null;
}
