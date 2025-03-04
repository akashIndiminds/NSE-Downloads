import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { baseUrl } from '../app.config';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private apiUrl = `${baseUrl}/api/login/auth`;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  login(credentials: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, credentials);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
    this.router.navigate(['/login']);
  }

  isTokenExpired(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return true; // Always treat as expired in server environment
    }

    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return true;

    const loginTimestamp = Number(loginTime);
    const currentTime = new Date().getTime();
    const tokenExpirationTime = 45 * 60 * 1000; // 45 minutes

    return currentTime - loginTimestamp > tokenExpirationTime;
  }

  checkTokenAndLogout(): void {
    if (this.isTokenExpired()) {
      console.log('Session expired! Logging out...');
      this.logout();
    }
  }

  // Helper methods for localStorage that check platform
  setItem(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, value);
    }
  }

  getItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(key);
    }
    return null;
  }

  removeItem(key: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(key);
    }
  }
}