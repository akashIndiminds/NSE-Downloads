//file-status.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

export interface FileItem {
  filename: string;
  dlStatus: number;
  downloadedTime: Date | null;
  lastModified: string;
  truncatedName?: string;
  failedReason?: string;
  isImported?: boolean;
}

export interface DownloadCycleResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class FileStatusService {
  private readonly STATUS_API_URL = 'http://192.168.1.131:3000/api/automate/status';
  private readonly DOWNLOAD_API_URL = 'http://192.168.1.131:3000/api/automate/DownloadFiles';
  private filesSubject = new BehaviorSubject<FileItem[]>([]);
  public files$ = this.filesSubject.asObservable();

  // Subjects for events
  private downloadCycleCompleted = new Subject<void>();
  public downloadCycleCompleted$ = this.downloadCycleCompleted.asObservable();

  private authError = new Subject<void>();
  public authError$ = this.authError.asObservable();

  constructor(private http: HttpClient) {}

  getFileStatus(): Observable<FileItem[]> {
    return this.http.get<any>(this.STATUS_API_URL).pipe(
      map(response => {
        const data = response.data || response.files || response.items || response;
        if (!Array.isArray(data)) {
          throw new Error('Invalid API response structure');
        }
        return data.map(file => ({
          filename: file.filename || file.name || file.fileName,
          dlStatus: file.dlStatus || file.status || file.downloadStatus,
          lastModified: file.lastModified || file.modifiedAt || file.timestamp,
          downloadedTime: file.dlStatus === 200 ? new Date() : null,
          isImported: file.isImported || false
        }));
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
        // Simply update the file list (you could add truncated names here if desired)
        const processedFiles = currentFiles.map(file => ({
          ...file,
          truncatedName:
            file.filename.length > 30
              ? file.filename.substring(0, 30) + '...'
              : file.filename,
          failedReason: file.dlStatus === 404 ? 'File not available in backend' : undefined
        }));

        this.filesSubject.next(processedFiles);

        // If all files are in a final state (downloaded or failed), then check download completion
        const allProcessed = processedFiles.every(
          file => file.dlStatus === 200 || file.dlStatus === 404
        );
        if (allProcessed) {
          this.checkDownloadCompletion().subscribe({
            next: (response) => {
              if (response.success) {
                // Mark any pending files as failed due to download cycle completion
                const updatedFiles = processedFiles.map(file =>
                  file.dlStatus !== 200
                    ? { ...file, dlStatus: 404, failedReason: 'Download cycle completed' }
                    : file
                );
                this.filesSubject.next(updatedFiles);
                this.downloadCycleCompleted.next();
              }
            },
            error: (error) => {
              console.error('Error checking download completion:', error);
            }
          });
        }
      },
      error: (error) => {
        console.error('Error fetching status:', error);
        this.filesSubject.next([]);
        if (error.status === 401) {
          this.authError.next();
        }
      }
    });
  }
}
