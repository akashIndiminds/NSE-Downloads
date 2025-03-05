import { Component, OnInit, HostListener, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { FileStatusService } from '../Services/file-status.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TopBarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sibebar/sidebar.component';
import { interval, Subscription } from 'rxjs';
import { FileItem } from './shared/interfaces/file-item.interface';
import { BuildTaskService } from '../Services/build-task.service';
import { DialogComponent } from '../dialog/dialog.component';
import { Dialog } from '@angular/cdk/dialog';
import { ImportFilesService } from '../Services/import-files.service';
import { HttpClient } from '@angular/common/http';
import { switchMap, takeWhile } from 'rxjs/operators';
import { baseUrl } from '../app.config';

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
  selectedTime: number = 5;
  isProcessing: boolean = false;
  private statusSubscription?: Subscription;
  private downloadCycleSub?: Subscription;
  private authErrorSub?: Subscription;
  failedFiles: FileItem[] = [];
  downloadCycleMessage: string = '';
  readonly MAX_FILENAME_LENGTH = 30;
  isSidebarOpen: boolean = false;
  
  startDate: string = new Date().toISOString().split('T')[0];
  endDate: string = new Date().toISOString().split('T')[0];
  todayDate: string = new Date().toISOString().split('T')[0];

  buildTaskSuccess: boolean = false;
  downloadCycleCompleted: boolean = false;
  importInProgress: boolean = false;
  private activeSession: boolean = false;
  private readonly DOWNLOAD_API_URL = `${baseUrl}/api/automate/DownloadFiles`;
  private pollingSubscription?: Subscription;
  private pollingActive: boolean = false;
  private autoRefreshSub?: Subscription;


  get totalPendingFiles(): number { return this.pendingFiles.length; }
  get totalDownloadedFiles(): number { return this.downloadedFiles.length; }
  get totalImportedFiles(): number { return this.importedFiles.length; }


  constructor(
    private fileService: FileStatusService,
    private buildTaskService: BuildTaskService,
    private importService: ImportFilesService,
    private dialog: Dialog,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Only access localStorage in browser environment
    if (isPlatformBrowser(this.platformId)) {
      const storedProcessing = localStorage.getItem('isProcessing');
      if (storedProcessing === 'true') {
        this.isProcessing = true;
        this.activeSession = true;
        // Start polling if we were in a processing state
        this.startPollingDownloadAPI();
      }
      this.loadImportedFiles();
    }
    
    this.statusSubscription = this.fileService.files$.subscribe({
      next: (files) => this.updateFileArrays(this.deduplicateFiles(files)),
      error: (error) => console.error('Error in file status subscription:', error),
    });
    
    this.downloadCycleSub = this.fileService.downloadCycleCompleted$.subscribe(() => {
      this.downloadCycleCompleted = true;
      this.isProcessing = false;
      this.activeSession = false;
      this.stopPolling();
      
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('isProcessing', 'false');
      }
    });
    
    this.authErrorSub = this.fileService.authError$.subscribe(() => {
      this.handleAuthError();
    });
    // Add auto-refresh functionality
    this.autoRefreshSub = interval(18000).subscribe(() => {
      this.refreshPendingFiles();
    });

    
    this.fileService.updateFileStatus();
  }
  
  private startPollingDownloadAPI() {
    if (this.pollingActive) {
      return; // Don't start polling if it's already active
    }
    
    this.pollingActive = true;
    
    // Poll every 10 seconds
    this.pollingSubscription = interval(5000).pipe(
      // Only continue polling while active
      takeWhile(() => this.pollingActive),
      switchMap(() => this.http.get<any>(this.DOWNLOAD_API_URL))
    ).subscribe({
      next: response => {
        this.handleDownloadResponse(response);
        // Update file statuses with each poll
        this.fileService.updateFileStatus();
        
        // If download cycle ended, stop polling
        if (response.success && response.message === "Download cycle Ended") {
          this.downloadCycleCompleted = true;
          this.isProcessing = false;
          this.activeSession = false;
          this.downloadCycleMessage = 'Download cycle completed successfully';
          this.stopPolling();
          
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('isProcessing', 'false');
          }
        }
      },
      error: error => {
        this.handleDownloadError(error);
        this.stopPolling();
      }
    });
  }
  
  private stopPolling() {
    this.pollingActive = false;
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  startProcess() {
    if (!this.validateDates()) return;
    if (this.activeSession) {
      this.showProcessRunningError();
      return;
    }
  
    this.isProcessing = true;
    this.activeSession = true;
    this.downloadCycleMessage = 'Processing started...';
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('isProcessing', 'true');
    }
    
    this.buildTaskSuccess = false;
    this.downloadCycleCompleted = false;
  
    this.fileService.getFileStatus().subscribe({
      next: (files) => this.handleFileStatusResponse(files),
      error: (error) => this.handleFileStatusError(error)
    });

    // Start the polling mechanism
    this.startPollingDownloadAPI();
  }
  
  private validateDates(): boolean {
    if (!this.startDate || !this.endDate) {
      this.showDateError('Please select both start and end dates.');
      return false;
    }
    
    const validation = this.buildTaskService.validateDateRange(this.startDate, this.endDate);
    if (!validation.isValid) {
      this.showDateError(validation.message);
      return false;
    }
    return true;
  }

  private handleFileStatusResponse(files: FileItem[]) {
    const pending = files.filter(f => f.dlStatus !== 200 && !f.isImported);
    if (pending.length === 0) {
      this.executeBuildTask();
    } else {
      this.initiateDownload();
    }
  }

  private executeBuildTask() {
    this.buildTaskService.buildTask(this.startDate, this.endDate).subscribe({
      next: (response) => this.handleBuildTaskSuccess(response),
      error: (error) => this.handleBuildTaskError(error)
    });
  }

  private handleBuildTaskSuccess(response: any) {
    if (response.success) {
      this.buildTaskSuccess = true;
      this.downloadCycleMessage = 'Build task completed, initiating downloads...';
      this.handleManualModeProcess();
    } else {
      this.handleBuildTaskError(response.message);
    }
  }

  private handleManualModeProcess() {
    this.fileService.updateFileStatus();
    setTimeout(() => this.initiateDownload(), 1000);
  }

  private initiateDownload() {
    this.http.get<any>(this.DOWNLOAD_API_URL).subscribe({
      next: (response) => this.handleDownloadResponse(response),
      error: (error) => this.handleDownloadError(error)
    });
  }

  importFiles() {
    if (this.downloadedFiles.length === 0) {
      this.showImportError('There are no files to import.');
      return;
    }
    
    this.importInProgress = true;
    this.importService.importFiles().subscribe({
      next: (response) => this.handleImportSuccess(response),
      error: (error) => this.handleImportError(error)
    });
  }

  // Helper methods
  private updateFileArrays(files: FileItem[]) {
    const uniqueFiles = this.deduplicateFiles(files);
    
    // All files that have been downloaded (regardless of spStatus)
    this.downloadedFiles = uniqueFiles.filter(f => f.dlStatus === 200);
    
    // Files that are marked as imported (either using an isImported flag or by checking spStatus)
    this.importedFiles = uniqueFiles.filter(
      f => f.dlStatus === 200 && (f.isImported || (f.spStatus !== 404 && f.spStatus !== '404'))
    );
    
    // Pending files are those not yet downloaded
    this.pendingFiles = uniqueFiles.filter(f => f.dlStatus !== 200);
    
    // Failed files
    this.failedFiles = uniqueFiles.filter(f => f.dlStatus === 404);
  }

  private deduplicateFiles(files: FileItem[]): FileItem[] {
    const uniqueFiles = new Map<string, FileItem>();
    [...files].reverse().forEach(file => {
      if (!uniqueFiles.has(file.filename)) uniqueFiles.set(file.filename, file);
    });
    return Array.from(uniqueFiles.values());
  }

  // Error handling methods
  private handleAuthError() {
    this.isProcessing = false;
    this.activeSession = false;
    this.stopPolling();
    
    this.dialog.open(DialogComponent, {
      data: { title: 'Authentication Error', message: 'Your session has expired. Please login again.', type: 'error' }
    });
  }

  private showDateError(message: string) {
    this.dialog.open(DialogComponent, {
      data: { title: 'Date Error', message, type: 'error' }
    });
  }

  private showProcessRunningError() {
    this.dialog.open(DialogComponent, {
      data: { title: 'Process Running', message: 'Please wait for current process to complete.', type: 'warning' }
    });
  }

  private handleFileStatusError(error: any) {
    this.isProcessing = false;
    this.activeSession = false;
    this.stopPolling();
    console.error('File status check failed:', error);
  }

  private handleBuildTaskError(error: any) {
    this.isProcessing = false;
    this.activeSession = false;
    this.stopPolling();
    
    this.dialog.open(DialogComponent, {
      data: { title: 'Build Task Failed', message: error.message || 'Failed to build task', type: 'error' }
    });
  }

  private handleDownloadResponse(response: any) {
    if (response.success) {
      this.downloadCycleMessage = response.message || 'Download in progress';
      
      if (response.message === "Download cycle Ended") {
        this.downloadCycleCompleted = true;
        this.isProcessing = false;
        this.activeSession = false;
        this.stopPolling();
        
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('isProcessing', 'false');
        }
      } else {
        // Normal success case - continue polling and update file statuses
        this.fileService.updateFileStatus();
      }
    } else {
      this.handleDownloadError(response.message);
    }
  }
  
  private handleDownloadError(error: any) {
    this.isProcessing = false;
    this.activeSession = false;
    this.stopPolling();
  
    let customMessage = 'File download failed.';
    // Check if the error is an HTTP error response with status 0
    if (error.status === 0) {
      customMessage = 'File download unavailable 🚫 — It appears NSE hasnt uploaded the file yet. Please check back shortly ⏳.';
    } else if (error.error && error.error.message) {
      customMessage = error.error.message;
    } else if (error.message) {
      customMessage = error.message;
    }
    
    this.dialog.open(DialogComponent, {
      data: { title: 'Download Failed', message: customMessage, type: 'error' }
    });
  }

  private handleImportSuccess(response: any) {
    if (response.success && response.importedFiles) {
      const now = new Date();
      // For each file in the downloadedFiles list, update it if it was imported
      this.downloadedFiles.forEach(file => {
        if (response.importedFiles.includes(file.filename)) {
          file.isImported = true; // Mark file as imported
          file.importedTime = now;
          // Optionally update spStatus to indicate the import has been done
          file.spStatus = 'Imported'; // or any other non-404 value
        }
      });
      
      // Refresh file status to update both downloaded and imported arrays
      this.fileService.updateFileStatus();
      
      // Optionally persist the imported state if needed
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('importedFiles', JSON.stringify(this.importedFiles));
      }
    }
    this.importInProgress = false;
  }
  
  private handleImportError(error: any) {
    this.importInProgress = false;
    this.dialog.open(DialogComponent, {
      data: { title: 'Import Failed', message: error.message || 'File import failed', type: 'error' }
    });
  }

  private showImportError(message: string) {
    this.dialog.open(DialogComponent, {
      data: { title: 'Import Error', message, type: 'error' }
    });
  }
  
  private loadImportedFiles() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('importedFiles');
      if (stored) {
        this.importedFiles = JSON.parse(stored);
      }
    }
  }
  
  refreshPendingFiles() {
    this.fileService.updateFileStatus();
  }

  cancelProcess() {
    if (this.isProcessing && this.activeSession) {
      this.isProcessing = false;
      this.activeSession = false;
      this.stopPolling();
      
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('isProcessing', 'false');
      }
      
      this.downloadCycleMessage = 'Process cancelled by user';
    }
  }

  ngOnDestroy() {
    this.autoRefreshSub?.unsubscribe();
    this.statusSubscription?.unsubscribe();
    this.downloadCycleSub?.unsubscribe();
    this.authErrorSub?.unsubscribe();
    this.stopPolling();
  }

  toggleSidebar() { 
    this.isSidebarOpen = !this.isSidebarOpen; 
  }

  @HostListener('document:mousedown', ['$event'])
  handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.isSidebarOpen && !target.closest('.sidebar') && !target.closest('.hamburger')) {
      this.isSidebarOpen = false;
    }
  }
}