import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { baseUrl } from '../app.config';  
export interface ImportResponse {
  success: boolean;
  message: string;
  importedFiles?: string[]; // Optional list of imported filenames
}

@Injectable({
  providedIn: 'root'
})
export class ImportFilesService {
  private readonly API_URL = `${baseUrl}/api/automate/ImportFiles`;
  
  // Track imported files in memory only
  private importedFiles = new Set<string>();

  constructor(private http: HttpClient) {
    // Removed localStorage loading logic
  }

  importFiles(): Observable<ImportResponse> {
    return this.http.get<ImportResponse>(this.API_URL).pipe(
      tap(response => {
        if (response.success && response.importedFiles) {
          // Add newly imported files to our in-memory tracking set
          response.importedFiles.forEach(filename => {
            this.importedFiles.add(filename);
          });
        }
      }),
      catchError(this.handleError)
    );
  }
  
  // Check if a file has already been imported
  isFileImported(filename: string): boolean {
    return this.importedFiles.has(filename);
  }
  
  // Get the list of all imported files
  getImportedFiles(): string[] {
    return Array.from(this.importedFiles);
  }
  
  // Clear the imported files tracking (resets in-memory state)
  clearImportedFiles(): void {
    this.importedFiles.clear();
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred during import';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'No files available to import';
          break;
        case 401:
          errorMessage = 'Please login to continue';
          break;
        case 403:
          errorMessage = 'You do not have permission to import files';
          break;
        case 409:
          errorMessage = 'Some files have already been imported';
          break;
        case 500:
          errorMessage = 'Server error during import process';
          break;
        default:
          errorMessage = `Server error: ${error.message}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
