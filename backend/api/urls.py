from django.urls import path
from api import views

urlpatterns = [
    # Authentication
    path('auth/register/', views.RegisterView.as_view(), name='auth-register'),
    path('auth/login/', views.LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', views.RefreshTokenView.as_view(), name='auth-refresh'),

    # Projects
    path('projects/', views.ProjectListCreateView.as_view(), name='project-list-create'),
    path('projects/<str:pk>/', views.ProjectDetailView.as_view(), name='project-detail'),
    path('projects/<str:project_id>/comments/', views.ProjectCommentListView.as_view(), name='project-comments'),
    path('comments/<str:pk>/', views.CommentDetailView.as_view(), name='comment-detail'),

    # Tasks
    path('tasks/', views.TaskListCreateView.as_view(), name='task-list-create'),
    path('tasks/<str:pk>/', views.TaskDetailView.as_view(), name='task-detail'),
    path('tasks/<str:pk>/comment/', views.TaskCommentView.as_view(), name='task-comment'),

    # Team
    path('team/', views.TeamListView.as_view(), name='team-list'),
    path('team/<str:pk>/', views.TeamMemberDetailView.as_view(), name='team-member-detail'),

    # Notifications
    path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/<str:pk>/read/', views.NotificationReadView.as_view(), name='notification-read'),

    # Analytics
    path('analytics/overview/', views.AnalyticsOverviewView.as_view(), name='analytics-overview'),
]
