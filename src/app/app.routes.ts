import { Routes } from '@angular/router';
import { FileStatusComponent } from './file-status/file-status.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // Default path to login
  { path: 'login', component: LoginComponent }, 
  { path: 'dashboard', component: DashboardComponent }, 
  { path: 'file-status', component: FileStatusComponent }, 
  { path: '**', redirectTo: 'login' } // Catch-all for undefined routes
];
