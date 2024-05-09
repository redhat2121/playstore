import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class RegisterComponent {
  registerForm: FormGroup;
  roles = ['user', 'admin'];
  successMsg: string = '';
  errorMsg: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private apiService: ApiService
  ) {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', Validators.required],
      secretKey: [''],
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const userData = this.registerForm.value;
      this.apiService.registerUser(userData)
        .pipe(
          catchError(error => {
            this.handleError(error);
            return throwError(error);
          })
        )
        .subscribe(
          (response) => {
            console.log(response);
            this.successMsg = `Registered as ${userData.role}. Thank you! Please login.`;
            this.errorMsg = '';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          }
        );
    }
  }

  private handleError(error: any): void {
    console.error(error);
    this.errorMsg = 'Error registering or username already exists. Please try again.';
  }
}
