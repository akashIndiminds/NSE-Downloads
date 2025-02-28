import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { FileStatusService } from '../Services/file-status.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TopBarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sibebar/sidebar.component';
import { Subscription, interval } from 'rxjs';
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
        animate(
          '500ms ease-out',
          style({ transform: 'translateX(100%)', opacity: 0 })
        ),
      ]),
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate(
          '500ms ease-in',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),
    ]),
  ],
})
export class FileStatusComponent implements OnInit, OnDestroy {
  pendingFiles: FileItem[] = [];
  downloadedFiles: FileItem[] = [];
  importedFiles: FileItem[] = [];
  failedFiles: FileItem[] = [];
  downloadMode: 'auto' | 'manual' = 'manual'; // Default to manual mode
  selectedTime: number = 5; // Default polling interval (5 seconds)
  isProcessing: boolean = false;
  private statusSubscription?: Subscription;
  private pollingSubscription?: Subscription;
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
  
  // API URLs for manual mode
  private readonly DOWNLOAD_API_URL = 'http://192.168.1.131:3000/api/automate/DownloadFiles';

  constructor(
    private fileService: FileStatusService,
    private buildTaskService: BuildTaskService,
    private importService: ImportFilesService,
    private dialog: Dialog,
    private http: HttpClient
  ) {}

  ngOnInit() {
   // this.loadFiles();

    this.statusSubscription = this.fileService.files$.subscribe({
      next: (files) => {
        this.updateFileArrays(files);
      },
      error: (error) => {
        console.error('Error in file status subscription:', error);
      },
    });

    this.downloadCycleSub = this.fileService.downloadCycleCompleted$.subscribe(() => {
      this.stopPolling();
      this.downloadCycleCompleted = true;
      this.isProcessing = false;
    });

    this.authErrorSub = this.fileService.authError$.subscribe(() => {
      this.stopPolling();
      this.isProcessing = false;
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Authentication Error',
          message: 'Your session has expired. Please login again.',
          type: 'error',
        },
      });
    });
  }

  // Start process: validate, then trigger build task
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
    this.isProcessing = true;
    this.executeBuildTask();
  }

  executeBuildTask() {
    const dateValidation = this.buildTaskService.validateDateRange(this.startDate, this.endDate);
    if (!dateValidation.isValid) {
      this.isProcessing = false;
      this.dialog.open(DialogComponent, {
        data: {
          title: 'Invalid Date Range',
          message: dateValidation.message,
          type: 'error',
        },
      });
      return;
    }

    this.buildTaskService.buildTask(this.startDate, this.endDate).subscribe({
      next: (response) => {
        if (response.success) {
          this.buildTaskSuccess = true;
          this.dialog.open(DialogComponent, {
            data: {
              title: 'Success',
              message: response.message,
              type: 'success',
            },
          });
          
          // After build task success, handle based on mode
          if (this.downloadMode === 'auto') {
            // For auto mode: Start polling for continuous updates
            this.startPolling();
          } else {
            // For manual mode: Make a single status check then download
            this.handleManualModeProcess();
          }
        } else {
          this.isProcessing = false;
          this.dialog.open(DialogComponent, {
            data: {
              title: 'Error',
              message: 'Failed to build task.',
              type: 'error',
            },
          });
        }
      },
      error: (error) => {
        this.isProcessing = false;
        this.dialog.open(DialogComponent, {
          data: {
            title: 'Error',
            message: error.message,
            type: 'error',
          },
        });
      },
    });
  }

  // New method to handle manual mode process
  handleManualModeProcess() {
    // Step 1: Update the file status once
    this.fileService.updateFileStatus();
    
    // Step 2: After a brief delay, initiate the download
    setTimeout(() => {
      this.initiateDownload();
    }, 1000); // Small delay to allow status update to complete
  }

  // New method to initiate download process
  initiateDownload() {
    this.http.get<any>(this.DOWNLOAD_API_URL).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the file status one more time
          this.fileService.updateFileStatus();
          
          // Set completion flags
          setTimeout(() => {
            this.downloadCycleCompleted = true;
            this.isProcessing = false;
          }, 1000); // Small delay to allow final status update
        } else {
          this.isProcessing = false;
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

  importFiles() {
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
          // Mark downloaded files as imported
          this.downloadedFiles.forEach((file) => (file.isImported = true));
          // Move files from downloaded to imported section
          this.importedFiles = [...this.downloadedFiles];
          this.downloadedFiles = [];
        }
        this.importInProgress = false;
      },
      error: (error) => {
        this.dialog.open(DialogComponent, {
          data: {
            title: 'Import Failed',
            message: error.message,
            type: 'error',
          },
        });
        this.importInProgress = false;
      },
    });
  }

  ngOnDestroy() {
    this.stopPolling();
    this.statusSubscription?.unsubscribe();
    this.downloadCycleSub?.unsubscribe();
    this.authErrorSub?.unsubscribe();
  }

  private loadFiles() {
    this.fileService.updateFileStatus();
  }

  private updateFileArrays(files: FileItem[]) {
    // Optionally add truncated file names here (or do it in the service)
    this.pendingFiles = files.filter((f) => f.dlStatus !== 200 && f.dlStatus !== 404);
    this.downloadedFiles = files.filter((f) => f.dlStatus === 200 && !f.isImported);
    this.importedFiles = files.filter((f) => f.isImported);
    this.failedFiles = files.filter((f) => f.dlStatus === 404);
  }

  private startPolling() {
    this.stopPolling(); // Clear any existing polling
    // Initial status update
    this.fileService.updateFileStatus();
    // Poll at regular intervals
    this.pollingSubscription = interval(this.selectedTime * 1000).subscribe(() => {
      this.fileService.updateFileStatus();
    });
  }

  private stopPolling() {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
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