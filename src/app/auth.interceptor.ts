import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check if the error indicates token expiration
        if (
          error.error &&
          error.error.error === "Token has expired, login required"
        ) {
          alert("Your session has expired. Please login again.");
          // Clear any stored authentication data
          localStorage.clear();
          // Redirect to the login page
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
