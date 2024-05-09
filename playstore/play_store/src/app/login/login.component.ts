import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, animate, style } from '@angular/animations';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate(300, style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate(300, style({ opacity: 0 }))
      ])
    ])
  ]
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  showError: boolean = false;
  showSuccess: boolean = false;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      role: ['user', Validators.required],
      secretKey: [''],
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  login(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please enter valid credentials.';
      this.showError = true;
      setTimeout(() => this.showError = false, 3000);
      return;
    }
    const { username, password, role, secretKey } = this.loginForm.value;
    this.apiService.loginUser({ username, password, role, secretKey })
      .pipe(
        catchError(error => {
          this.handleError(error);
          return throwError(error);
        })
      )
      .subscribe(
        (response) => {
          if (response && response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('role', role); 
            this.successMessage = role === 'admin' ? 'Logging in as admin. Please wait...' : 'Logging in as user. Please wait...';
            this.showSuccess = true;
            setTimeout(() => {
              this.router.navigate(role === 'admin' ? ['/admin-dashboard'] : ['/user-dashboard']);
            }, 3000);
          } else {
            this.errorMessage = 'Login failed. Please check your credentials.';
            this.showError = true;
            setTimeout(() => this.showError = false, 3000);
          }
        }
      );
  }

  private handleError(error: any): void {
    this.errorMessage = 'Login failed. something went worng. Please try again later.';
    this.showError = true;
    setTimeout(() => this.showError = false, 3000);
    console.error('Login failed:', error);
  }
}
