import re
from django.utils.deprecation import MiddlewareMixin
from api.models import ActivityLog

class ActivityLoggingMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # Only log successful (2xx) mutating requests by authenticated users
        if (
            hasattr(request, 'user') 
            and request.user 
            and not getattr(request.user, 'is_anonymous', True)
            and getattr(request.user, 'is_authenticated', False)
            and request.method in ('POST', 'PUT', 'PATCH', 'DELETE')
            and 200 <= response.status_code < 300
        ):
            path = request.path
            method = request.method
            action = f"{method} {path}"
            details = ""

            # Standardize actions for readability
            if "auth/register" in path:
                action = "USER_REGISTRATION"
                details = "Registered a new user account."
            elif "projects" in path:
                if method == "POST":
                    action = "CREATE_PROJECT"
                    details = "Created a new project."
                elif method in ("PUT", "PATCH"):
                    # Check if project ID is in URL
                    proj_id_match = re.search(r'/projects/([^/]+)/', path)
                    proj_id = proj_id_match.group(1) if proj_id_match else "unknown"
                    action = "UPDATE_PROJECT"
                    details = f"Updated project details (ID: {proj_id})."
                elif method == "DELETE":
                    proj_id_match = re.search(r'/projects/([^/]+)/', path)
                    proj_id = proj_id_match.group(1) if proj_id_match else "unknown"
                    action = "DELETE_PROJECT"
                    details = f"Deleted project (ID: {proj_id})."
            elif "tasks" in path:
                if "comment" in path:
                    task_id_match = re.search(r'/tasks/([^/]+)/comment/', path)
                    task_id = task_id_match.group(1) if task_id_match else "unknown"
                    action = "ADD_COMMENT"
                    details = f"Added a comment to task (ID: {task_id})."
                elif method == "POST":
                    action = "CREATE_TASK"
                    details = "Created a new task."
                elif method in ("PUT", "PATCH"):
                    task_id_match = re.search(r'/tasks/([^/]+)/', path)
                    task_id = task_id_match.group(1) if task_id_match else "unknown"
                    action = "UPDATE_TASK"
                    details = f"Updated task status/details (ID: {task_id})."
            elif "team" in path:
                if method == "POST":
                    action = "ADD_TEAM_MEMBER"
                    details = "Added a new member to the team roster."
            elif "notifications" in path:
                if method in ("PUT", "PATCH"):
                    action = "READ_NOTIFICATION"
                    details = "Marked notification as read."

            try:
                # Save the log to MongoDB
                ActivityLog(
                    user=request.user,
                    action=action,
                    details=details
                ).save()
            except Exception:
                # Fail silently so log errors don't crash user requests
                pass

        return response
