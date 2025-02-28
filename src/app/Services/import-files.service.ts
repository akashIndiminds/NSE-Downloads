//import-files
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ImportResponse {
  success: boolean;
  message: string;
  importedFiles?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ImportFilesService {
  private readonly IMPORT_API_URL = 'http://192.168.1.131:3000/api/automate/ImportFiles';

  constructor(private http: HttpClient) {}

  importFiles(): Observable<ImportResponse> {
    return this.http.get<ImportResponse>(this.IMPORT_API_URL).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Import failed');
        }
        return response;
      }),
      catchError(error => {
        // Handle specific error cases
        let errorMessage = 'Import failed: ';
        
        if (error.status === 401) {
          errorMessage += 'Authentication required';
        } else if (error.status === 404) {
          errorMessage += 'No files available to import';
        } else if (error.status === 500) {
          errorMessage += 'Server error';
        } else {
          errorMessage += error.message || 'Unknown error';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }
}