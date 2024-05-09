import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class AppService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (typeof localStorage !== 'undefined' && localStorage.getItem('token')) {
      headers = headers.set(
        'Authorization',
        `${localStorage.getItem('token')}`
      );
    }
    return headers;
  }

  // Function to get all applications
  getApplications(): Observable<any> {
    const url = `${this.baseUrl}/applications`;
    return this.http.get(url, { headers: this.getHeaders() });
  }

  // Function to create a new application
  createApplication(applicationData: any): Observable<any> {
    const url = `${this.baseUrl}/applications`;
    return this.http.post(url, applicationData, { headers: this.getHeaders() });
  }

  // Function to update an application
  updateApplication(
    applicationId: string,
    applicationData: any
  ): Observable<any> {
    const url = `${this.baseUrl}/applications/${applicationId}`;
    return this.http.put(url, applicationData, { headers: this.getHeaders() });
  }

  // Function to delete an application
  deleteApplication(applicationId: string): Observable<any> {
    const url = `${this.baseUrl}/applications/${applicationId}`;
    return this.http.delete(url, { headers: this.getHeaders() });
  }
  // Function to get comments for a specific application
  getComments(applicationId: string): Observable<any> {
    const url = `${this.baseUrl}/applications/${applicationId}/comments`;
    return this.http.get(url, { headers: this.getHeaders() });
  }
  addCommentAndRating(
    applicationId: string,
    commentData: { comment: string; rating: number }
  ): Observable<any> {
    const headers = this.getHeaders();
    return this.http.post<any>(
      `${this.baseUrl}/applications/${applicationId}/comments`,
      commentData,
      { headers }
    );
  }

  // Delete comment from an application
  deleteComment(applicationId: string, commentUUID: string): Observable<any> {
    const headers = this.getHeaders();
    return this.http.delete<any>(
      `${this.baseUrl}/applications/${applicationId}/comments/${commentUUID}`,
      { headers }
    );
  }
}