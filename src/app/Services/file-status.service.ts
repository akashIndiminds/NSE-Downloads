import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { baseUrl } from '../app.config';  // NEW: import baseUrl

export interface FileItem {
  filename: string;
  dlStatus: number;
  downloadedTime: Date | null;
  lastModified: string;
  truncatedName?: string;
  failedReason?: string;
  isImported?: boolean;
  importedTime?: Date | null;
  uniqueId?: string; // Unique identifier for deduplication
  spStatus?: string; // Status after import
}

export interface DownloadCycleResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class FileStatusService {
  private readonly STATUS_API_URL = `${baseUrl}/api/automate/status`;
  private readonly DOWNLOAD_API_URL = `${baseUrl}/api/automate/DownloadFiles`;
  private filesSubject = new BehaviorSubject<FileItem[]>([]);
  public files$ = this.filesSubject.asObservable();

  // Track files we've already processed to prevent duplicates (in memory only)
  private processedFiles = new Map<string, FileItem>();

  // Subjects for events
  private downloadCycleCompleted = new Subject<void>();
  public downloadCycleCompleted$ = this.downloadCycleCompleted.asObservable();

  private authError = new Subject<void>();
  public authError$ = this.authError.asObservable();

  constructor(private http: HttpClient) {
    // Removed localStorage loading logic
  }

  getFileStatus(): Observable<FileItem[]> {
    return this.http.get<any>(this.STATUS_API_URL).pipe(
      map(response => {
        const data = response.data || response.files || response.items || response;
        if (!Array.isArray(data)) {
          throw new Error('Invalid API response structure');
        }
        
        const files = data.map(file => ({
          filename: file.filename || file.name || file.fileName,
          dlStatus: file.dlStatus || file.status || file.downloadStatus,
          lastModified: file.lastModified || file.modifiedAt || file.timestamp,
          downloadedTime: file.dlStatus === 200 ? new Date() : null,
          isImported: file.isImported || false,
          // Generate a unique ID based on filename and current time
          uniqueId: `${file.filename || file.name || file.fileName}-${Date.now()}`
        }));
        
        // Merge with known processed files (in memory only) without including previous files not in the new batch
        return this.mergeWithProcessedFiles(files);
      }),
      catchError(error => throwError(() => error))
    );
  }

  checkDownloadCompletion(): Observable<DownloadCycleResponse> {
    return this.http.get<DownloadCycleResponse>(this.DOWNLOAD_API_URL).pipe(
      catchError(error => throwError(() => error))
    );
  }

  updateFileStatus(): void {
    this.getFileStatus().subscribe({
      next: (currentFiles) => {
        // Enhance files with truncated names and failure reasons
        const processedFiles = currentFiles.map(file => ({
          ...file,
          truncatedName:
            file.filename.length > 30
              ? file.filename.substring(0, 30) + '...'
              : file.filename,
          failedReason: file.dlStatus === 404 ? 'File not available in backend' : undefined
        }));

        // Update our in-memory processed files and emit the new file list
        this.updateProcessedFiles(processedFiles);
        this.filesSubject.next(processedFiles);

        // If all files are in a final state (downloaded or failed), notify subscribers
        const allProcessed = processedFiles.every(
          file => file.dlStatus === 200 || file.dlStatus === 404
        );
        
        if (allProcessed && processedFiles.length > 0) {
          // Mark any pending files as failed due to download cycle completion
          const updatedFiles = processedFiles.map(file =>
            file.dlStatus !== 200
              ? { ...file, dlStatus: 404, failedReason: 'Download cycle completed' }
              : file
          );
          
          this.updateProcessedFiles(updatedFiles);
          this.filesSubject.next(updatedFiles);
          this.downloadCycleCompleted.next();
        }
      },
      error: (error) => {
        console.error('Error fetching status:', error);
        if (error.status === 401) {
          this.authError.next();
        }
      }
    });
  }

  // Merge new file data with our existing in-memory records without adding files from previous runs that aren't in the new batch
  private mergeWithProcessedFiles(newFiles: FileItem[]): FileItem[] {
    const result: FileItem[] = [];
    
    for (const newFile of newFiles) {
      const existingFile = this.processedFiles.get(newFile.filename);
      
      if (existingFile) {
        // If file is already imported, keep it as imported
        if (existingFile.isImported) {
          result.push(existingFile);
        } 
        // If file was downloaded earlier and now shows a different status, preserve the downloaded state
        else if (existingFile.dlStatus === 200 && newFile.dlStatus !== 200) {
          result.push(existingFile);
        }
        // Otherwise, use the new file info
        else {
          result.push(newFile);
        }
      } else {
        // Brand new file; add it
        result.push(newFile);
      }
    }
    
    return result;
  }
  
  // Update our in-memory processed files tracking
  private updateProcessedFiles(files: FileItem[]): void {
    for (const file of files) {
      // Only track files in final states (downloaded, imported, or failed)
      if (file.dlStatus === 200 || file.dlStatus === 404 || file.isImported) {
        this.processedFiles.set(file.filename, file);
      }
    }
  }
  
  // Clear processed files (resets in-memory state)
  public clearProcessedFiles(): void {
    this.processedFiles.clear();
    this.filesSubject.next([]);
  }
}
