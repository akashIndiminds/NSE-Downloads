//build-task.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { baseUrl } from '../app.config';  // NEW: import baseUrl


export interface BuildTaskResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class BuildTaskService {
  private readonly API_URL = `${baseUrl}/api`;

  constructor(private http: HttpClient) {}

  buildTask(startDate: string, endDate: string): Observable<BuildTaskResponse> {
    return this.http.get<BuildTaskResponse>(
      `${this.API_URL}/automate/buildTask`,
      {
        params: {
          startDate,
          endDate
        }
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  validateDateRange(startDate: string, endDate: string): { isValid: boolean; message: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (start > today || end > today) {
      return { 
        isValid: false, 
        message: 'Future dates are not allowed' 
      };
    }

    if (start < oneMonthAgo) {
      return { 
        isValid: false, 
        message: 'Start date cannot be more than one month old' 
      };
    }

    if (start > end) {
      return { 
        isValid: false, 
        message: 'Start date cannot be after end date' 
      };
    }

    return { 
      isValid: true, 
      message: 'Date range is valid' 
    };
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid date range provided';
          break;
        case 401:
          errorMessage = 'Please login to continue';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action';
          break;
        case 500:
          errorMessage = 'Server error while creating task';
          break;
        default:
          errorMessage = `Server error: ${error.message}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}