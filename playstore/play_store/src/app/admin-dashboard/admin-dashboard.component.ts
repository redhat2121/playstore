import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { AppService } from '../services/app.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  users: any[] = [];
  editMode: boolean = false;
  editUserId: string = '';
  userForm!: FormGroup;
  successMsg: string = '';
  errorMsg: string = '';
  token: string = ''; 
  applications: any[] = [];
  appForm: FormGroup;
  newAppData: any = {};
  showUserCrud: boolean = true;
  showAppCrud: boolean = false;
  selectedApp: any = null;

  constructor(
    private apiService: ApiService,
    private formBuilder: FormBuilder,
    private router: Router,
    private appService: AppService,
    private snackBar: MatSnackBar 
  ) {
    this.appForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      version: ['', Validators.required],
      genre: ['', Validators.required],
      visibility: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.token = this.apiService.getToken();
    this.loadUsers();
    this.initUserForm();
    this.loadApplications();
  }

  // Function to display success message using MatSnackBar
  setSuccessMessage(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['snackbar-success'], 
    });
  }

  // Function to display error message using MatSnackBar
  setErrorMessage(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['snackbar-error'],
    });
  }

  loadUsers() {
    this.apiService.getAllUsers(this.token).subscribe(
      (response) => {
        this.users = response;
      },
      (error) => {
        console.error('Error loading users:', error);
      }
    );
  }

  initUserForm() {
    this.userForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
    });
  }

  createUser() {
    if (this.userForm.valid) {
      const userData = this.userForm.value;
      this.apiService.createUser(userData, this.token).subscribe(
        (response) => {
          this.setSuccessMessage('User created successfully, Loading users...');
          this.loadUsers();
          this.userForm.reset();
        },
        (error) => {
          this.setErrorMessage('Error creating user');
          console.error(error);
        }
      );
    }
  }

  updateUser() {
    if (this.userForm.valid && this.editUserId) {
      const userData = this.userForm.value;
      this.apiService
        .updateUser(this.editUserId, userData, this.token)
        .subscribe(
          (response) => {
            this.setSuccessMessage('User updated successfully');
            this.loadUsers();
            this.cancelEdit();
          },
          (error) => {
            this.setErrorMessage('Error updating user');
            console.error('Error updating user:', error);
          }
        );
    }
  }

  deleteUser(userId: string) {
    const snackBarRef = this.snackBar.open('Are you sure you want to delete this user?', 'Yes', {
      duration: 0, // Snackbar stays until action is taken
      panelClass: ['snackbar-delete'],
    });
  
    snackBarRef.onAction().subscribe(() => {
      // If user clicks on "Yes"
      this.apiService.deleteUser(userId, this.token).subscribe(
        (response) => {
          this.setSuccessMessage('User deleted successfully');
          this.loadUsers(); // Reload users after deletion
        },
        (error) => {
          this.setErrorMessage('Error deleting user');
          console.error('Error deleting user:', error);
        }
      );
    });
  
    snackBarRef.afterDismissed().subscribe((info) => {
      if (!info.dismissedByAction) {
        this.setErrorMessage('Deletion canceled');
      }
    });
  }
  
  
  

  editUser(user: any) {
    this.editMode = true;
    this.editUserId = user._id;
    this.userForm.patchValue({
      username: user.username,
      password: '',
      email: user.email,
      role: user.role,
    });
  }

  cancelEdit() {
    this.editMode = false;
    this.editUserId = '';
    this.userForm.reset();
  }

  logout() {
    this.apiService.logoutUser(this.token).subscribe(
      () => {
        localStorage.removeItem('token');
        this.setSuccessMessage('Logging you out, please wait...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      (error) => {
        this.setErrorMessage('Error logging out');
        console.error('Error logging out:', error);
      }
    );
  }

  loadApplications(): void {
    this.appService.getApplications().subscribe(
      (data) => {
        this.applications = data;
      },
      (error) => {
        this.setErrorMessage('Error while loading apps');
        console.error('Error loading applications:', error);
      }
    );
  }

  createApplication(): void {
    if (this.appForm.valid) {
      const applicationData = this.appForm.value;
      this.appService.createApplication(applicationData).subscribe(
        (data) => {
          this.setSuccessMessage('App created successfully');
          this.loadApplications();
          this.appForm.reset();
        },
        (error) => {
          this.setErrorMessage('Error creating app');
          console.error('Error creating application:', error);
        }
      );
    }
  }
  

  editApp(app: any): void {
    this.editMode = true;
    this.selectedApp = app;
    this.appForm.patchValue({
      name: app.name,
      description: app.description,
      version: app.version,
      genre: app.genre,
      visibility: app.visibility,
    });
  }

  updateApp(): void {
    if (this.selectedApp) {
      const appId = this.selectedApp._id;
      const formData = this.appForm.value;
      this.appService.updateApplication(appId, formData).subscribe(
        () => {
          const updatedAppIndex = this.applications.findIndex(
            (app) => app._id === appId
          );
          if (updatedAppIndex !== -1) {
            this.applications[updatedAppIndex] = formData;
          }
          this.setSuccessMessage('App updated successfully')
          this.appForm.reset();
          this.editMode = false;
          this.selectedApp = null;
        },
        (error) => {
          this.setErrorMessage('Error updating app');
          console.error('Error updating app:', error);
        }
      );
    } else {
      this.setErrorMessage('No application selected for editing');
      console.error('No application selected for editing.');
    }
  }

  deleteApplication(applicationId: string): void {
    const snackBarRef = this.snackBar.open(
      'Are you sure you want to delete this application?', 
      'Yes'
    );
  
    snackBarRef.onAction().subscribe(() => {
      this.appService.deleteApplication(applicationId).subscribe(
        () => {
          this.setSuccessMessage('App deleted successfully');
          this.loadApplications();
        },
        (error) => {
          this.setErrorMessage('Error deleting application');
          console.error('Error deleting application:', error);
        }
      );
    });
  }
  

  toggleUserCrud(): void {
    this.showUserCrud = true;
    this.showAppCrud = false;
  }

  toggleAppCrud(): void {
    this.showUserCrud = false;
    this.showAppCrud = true;
  }
}
