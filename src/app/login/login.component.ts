import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../Services/login.service';
import { demoLogin, loginCredentials } from '../app.config';
import { CommonModule } from '@angular/common';
import { Dialog } from '@angular/cdk/dialog';
import { DialogComponent } from '../dialog/dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoggingIn = false;
  buttonText = 'Log In';

  constructor(
    private fb: FormBuilder, 
    private loginService: LoginService, 
    private router: Router,
    private dialog: Dialog
  ) {
    this.loginForm = this.fb.group({
      loginId: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    try {
      this.loginService.checkTokenAndLogout(); // Check token expiry on load
    } catch (error) {
      console.error('Error checking token:', error);
    }
  }

  showDialog(title: string, message: string, type: 'success' | 'error'): void {
    this.dialog.open(DialogComponent, {
      data: {
        title: title,
        message: message,
        type: type
      }
    });
  }

  onSubmit(): void {
    if (this.isLoggingIn || this.loginForm.invalid) return;

    this.isLoggingIn = true;
    this.buttonText = 'Logging in...';
    
    const credentials = this.loginForm.value;

    // Step 1: Validate Demo Credentials
    if (credentials.loginId !== demoLogin.demoLoginId || credentials.password !== demoLogin.demoPassword) {
      this.showDialog('Login Error', 'Invalid Demo Credentials. Please enter correct loginId & password.', 'error');
      this.isLoggingIn = false;
      this.buttonText = 'Log In';
      return;
    }

    // Step 2: If demo credentials are correct, send fixed JSON to API
    this.loginService.login(loginCredentials).subscribe({
      next: (response: any) => {
        if (response.success && response.msg.status === 'success') {
          this.loginService.setItem('token', response.msg.token);
          this.loginService.setItem('loginTime', new Date().getTime().toString());
          this.router.navigate(['/dashboard']);
        } else {
          this.showDialog('Login Error', 'API Response: Invalid login. Please check your credentials.', 'error');
        }
        this.isLoggingIn = false;
        this.buttonText = 'Log In';
      },
      error: (error) => {
        console.error('Login error:', error);
        this.showDialog('Login Error', 'Something went wrong. Try again later.', 'error');
        this.isLoggingIn = false;
        this.buttonText = 'Log In';
      }
    });
  }
}