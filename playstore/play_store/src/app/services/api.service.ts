import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private baseUrl = 'http://localhost:3000';
  constructor(private http: HttpClient) {}
  getToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    } else {
      return '';
    }
  }

  // Function to perform user registration
  registerUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/register`, userData);
  }

  // Function to perform user login
  loginUser(userData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, userData).pipe(
      tap((response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('userId', response.userId);
        localStorage.setItem('username', response.username);
      })
    );
  }
  logoutUser(token: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: token,
    });
    return this.http.post<any>(`${this.baseUrl}/auth/logout`, null, {
      headers,
    });
  }
  // Function to retrieve all users (accessible only to admins)
  getAllUsers(token: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: token,
    });
    return this.http.get<any>(`${this.baseUrl}/admin/users`, { headers });
  }

  // Function to create a new user (accessible only to admins)
  createUser(userData: any, token: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: token,
    });
    return this.http.post<any>(`${this.baseUrl}/admin/users`, userData, {
      headers,
    });
  }

  // Function to update user details (accessible only to admins)
  updateUser(userId: string, userData: any, token: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: token,
    });
    return this.http.put<any>(
      `${this.baseUrl}/admin/users/${userId}`,
      userData,
      { headers }
    );
  }

  // Function to delete a user (accessible only to admins)
  deleteUser(userId: string, token: string): Observable<any> {
    const headers = new HttpHeaders({
      Authorization: token,
    });
    return this.http.delete<any>(`${this.baseUrl}/admin/users/${userId}`, {
      headers,
    });
  }
  checkUsername(username: string): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}/check-username?username=${username}`
    );
  }
}
