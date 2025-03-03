import { Injectable } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { FileStatusService } from '../Services/file-status.service';

@Injectable({
  providedIn: 'root'
})
export class AutoDownloadService {
  private pollingSubscription?: Subscription;

  constructor(
    private fileService: FileStatusService
  ) {}

  // Start polling for file status
  startPolling(intervalSeconds: number): void {
    this.stopPolling(); // Clear any existing polling
    
    // Initial status update
    this.fileService.updateFileStatus();
    
    // Poll at regular intervals
    this.pollingSubscription = interval(intervalSeconds * 1000).subscribe(() => {
      this.fileService.updateFileStatus();
    });
  }

  // Stop polling
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  // Handle auto mode process
  handleAutoModeProcess(intervalSeconds: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.startPolling(intervalSeconds);
      
      // Auto mode is handled by polling and the subscription to file status changes
      // The component will determine when to complete based on the status updates
      resolve(true);
    });
  }
}

/*import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { FileStatusService } from '../Services/file-status.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TopBarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sibebar/sidebar.component';
import { Subscription } from 'rxjs';
import { FileItem } from './shared/interfaces/file-item.interface';
import { BuildTaskService } from '../Services/build-task.service';
import { DialogComponent } from '../dialog/dialog.component';
import { Dialog } from '@angular/cdk/dialog';
import { ImportFilesService } from '../Services/import-files.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-file-status',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    TopBarComponent,
    SidebarComponent,
  ],
  templateUrl: './file-status.component.html',
  styleUrls: ['./file-status.component.css'],
  animations: [
    trigger('moveAnimation', [
      transition(':leave', [
        animate('500ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ]),
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('500ms ease-in', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
    ]),
  ],
})
export class FileStatusComponent implements OnInit, OnDestroy {
  pendingFiles: FileItem[] = [];
  downloadedFiles: FileItem[] = [];
  importedFiles: FileItem[] = [];
  failedFiles: FileItem[] = []; // Keeping the property but not displaying it
  selectedTime: number = 5; // Default polling interval (5 seconds)
  isProcessing: boolean = false;
  private statusSubscription?: Subscription;
  private downloadCycleSub?: Subscription;
  private authErrorSub?: Subscription;

  readonly MAX_FILENAME_LENGTH = 30;
  isSidebarOpen: boolean = false;

  // Pre-fill dates with today's date
  startDate: string = new Date().toISOString().split('T')[0];
  endDate: string = new Date().toISOString().split('T')[0];
  todayDate: string = new Date().toISOString().split('T')[0];

  buildTaskSuccess: boolean = false;
  downloadCycleCompleted: boolean = false;
  importInProgress: boolean = false;
  
  // Store the last processed date range to prevent duplicates
  private lastProcessedStartDate: string = '';
  private lastProcessedEndDate: string = '';
  
  // Flag to track if a session is active
  private activeSession: boolean = false;
  
  // API URL for manual download
  private readonly DOWNLOAD_API_URL = 'http://192.168.1.131:3000/api/automate/DownloadFiles';
  
  get totalPendingFiles(): number {
    return this.pendingFiles.length;
  }

  get totalDownloadedFiles(): number {
    return this.downloadedFiles.length;
  }

  get totalImportedFiles(): number {
    return this.importedFiles.length;
  }

  constructor(
    private fileService: FileStatusService,
    private buildTaskService: BuildTaskService,
    private importService: ImportFilesService,
    private dialog: Dialog,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Subscribe to file status updates
    this.statusSubscription = this.fileService.files$.subscribe({
      next: (files) => {
        this.updateFileArrays(this.deduplicateFiles(files));
      },
      error: (error) => {
        console.error('Error in file status subscription:', error);
      },
    });

    this.downloadCycleSub = this.fileService.downloadCycleCompleted$.subscribe(() => {
      this.downloadCycleCompleted = true;
      this.isProcessing = false;
      this.activeSession = false;
    });

    this.authErrorSub = this.fileService.authError$.subscribe(() => {
      this.isProcessing = false;
      this.activeSession = false;
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Authentication Error',
          message: 'Your session has expired. Please login again.',
          type: 'error',
        },
      });
    });
    
    // Initial file status fetch - to show any existing files
    this.fileService.updateFileStatus();
  }

  // Start process: check status, call BuildTask if needed, refresh status, and automatically trigger download.
  startProcess() {
    if (!this.startDate || !this.endDate) {
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Missing Information',
          message: 'Please select both start and end dates.',
          type: 'error',
        },
      });
      return;
    }
    
    if (this.activeSession) {
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Process Already Running',
          message: 'Please wait for the current process to complete.',
          type: 'warning',
        },
      });
      return;
    }
    
    if (this.startDate === this.lastProcessedStartDate &&
        this.endDate === this.lastProcessedEndDate &&
        this.downloadedFiles.length > 0) {
      const hasPendingFiles = this.pendingFiles.some(file => file.dlStatus === 404);
      if (!hasPendingFiles) {
        this.dialog.open(DialogComponent, {
          data: {
            title: 'Duplicate Process',
            message: 'You have already processed this date range. Files are ready for import.',
            type: 'info',
          },
        });
        return;
      }
    }
    
    this.isProcessing = true;
    this.activeSession = true;
    this.lastProcessedStartDate = this.startDate;
    this.lastProcessedEndDate = this.endDate;
    
    // Call the Status API to check if the task exists.
    this.fileService.getFileStatus().subscribe({
      next: (files) => {
        if (files.length === 0) {
          // No task exists – call the BuildTask API.
          this.buildTaskService.buildTask(this.startDate, this.endDate).subscribe({
            next: (response) => {
              if (response.success) {
                this.dialog.open(DialogComponent, {
                  data: {
                    title: 'Success',
                    message: response.message,
                    type: 'success',
                  },
                });
                // Refresh file status so that pending files are displayed.
                this.fileService.updateFileStatus();
                // Automatically trigger the download process after a short delay.
                setTimeout(() => {
                  this.initiateDownload();
                }, 1000);
              } else {
                this.dialog.open(DialogComponent, {
                  data: {
                    title: 'Error',
                    message: 'Build Task creation failed',
                    type: 'error',
                  },
                });
              }
              this.isProcessing = false;
              this.activeSession = false;
            },
            error: (error) => {
              this.dialog.open(DialogComponent, {
                data: {
                  title: 'Error',
                  message: error.message || 'Build Task creation failed',
                  type: 'error',
                },
              });
              this.isProcessing = false;
              this.activeSession = false;
            }
          });
        } else {
          // Task already exists – refresh file status and automatically trigger download.
          this.fileService.updateFileStatus();
          setTimeout(() => {
            this.initiateDownload();
          }, 1000);
          this.isProcessing = false;
          this.activeSession = false;
        }
      },
      error: (error) => {
        this.dialog.open(DialogComponent, {
          data: {
            title: 'Error',
            message: error.message || 'Failed to get task status',
            type: 'error',
          },
        });
        this.isProcessing = false;
        this.activeSession = false;
      }
    });
  }

  // Automatically initiate the download process.
  initiateDownload() {
    this.http.get<any>(this.DOWNLOAD_API_URL).subscribe({
      next: (response) => {
        if (response.success) {
          this.fileService.updateFileStatus();
          setTimeout(() => {
            this.downloadCycleCompleted = true;
            this.isProcessing = false;
            this.activeSession = false;
          }, 1000);
        } else {
          this.isProcessing = false;
          this.activeSession = false;
          this.dialog.open(DialogComponent, {
            data: {
              title: 'Download Failed',
              message: 'Failed to download files.',
              type: 'error',
            },
          });
        }
      },
      error: (error) => {
        this.isProcessing = false;
        this.activeSession = false;
        this.dialog.open(DialogComponent, {
          data: {
            title: 'Download Error',
            message: error.message || 'Failed to download files',
            type: 'error',
          },
        });
      }
    });
  }

  // Import process remains triggered by the "Import" button.
  importFiles() {
    if (this.downloadedFiles.length === 0) {
      this.dialog.open(DialogComponent, {
        data: {
          title: 'No Files',
          message: 'There are no files to import.',
          type: 'info',
        },
      });
      return;
    }
    
    this.importInProgress = true;
    this.importService.importFiles().subscribe({
      next: (response) => {
        if (response.success) {
          this.dialog.open(DialogComponent, {
            data: {
              title: 'Import Success',
              message: response.message,
              type: 'success',
            },
          });
          const now = new Date();
          const filesWithTimestamp = this.downloadedFiles.map(file => ({
            ...file,
            isImported: true,
            importedTime: now,
            spStatus: Math.floor(Math.random() * 1000).toString() // Random imported status
          }));
          this.importedFiles = this.deduplicateFiles([
            ...this.importedFiles,
            ...filesWithTimestamp
          ]);
          this.downloadedFiles = [];
        }
        this.importInProgress = false;
      },
      error: (error) => {
        this.dialog.open(DialogComponent, {
          data: {
            title: 'Import Failed',
            message: error.message || 'Failed to import files',
            type: 'error',
          },
        });
        this.importInProgress = false;
      },
    });
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
    this.downloadCycleSub?.unsubscribe();
    this.authErrorSub?.unsubscribe();
  }

  private updateFileArrays(files: FileItem[]) {
    this.pendingFiles = files.filter((f) => f.dlStatus !== 200 && !f.isImported);
    this.downloadedFiles = files.filter((f) => f.dlStatus === 200 && !f.isImported);
    this.importedFiles = files.filter((f) => f.isImported);
    this.failedFiles = files.filter((f) => f.dlStatus === 404);
  }

  // Deduplicate files based on filename.
  private deduplicateFiles(files: FileItem[]): FileItem[] {
    const uniqueFiles = new Map<string, FileItem>();
    [...files].reverse().forEach(file => {
      if (!uniqueFiles.has(file.filename)) {
        uniqueFiles.set(file.filename, file);
      }
    });
    return Array.from(uniqueFiles.values());
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  @HostListener('document:mousedown', ['$event'])
  handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    const isSidebarClick = target.closest('.sidebar') !== null;
    const isHamburgerClick = target.closest('.hamburger') !== null;
    if (this.isSidebarOpen && !isSidebarClick && !isHamburgerClick) {
      this.isSidebarOpen = false;
    }
  }
}
*/