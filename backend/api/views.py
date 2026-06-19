import bcrypt
import re
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import PermissionDenied, NotFound

from api.models import User, TeamMember, Project, Task, Notification, ActivityLog, ProjectComment
from api.authentication import generate_tokens, decode_refresh_token

def check_permission(user, allowed_roles):
    """Helper to check if user role is in the allowed list."""
    if user.role not in allowed_roles:
        raise PermissionDenied("You do not have permission to perform this action.")

def update_project_progress(project):
    """Recalculate project progress based on completed tasks."""
    total_tasks = Task.objects(project=project).count()
    if total_tasks == 0:
        project.progress = 0
    else:
        completed_tasks = Task.objects(project=project, status='completed').count()
        project.progress = int((completed_tasks / total_tasks) * 100)
    project.save()

def update_member_workload(member):
    """Recalculate team member workload score (number of non-completed tasks)."""
    if member:
        open_tasks = Task.objects(assigned_to=member, status__ne='completed').count()
        member.workload_score = open_tasks
        member.save()

# ================= AUTHENTICATION VIEWS =================

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        role = request.data.get('role', 'developer')

        if not all([email, password, first_name, last_name]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects(email=email).first():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        # Hash password using bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Create user
        user = User(
            email=email,
            password=hashed_password,
            first_name=first_name,
            last_name=last_name,
            role=role
        )
        user.save()

        # Create team member profile automatically
        member = TeamMember(user=user)
        member.save()

        tokens = generate_tokens(user)
        return Response({
            'user': user.to_dict(),
            'tokens': tokens
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({'error': 'Email and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects(email=email).first()
        if not user:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        # Support legacy pbkdf2 passwords as well as new bcrypt passwords
        password_matched = False
        if user.password.startswith('pbkdf2_'):
            from django.contrib.auth.hashers import check_password
            password_matched = check_password(password, user.password)
        else:
            try:
                password_matched = bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))
            except Exception:
                password_matched = False

        if not password_matched:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = generate_tokens(user)
        return Response({
            'user': user.to_dict(),
            'tokens': tokens
        }, status=status.HTTP_200_OK)

class RefreshTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = decode_refresh_token(refresh)
            user_id = payload.get('user_id')
            user = User.objects(id=user_id).first()
            if not user:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

            tokens = generate_tokens(user)
            return Response({'access': tokens['access']}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_401_UNAUTHORIZED)

# ================= PROJECT VIEWS =================

class ProjectListCreateView(APIView):
    def get(self, request):
        # Support search and status/priority filters
        query = Project.objects
        
        search = request.query_params.get('search')
        if search:
            query = query.filter(name__icontains=search)
            
        proj_status = request.query_params.get('status')
        if proj_status:
            query = query.filter(status=proj_status)
            
        priority = request.query_params.get('priority')
        if priority:
            query = query.filter(priority=priority)

        projects = query.order_by('-created_at')
        return Response([p.to_dict() for p in projects], status=status.HTTP_200_OK)

    def post(self, request):
        check_permission(request.user, ['admin', 'project_manager'])

        name = request.data.get('name')
        description = request.data.get('description', '')
        start_date_str = request.data.get('start_date')
        deadline_str = request.data.get('deadline')
        priority = request.data.get('priority', 'medium')
        status_val = request.data.get('status', 'planning')
        member_ids = request.data.get('team_members', [])

        if not all([name, start_date_str, deadline_str]):
            return Response({'error': 'Name, start date, and deadline are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)

        members = []
        for mid in member_ids:
            m = TeamMember.objects(id=mid).first()
            if m:
                members.append(m)

        project = Project(
            name=name,
            description=description,
            start_date=start_date,
            deadline=deadline,
            priority=priority,
            status=status_val,
            team_members=members
        )
        project.save()
        return Response(project.to_dict(), status=status.HTTP_201_CREATED)

class ProjectDetailView(APIView):
    def get_object(self, pk):
        try:
            return Project.objects.get(id=pk)
        except Exception:
            raise NotFound("Project not found.")

    def get(self, request, pk):
        project = self.get_object(pk)
        return Response(project.to_dict(), status=status.HTTP_200_OK)

    def put(self, request, pk):
        check_permission(request.user, ['admin', 'project_manager'])
        project = self.get_object(pk)
        old_status = project.status
        old_deadline = project.deadline

        name = request.data.get('name')
        if name:
            project.name = name
        if 'description' in request.data:
            project.description = request.data.get('description')
        
        start_date_str = request.data.get('start_date')
        if start_date_str:
            try:
                project.start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            except ValueError:
                return Response({'error': 'Invalid start date format'}, status=status.HTTP_400_BAD_REQUEST)
                
        deadline_str = request.data.get('deadline')
        if deadline_str:
            try:
                project.deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
            except ValueError:
                return Response({'error': 'Invalid deadline format'}, status=status.HTTP_400_BAD_REQUEST)

        if 'priority' in request.data:
            project.priority = request.data.get('priority')
        if 'status' in request.data:
            project.status = request.data.get('status')
            
        if 'team_members' in request.data:
            member_ids = request.data.get('team_members', [])
            members = []
            for mid in member_ids:
                m = TeamMember.objects(id=mid).first()
                if m:
                    members.append(m)
            project.team_members = members

        project.save()
        update_project_progress(project)

        actor = f"{request.user.first_name} {request.user.last_name}"
        # System comment: status change
        if 'status' in request.data and project.status != old_status:
            create_system_comment(
                project,
                f"🔄 Project status changed from **{old_status}** to **{project.status}** by {actor}."
            )
        # System comment: deadline change
        if deadline_str and old_deadline and project.deadline != old_deadline:
            create_system_comment(
                project,
                f"📅 Project deadline updated to **{project.deadline.strftime('%b %d, %Y')}** by {actor}."
            )

        return Response(project.to_dict(), status=status.HTTP_200_OK)

    def delete(self, request, pk):
        check_permission(request.user, ['admin'])
        project = self.get_object(pk)
        
        # Delete related tasks
        Task.objects(project=project).delete()
        project.delete()
        
        return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)

# ================= TASK VIEWS =================

class TaskListCreateView(APIView):
    def get(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project ID parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            proj = Project.objects.get(id=project_id)
        except Exception:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        tasks = Task.objects(project=proj).order_by('due_date')
        return Response([t.to_dict() for t in tasks], status=status.HTTP_200_OK)

    def post(self, request):
        project_id = request.data.get('project')
        title = request.data.get('title')
        description = request.data.get('description', '')
        assignee_id = request.data.get('assigned_to')
        due_date_str = request.data.get('due_date')
        status_val = request.data.get('status', 'not_started')

        if not all([project_id, title, due_date_str]):
            return Response({'error': 'Project, title, and due date are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            proj = Project.objects.get(id=project_id)
        except Exception:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
        except ValueError:
            return Response({'error': 'Invalid due date format'}, status=status.HTTP_400_BAD_REQUEST)

        assignee = None
        if assignee_id:
            assignee = TeamMember.objects(id=assignee_id).first()

        task = Task(
            project=proj,
            title=title,
            description=description,
            assigned_to=assignee,
            status=status_val,
            due_date=due_date
        )
        task.save()
        
        # Recalculate project progress
        update_project_progress(proj)
        # Recalculate assignee workload
        if assignee:
            update_member_workload(assignee)

        # Trigger notification for assignment
        if assignee and assignee.user:
            Notification(
                user=assignee.user,
                title="New Task Assigned",
                message=f"You have been assigned to task: '{title}' under project '{proj.name}'.",
                type='assignment'
            ).save()

        # System comment: task created
        assignee_name = f"{assignee.user.first_name} {assignee.user.last_name}" if assignee and assignee.user else "Unassigned"
        create_system_comment(
            proj,
            f"✅ Task **\"{title}\"** was created and assigned to **{assignee_name}**."
        )

        return Response(task.to_dict(), status=status.HTTP_201_CREATED)

class TaskDetailView(APIView):
    def get_object(self, pk):
        try:
            return Task.objects.get(id=pk)
        except Exception:
            raise NotFound("Task not found.")

    def get(self, request, pk):
        task = self.get_object(pk)
        return Response(task.to_dict(), status=status.HTTP_200_OK)

    def put(self, request, pk):
        task = self.get_object(pk)
        old_assignee = task.assigned_to

        if 'title' in request.data:
            task.title = request.data.get('title')
        if 'description' in request.data:
            task.description = request.data.get('description')
        
        due_date_str = request.data.get('due_date')
        if due_date_str:
            try:
                task.due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
            except ValueError:
                return Response({'error': 'Invalid due date format'}, status=status.HTTP_400_BAD_REQUEST)

        if 'status' in request.data:
            task.status = request.data.get('status')

        new_assignee_id = request.data.get('assigned_to')
        if 'assigned_to' in request.data:
            if new_assignee_id:
                task.assigned_to = TeamMember.objects(id=new_assignee_id).first()
            else:
                task.assigned_to = None

        old_status_before_save = task.status
        task.save()
        
        # Update metrics
        update_project_progress(task.project)
        if old_assignee:
            update_member_workload(old_assignee)
        if task.assigned_to and task.assigned_to != old_assignee:
            update_member_workload(task.assigned_to)
            
            # Send Notification
            if task.assigned_to.user:
                Notification(
                    user=task.assigned_to.user,
                    title="New Task Assigned",
                    message=f"You have been assigned to task: '{task.title}' under project '{task.project.name}'.",
                    type='assignment'
                ).save()
            # System comment: assignee changed
            new_name = f"{task.assigned_to.user.first_name} {task.assigned_to.user.last_name}" if task.assigned_to.user else "Unknown"
            create_system_comment(
                task.project,
                f"👤 Task **\"{task.title}\"** was reassigned to **{new_name}**."
            )

        # System comment: status changed
        if 'status' in request.data:
            new_status = request.data.get('status')
            if new_status != old_status_before_save:
                if new_status == 'completed':
                    create_system_comment(
                        task.project,
                        f"🎉 Task **\"{task.title}\"** was marked as **Completed**."
                    )
                else:
                    label = new_status.replace('_', ' ').title()
                    create_system_comment(
                        task.project,
                        f"🔄 Task **\"{task.title}\"** status changed to **{label}**."
                    )

        # System comment: due date changed
        if due_date_str:
            create_system_comment(
                task.project,
                f"📅 Deadline for task **\"{task.title}\"** was updated to **{task.due_date.strftime('%b %d, %Y')}**."
            )

        return Response(task.to_dict(), status=status.HTTP_200_OK)

    def delete(self, request, pk):
        task = self.get_object(pk)
        proj = task.project
        assignee = task.assigned_to
        
        task.delete()
        update_project_progress(proj)
        if assignee:
            update_member_workload(assignee)
            
        return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)

class TaskCommentView(APIView):
    def post(self, request, pk):
        try:
            task = Task.objects.get(id=pk)
        except Exception:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

        comment_text = request.data.get('comment')
        if not comment_text:
            return Response({'error': 'Comment content is required'}, status=status.HTTP_400_BAD_REQUEST)

        comment = {
            'author': f"{request.user.first_name} {request.user.last_name}",
            'comment': comment_text,
            'created_at': datetime.utcnow()
        }
        task.comments.append(comment)
        task.save()
        return Response(task.to_dict(), status=status.HTTP_200_OK)

# ================= TEAM VIEWS =================

class TeamListView(APIView):
    def get(self, request):
        members = TeamMember.objects.all()
        return Response([m.to_dict() for m in members], status=status.HTTP_200_OK)

    def post(self, request):
        # Update skills or status for an existing team member
        member_id = request.data.get('id')
        skills = request.data.get('skills')
        status_val = request.data.get('status')

        if not member_id:
            return Response({'error': 'Team Member ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        member = TeamMember.objects(id=member_id).first()
        if not member:
            return Response({'error': 'Team Member not found'}, status=status.HTTP_404_NOT_FOUND)

        if skills is not None:
            member.skills = skills
        if status_val is not None:
            member.status = status_val

        member.save()
        return Response(member.to_dict(), status=status.HTTP_200_OK)

# ================= NOTIFICATION VIEWS =================

class NotificationListView(APIView):
    def get(self, request):
        # Get notifications for logged-in user, unread first
        notifications = Notification.objects(user=request.user).order_by('is_read', '-created_at')
        return Response([n.to_dict() for n in notifications], status=status.HTTP_200_OK)

class NotificationReadView(APIView):
    def put(self, request, pk):
        try:
            notification = Notification.objects.get(id=pk, user=request.user)
            notification.is_read = True
            notification.save()
            return Response(notification.to_dict(), status=status.HTTP_200_OK)
        except Exception:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

# ================= ANALYTICS VIEWS =================

class AnalyticsOverviewView(APIView):
    def get(self, request):
        now = datetime.utcnow()
        upcoming_date = now + timedelta(days=14)
        seven_days = now + timedelta(days=7)

        # ── 1. BATCH: Fetch all projects & all tasks in ONE query each ──────────
        # This replaces 5+ individual .count() round-trips to Atlas.
        all_projects = list(Project.objects.only(
            'id', 'name', 'status', 'progress', 'deadline'
        ))
        all_tasks = list(Task.objects.only(
            'id', 'title', 'status', 'due_date'
        ))

        # Compute widget counts in Python — zero extra DB queries
        total_projects = len(all_projects)
        active_projects = sum(1 for p in all_projects if p.status == 'active')
        completed_projects = sum(1 for p in all_projects if p.status == 'completed')
        overdue_tasks = sum(
            1 for t in all_tasks
            if t.status != 'completed' and t.due_date and t.due_date < now
        )

        # ── 2. Upcoming deadlines (projects + tasks) ─────────────────────────
        upcoming_projects = [
            p for p in all_projects
            if p.status != 'completed'
            and p.deadline
            and now <= p.deadline <= upcoming_date
        ]
        upcoming_deadlines_count = len(upcoming_projects)

        deadlines_list = []
        for p in sorted(upcoming_projects, key=lambda x: x.deadline)[:5]:
            deadlines_list.append({
                'id': str(p.id),
                'type': 'project',
                'name': p.name,
                'due_date': p.deadline.isoformat(),
                'days_left': (p.deadline - now).days
            })

        upcoming_task_items = [
            t for t in all_tasks
            if t.status != 'completed'
            and t.due_date
            and now <= t.due_date <= seven_days
        ]
        for t in sorted(upcoming_task_items, key=lambda x: x.due_date)[:5]:
            deadlines_list.append({
                'id': str(t.id),
                'type': 'task',
                'name': t.title,
                'due_date': t.due_date.isoformat(),
                'days_left': (t.due_date - now).days
            })

        deadlines_list = sorted(deadlines_list, key=lambda x: x['days_left'])[:5]

        # ── 3. Project progress (already fetched) ────────────────────────────
        project_progress_data = [
            {'name': p.name, 'progress': p.progress}
            for p in sorted(all_projects, key=lambda x: (x.deadline or now))
        ][:10]

        # ── 4. Task distribution (computed from in-memory list) ──────────────
        task_distribution = [
            {'name': 'Not Started',  'value': sum(1 for t in all_tasks if t.status == 'not_started')},
            {'name': 'In Progress',  'value': sum(1 for t in all_tasks if t.status == 'in_progress')},
            {'name': 'Under Review', 'value': sum(1 for t in all_tasks if t.status == 'under_review')},
            {'name': 'Completed',    'value': sum(1 for t in all_tasks if t.status == 'completed')},
        ]

        # ── 5. Team workload — ONE query, resolve references in bulk ─────────
        # select_related fetches the referenced User documents in the same query.
        members = list(TeamMember.objects(status='active').select_related())
        team_performance = []
        for m in members:
            user_name = "Unknown Member"
            try:
                if m.user:
                    user_name = f"{m.user.first_name} {m.user.last_name}"
            except Exception:
                pass
            team_performance.append({'name': user_name, 'workload': m.workload_score})

        # ── 6. Recent activity — ONE query, resolve references in bulk ────────
        logs = list(ActivityLog.objects.order_by('-created_at').limit(10).select_related())
        recent_activities = []
        for l in logs:
            user_name = "System"
            try:
                if l.user:
                    user_name = f"{l.user.first_name} {l.user.last_name}"
            except Exception:
                pass
            recent_activities.append({
                'id': str(l.id),
                'user': user_name,
                'action': l.action,
                'details': l.details,
                'created_at': l.created_at.isoformat()
            })

        # ── 7. Reminder banners ───────────────────────────────────────────────
        reminders = []
        if overdue_tasks > 0:
            reminders.append({
                'type': 'danger',
                'message': f"CRITICAL: There are {overdue_tasks} overdue tasks requiring immediate attention."
            })
        for p in upcoming_projects:
            if p.progress < 50 and p.deadline and (p.deadline - now).days <= 7:
                reminders.append({
                    'type': 'warning',
                    'message': f"WARNING: Project '{p.name}' is due in {(p.deadline - now).days} days and is only {p.progress}% complete."
                })

        return Response({
            'widgets': {
                'total_projects': total_projects,
                'active_projects': active_projects,
                'completed_projects': completed_projects,
                'overdue_tasks': overdue_tasks,
                'upcoming_deadlines': upcoming_deadlines_count
            },
            'deadlines': deadlines_list,
            'team_workloads': team_performance,
            'project_progress': project_progress_data,
            'task_distribution': task_distribution,
            'recent_activities': recent_activities,
            'reminders': reminders
        }, status=status.HTTP_200_OK)

# ================= DISCUSSION / COMMENTS VIEWS =================

def create_system_comment(project, message):
    try:
        comment = ProjectComment(
            project=project,
            author=None,
            message=message,
            is_system=True
        )
        comment.save()
    except Exception:
        pass

class ProjectCommentListView(APIView):
    def get(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Exception:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        comments = ProjectComment.objects(project=project).order_by('created_at')
        return Response([c.to_dict() for c in comments], status=status.HTTP_200_OK)

    def post(self, request, project_id):
        try:
            project = Project.objects.get(id=project_id)
        except Exception:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        message = request.data.get('message')
        parent_id = request.data.get('parent_id')

        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        parent = None
        if parent_id:
            try:
                parent = ProjectComment.objects.get(id=parent_id)
            except Exception:
                return Response({'error': 'Parent comment not found'}, status=status.HTTP_400_BAD_REQUEST)

        comment = ProjectComment(
            project=project,
            author=request.user,
            message=message,
            parent=parent,
            is_system=False
        )
        comment.save()
        return Response(comment.to_dict(), status=status.HTTP_201_CREATED)

class CommentDetailView(APIView):
    def put(self, request, pk):
        try:
            comment = ProjectComment.objects.get(id=pk)
        except Exception:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check permissions: author of the comment or admin or project manager
        if comment.author != request.user and request.user.role not in ['admin', 'project_manager']:
            return Response({'error': 'You do not have permission to edit this comment.'}, status=status.HTTP_403_FORBIDDEN)

        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message content is required'}, status=status.HTTP_400_BAD_REQUEST)

        comment.message = message
        comment.updated_at = datetime.utcnow()
        comment.save()
        return Response(comment.to_dict(), status=status.HTTP_200_OK)

    def delete(self, request, pk):
        try:
            comment = ProjectComment.objects.get(id=pk)
        except Exception:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

        # Check permissions: author or admin or project manager
        if comment.author != request.user and request.user.role not in ['admin', 'project_manager']:
            return Response({'error': 'You do not have permission to delete this comment.'}, status=status.HTTP_403_FORBIDDEN)

        # Delete all replies recursively
        ProjectComment.objects(parent=comment).delete()
        comment.delete()
        return Response({'success': True}, status=status.HTTP_200_OK)

