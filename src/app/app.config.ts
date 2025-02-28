// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
//import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

// Export base URL separately for reuse http://192.168.1.112:8000
export const baseUrl = 'http://127.0.0.1:8000';


export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAnimations(), provideAnimationsAsync(),
    //provideCharts(withDefaultRegisterables()) // Required for PrimeNG animations
    
  ]
};