import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FileStatusService } from '../Services/file-status.service';

@Injectable({
  providedIn: 'root'
})
export class ManualDownloadService {
  // API URL for manual mode
  private readonly DOWNLOAD_API_URL = 'http://192.168.1.131:3000/api/automate/DownloadFiles';

  constructor(
    private http: HttpClient,
    private fileService: FileStatusService
  ) {}

  // Method to initiate download process
  initiateDownload(): Observable<any> {
    return this.http.get<any>(this.DOWNLOAD_API_URL);
  }

  // Handle the complete manual mode process
  handleManualModeProcess(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Step 1: Update the file status once
      this.fileService.updateFileStatus();
      
      // Step 2: After a brief delay, initiate the download
      setTimeout(() => {
        this.initiateDownload().subscribe({
          next: (response) => {
            if (response.success) {
              // Update the file status one more time after download
              this.fileService.updateFileStatus();
              
              // Set completion flags after a brief delay
              setTimeout(() => {
                resolve(true);
              }, 1000); // Small delay to allow final status update
            } else {
              reject(new Error('Failed to download files.'));
            }
          },
          error: (error) => {
            reject(error);
          }
        });
      }, 1000); // Small delay to allow status update to complete
    });
  }
}