import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();
    if (!token || !req.url.startsWith(environment.apiUrl)) {
      return next.handle(req);
    }
    const authenticated = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next.handle(authenticated).pipe(
      catchError((error) => {
        if (error?.status === 401 && !req.url.includes('/auth/')) {
          void this.auth.clearSession();
        }
        return throwError(() => error);
      }),
    );
  }
}
