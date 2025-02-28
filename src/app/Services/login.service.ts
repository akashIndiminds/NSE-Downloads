
// login.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  private apiUrl = 'http://192.168.1.131:3000/api/login/auth';

  constructor(private http: HttpClient) {}

  login(credentials: {
    loginId: string;
    password: string;
    secretKey: string;
    memberCode: string;
  }): Observable<any> {
    return this.http.post<any>(this.apiUrl, credentials);
  }
}