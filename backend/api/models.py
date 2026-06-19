from datetime import datetime
from mongoengine import Document, StringField, DateTimeField, ReferenceField, ListField, IntField, BooleanField, DictField

class User(Document):
    meta = {'collection': 'users'}
    
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    first_name = StringField(required=True)
    last_name = StringField(required=True)
    role = StringField(choices=['admin', 'project_manager', 'developer', 'viewer'], default='developer')
    created_at = DateTimeField(default=datetime.utcnow)

    # DRF compatibility – MongoEngine docs are not Django auth users
    # so we add these properties manually.
    is_authenticated = True
    is_anonymous = False
    is_active = True

    def to_dict(self):
        return {
            'id': str(self.id),
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class TeamMember(Document):
    meta = {'collection': 'team_members', 'strict': False}
    
    user = ReferenceField(User, required=True)
    skills = ListField(StringField(), default=list)
    status = StringField(choices=['active', 'inactive'], default='active')
    workload_score = IntField(default=0)

    def to_dict(self):
        user_dict = None
        try:
            if self.user:
                user_dict = self.user.to_dict()
        except Exception:
            pass
            
        return {
            'id': str(self.id),
            'user': user_dict,
            'skills': self.skills or [],
            'status': self.status,
            'workload_score': self.workload_score
        }

class Project(Document):
    meta = {'collection': 'projects'}
    
    name = StringField(required=True, max_length=150)
    description = StringField(default='')
    start_date = DateTimeField(required=True)
    deadline = DateTimeField(required=True)
    priority = StringField(choices=['low', 'medium', 'high', 'critical'], default='medium')
    status = StringField(choices=['planning', 'active', 'suspended', 'completed', 'archived'], default='planning')
    team_members = ListField(ReferenceField(TeamMember), default=list)
    progress = IntField(default=0)
    created_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        members = []
        for m in self.team_members:
            try:
                if m:
                    members.append(m.to_dict())
            except Exception:
                pass
                
        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'priority': self.priority,
            'status': self.status,
            'team_members': members,
            'progress': self.progress,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Task(Document):
    meta = {'collection': 'tasks'}
    
    project = ReferenceField(Project, required=True)
    title = StringField(required=True)
    description = StringField(default='')
    assigned_to = ReferenceField(TeamMember)
    status = StringField(choices=['not_started', 'in_progress', 'under_review', 'completed'], default='not_started')
    due_date = DateTimeField(required=True)
    comments = ListField(DictField(), default=list)
    created_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        project_dict = None
        try:
            if self.project:
                project_dict = {
                    'id': str(self.project.id),
                    'name': self.project.name
                }
        except Exception:
            pass

        assignee_dict = None
        try:
            if self.assigned_to:
                assignee_dict = self.assigned_to.to_dict()
        except Exception:
            pass

        # Format comments date if they are datetime objects
        serialized_comments = []
        for c in self.comments:
            comment_date = c.get('created_at')
            if isinstance(comment_date, datetime):
                comment_date = comment_date.isoformat()
            serialized_comments.append({
                'author': c.get('author', ''),
                'comment': c.get('comment', ''),
                'created_at': comment_date
            })

        return {
            'id': str(self.id),
            'project': project_dict,
            'title': self.title,
            'description': self.description,
            'assigned_to': assignee_dict,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'comments': serialized_comments,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Notification(Document):
    meta = {'collection': 'notifications'}
    
    user = ReferenceField(User, required=True)
    title = StringField(required=True)
    message = StringField(required=True)
    type = StringField(choices=['deadline', 'assignment', 'alert', 'info'], default='info')
    is_read = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        user_dict = None
        try:
            if self.user:
                user_dict = self.user.to_dict()
        except Exception:
            pass

        return {
            'id': str(self.id),
            'user': user_dict,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ActivityLog(Document):
    meta = {'collection': 'activity_logs'}
    
    user = ReferenceField(User)
    action = StringField(required=True)
    details = StringField(default='')
    created_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        user_dict = None
        try:
            if self.user:
                user_dict = self.user.to_dict()
        except Exception:
            pass

        return {
            'id': str(self.id),
            'user': user_dict,
            'action': self.action,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProjectComment(Document):
    meta = {'collection': 'project_comments'}
    
    project = ReferenceField(Project, required=True)
    author = ReferenceField(User, required=False)  # Null for system messages
    message = StringField(required=True)
    parent = ReferenceField('self', default=None)
    is_system = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)

    def to_dict(self):
        author_dict = None
        try:
            if self.author:
                author_dict = self.author.to_dict()
        except Exception:
            pass

        parent_id = str(self.parent.id) if self.parent else None

        return {
            'id': str(self.id),
            'project_id': str(self.project.id),
            'author': author_dict,
            'message': self.message,
            'parent_id': parent_id,
            'is_system': self.is_system,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

