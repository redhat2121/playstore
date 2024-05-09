import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { UserDashboardComponent } from './user-dashboard.component';
import { AppService } from '../services/app.service';
import { ApiService } from '../services/api.service';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Observable, of } from 'rxjs';

describe('UserDashboardComponent', () => {
  let component: UserDashboardComponent;
  let fixture: ComponentFixture<UserDashboardComponent>;
  let appService: AppService;
  let apiService: ApiService;

  const mockApplications = [
    { id: 1, name: 'App 1', description: 'Description 1' },
    { id: 2, name: 'App 2', description: 'Description 2' }
  ];

  const mockComments = [
    { id: 1, appId: 1, comment: 'Comment 1' },
    { id: 2, appId: 2, comment: 'Comment 2' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserDashboardComponent],
      providers: [AppService, ApiService],
      imports: [RouterTestingModule, HttpClientTestingModule],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserDashboardComponent);
    component = fixture.componentInstance;
    appService = TestBed.inject(AppService);
    apiService = TestBed.inject(ApiService);
    spyOn(appService, 'getApplications').and.returnValue(of(mockApplications));
    spyOn(appService, 'getComments').and.returnValue(of(mockComments));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load applications on initialization', () => {
    expect(appService.getApplications).toHaveBeenCalled();
    expect(component.applications).toEqual(mockApplications);
    expect(component.filteredApplications).toEqual(mockApplications);
  });

  it('should filter applications based on search query', () => {
    component.searchQuery = 'App 1';
    component.filterApplications();
    expect(component.filteredApplications.length).toBe(1);
    expect(component.filteredApplications[0].name).toBe('App 1');
  });

  it('should reset search query and display all applications', () => {
    component.searchQuery = 'App 1';
    component.resetSearch();
    expect(component.searchQuery).toBe('');
    expect(component.filteredApplications).toEqual(mockApplications);
  });

  it('should select application and load comments on selecting', fakeAsync(() => {
    const application = mockApplications[0];
    component.onSelectApplication(application);
    expect(appService.getComments).toHaveBeenCalledWith(application.id);
    tick();
    expect(component.selectedApplication).toBe(application);
    expect(component.showingReviews).toBeTrue();
    expect(component.commentDataWithUsernames.length).toBe(mockComments.length);
  }));

  it('should toggle showing reviews', () => {
    component.selectedApplication = mockApplications[0];
    component.showingReviews = false;
    component.toggleCommentsAndRatings();
    expect(component.showingReviews).toBeTrue();
    component.toggleCommentsAndRatings();
    expect(component.showingReviews).toBeFalse();
  });

  it('should add comment and rating', () => {
    component.selectedApplication = mockApplications[0];
    component.comment = 'New comment';
    component.rating = 5;
    spyOn(appService, 'addCommentAndRating').and.returnValue(of({}));
    component.onSubmitCommentOrRating();
    expect(appService.addCommentAndRating).toHaveBeenCalledWith(
      component.selectedApplication.id,
      { comment: component.comment, rating: component.rating }
    );
    expect(component.comment).toBe('');
    expect(component.rating).toBe(0);
  });

  it('should delete comment', () => {
    const commentUUID = mockComments[0].id;
    component.selectedApplication = mockApplications[0];
    spyOn(appService, 'deleteComment').and.returnValue(of({}));
    component.onDeleteComment(commentUUID);
    expect(appService.deleteComment).toHaveBeenCalledWith(
      component.selectedApplication.id,
      commentUUID
    );
    expect(component.selectedApplication.reviews.length).toBe(1);
  });

  it('should log out user', () => {
    spyOn(apiService, 'getToken').and.returnValue('token');
    spyOn(apiService, 'logoutUser').and.returnValue(of({}));
    spyOn(localStorage, 'removeItem');
    spyOn(component.router, 'navigate');
    component.logout();
    expect(apiService.getToken).toHaveBeenCalled();
    expect(apiService.logoutUser).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('username');
    expect(localStorage.removeItem).toHaveBeenCalledWith('userId');
    expect(component.router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
