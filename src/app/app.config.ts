import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { DemoLoginModel } from './models/demo-login.model';

// ✅ Real API Credentials
export const loginCredentials = {
  loginId: 'binay',
  password: 'Indi@17092024',
  secretKey: '1z2qd07L2j139PWoZ85coeYM74qksgDuueRLabRtywc=',
  memberCode: '08565'
};

// ✅ Demo Credentials using Model
export const demoLogin: DemoLoginModel = {
  demoLoginId: 'demo',
  demoPassword: '123'
};

export const baseUrl = 'http://192.168.1.131:3000';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideAnimationsAsync(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ]
};
