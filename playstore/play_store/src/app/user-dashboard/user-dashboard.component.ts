import { Component, OnInit } from '@angular/core';
import { AppService } from '../services/app.service';
import { ApiService } from '../services/api.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
})
export class UserDashboardComponent implements OnInit {
  applications: any[] = [];
  filteredApplications: any[] = [];
  selectedApplication: any = null;
  comment: string = '';
  rating: number = 0;
  loggedInUserId: string = '';
  loggedInUsername: string = '';
  searchQuery: string = '';
  showingReviews: boolean = false;
  loading: boolean = false;
  showingComments: boolean = false;
  showingRatings: boolean= false;

  constructor(
    private appService: AppService,
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadApplications();
    if (typeof localStorage !== 'undefined') {
      this.loggedInUsername = localStorage.getItem('username') || '';
      this.showSnackBar(`Welcome, ${this.loggedInUsername}!`);
    }
  }

  loadApplications(): void {
    this.appService.getApplications().subscribe(
      (data) => {
        this.applications = data;
        // Initially, set filteredApplications to applications
        this.filteredApplications = [...this.applications];
      },
      (error) => {
        console.error('Error loading applications:', error);
      }
    );
  }

  filterApplications(): void {
    if (!this.searchQuery.trim()) {
      this.filteredApplications = [...this.applications];
      return;
    }
    this.filteredApplications = this.applications.filter((application) => {
      return application.name
        .toLowerCase()
        .includes(this.searchQuery.trim().toLowerCase());
    });
  }

  // Method to reset search query and display all applications
  resetSearch(): void {
    this.searchQuery = '';
    this.filteredApplications = [...this.applications];
  }

  async onSelectApplication(application: any): Promise<void> {
    this.selectedApplication = application;
    const selectedAppElement = document.querySelector('.selected-application');
    selectedAppElement?.classList.add('active');
    selectedAppElement?.scrollIntoView({ behavior: 'smooth' });
    this.showingComments = false;
    this.showingRatings = false;
    this.showingReviews = false;
  
    try {
      const comments: { comment: string, uuid: string }[] = await this.appService
        .getComments(application._id)
        .toPromise();
      const ratings: { rating: number, uuid: string }[] = application.ratings || []; 
      // Clear existing reviews
      this.selectedApplication.reviews = [];
  
      // Add comments to reviews array
      comments.forEach((comment) => {
        this.selectedApplication.reviews.push({
          ...comment,
          type: 'comment',
        });
      });
  
      // Add ratings to reviews array
      ratings.forEach((rating) => {
        this.selectedApplication.reviews.push({
          ...rating,
          type: 'rating',
        });
      });
  
      this.showingReviews = true; // Show reviews section
    } catch (error) {
      console.error('Error loading comments and ratings:', error);
    }
  }
  

  toggleCommentsAndRatings(): void {
    this.showingReviews = !this.showingReviews; // Toggle showingReviews flag
    if (this.showingReviews && !this.selectedApplication.reviews) {
      // Load ratings if not already loaded
      this.onSelectApplication(this.selectedApplication);
    }
  }

  onSubmitCommentOrRating(): void {
    if (!this.selectedApplication) {
      return;
    }
  
    if (this.comment !== '' || this.rating !== 0) {
      const commentAndRatingData: { comment: string; rating: number } = {
        comment: this.comment || '',
        rating: this.rating || 0,
      };
  
      this.appService.addCommentAndRating(this.selectedApplication._id, commentAndRatingData)
        .subscribe(
          (data) => {
            if (this.comment) {
              const commentWithUsername = {
                comment: this.comment,
                type: 'comment',
                userId: this.loggedInUserId, // Add userId to identify the comment owner
              };
              this.selectedApplication.reviews.push(commentWithUsername);
            }
  
            if (this.rating !== 0) {
              const ratingWithUsername = {
                rating: this.rating,
                type: 'rating',
                userId: this.loggedInUserId, // Add userId to identify the rating owner
              };
              this.selectedApplication.reviews.push(ratingWithUsername);
            }
  
            // Clear input fields
            this.comment = '';
            this.rating = 0;

            this.showSnackBar('Comment or rating added successfully.');
          },
          (error) => {
            console.error('Error adding comment or rating:', error);
            this.showSnackBar('Failed to add comment or rating. Please try again.');
          }
        );
    } else {
      // Handle error case
      console.error('Comment or rating cannot be empty.');
      this.showSnackBar('Comment or rating cannot be empty.');
    }
  }
  
  // Define the isCommentOwner method
  isCommentOwner(commentUserId: string): boolean {
    return commentUserId === this.loggedInUserId;
  }

  onDeleteReview(reviewUUID: string): void {
    if (!this.selectedApplication) {
      return;
    }

    this.appService.deleteComment(this.selectedApplication._id, reviewUUID)
      .subscribe(
        () => {
          // Remove the deleted review from the UI
          const index = this.selectedApplication.reviews.findIndex((review: any) => {
            return review.uuid === reviewUUID;
          });

          if (index !== -1) {
            this.selectedApplication.reviews.splice(index, 1);
            this.showSnackBar('Review deleted successfully.');
          }
        },
        (error) => {
          console.error('Error deleting review:', error);
          this.showSnackBar('Failed to delete review. Please try again.');
        }
      );
  }

  onInstallApplication(applicationId: string): void {
    // Show loading message
    this.loading = true;

    setTimeout(() => {
      this.loading = false;
      this.showSnackBar('App installed successfully');
    }, 3000);
  }

  logout() {
    const token = this.apiService.getToken();
    this.apiService.logoutUser(token).subscribe(
      () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        this.showSnackBar(`Goodbye, ${this.loggedInUsername}! see you again.......`);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      (error) => {
        console.error('Error logging out:', error);
        this.showSnackBar('Failed to logout. Please try again.');
      }
    );
  }

  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
    });
  }
}
