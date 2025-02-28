import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LoginService } from '../Services/login.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  constructor(
    private fb: FormBuilder,
    private loginService: LoginService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      loginId: ['', Validators.required],
      password: ['', Validators.required],
      secretKey: ['', Validators.required],
      memberCode: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loginService.login(this.loginForm.value).subscribe({
        next: (response) => {
          if (response.success && response.msg.status === 'success') {
            // Store the token and user details in local storage
            localStorage.setItem('token', response.msg.token);
            localStorage.setItem('memberCode', response.msg.memberCode);
            localStorage.setItem('loginId', response.msg.loginId);
            
            // Navigate to the dashboard
            this.router.navigate(['/dashboard']);
          } else {
            alert('Login failed. Please check your credentials.');
          }
        },
        error: (error) => {
          console.error('Login error:', error);
          alert('An error occurred during login. Please try again.');
        }
      });
    } else {
      alert('Please fill in all required fields.');
    }
  }
}
