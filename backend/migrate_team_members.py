import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project_dashboard.settings')
django.setup()

from mongoengine.connection import get_db

db = get_db()

# Step 1: Rename all docs where user_id exists but user does not
result = db.team_members.update_many(
    {'user_id': {'$exists': True}},
    {'$rename': {'user_id': 'user'}}
)
print(f'Migration done. Matched: {result.matched_count}, Modified: {result.modified_count}')

# Verify
docs = list(db.team_members.find({}, {'user': 1, 'user_id': 1, 'status': 1}))
print(f'Total team_member docs: {len(docs)}')
for d in docs:
    print(' -', d)
