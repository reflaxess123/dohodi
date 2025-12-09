# Database Migrations Skill

## Overview

Nareshka uses **Alembic** for managing PostgreSQL schema migrations. Migrations are version-controlled Python scripts that track database changes over time.

## Location

**Migrations directory:** `back/alembic/versions/`

**Config:** `back/alembic.ini`

## Key Concepts

### Migration Lifecycle

```
1. Make changes to SQLAlchemy models (back/app/**/models.py)
2. Generate migration: alembic revision --autogenerate -m "description"
3. Review generated migration file
4. Test migration locally: alembic upgrade head
5. Commit to git
6. Deploy: Docker runs migrations automatically on startup
```

### Naming Convention

Migration files are named: `YYYYMMDD_HHmmss_description.py`

Example: `20250115_143022_add_subscription_fields.py`

## Workflow

### Step 1: Create Migration

```bash
cd back
alembic revision --autogenerate -m "add user subscription fields"
```

**What Alembic detects automatically:**
- New tables
- New columns
- Removed columns
- Column type changes
- Index changes
- Constraint changes

**Generated file location:** `back/alembic/versions/20250115_*.py`

### Step 2: REVIEW THE MIGRATION (Critical!)

**ALWAYS review what Alembic generated!**

Open the generated file and check:
- ✅ Column types are correct (String vs Text, Integer vs BigInteger)
- ✅ NOT NULL columns have defaults or data migration
- ✅ Foreign keys have correct ON DELETE behavior
- ✅ Indexes are named properly
- ✅ No typos in column/table names
- ❌ Fix any incorrect SQL

Example review:
```python
# BAD - will fail if table has data!
op.add_column('users',
    sa.Column('phone', sa.String(), nullable=False))

# GOOD - safe migration
op.add_column('users',
    sa.Column('phone', sa.String(), nullable=True))
op.execute("UPDATE users SET phone = '' WHERE phone IS NULL")
op.alter_column('users', 'phone', nullable=False)
```

### Step 3: Test Migration

**Test upgrade:**
```bash
cd back
alembic upgrade head
```

**Verify changes:**
```sql
-- Connect to nareshka_dev database
\dt                    # List tables
\d users               # Describe users table
```

**Rollback (if needed):**
```bash
alembic downgrade -1   # Go back one migration
alembic downgrade <revision_id>  # Go to specific revision
```

### Step 4: Deploy

Migrations run automatically during Docker deploy:
```dockerfile
# In entrypoint.sh
alembic upgrade head
```

## Common Patterns

### Adding a NOT NULL Column Safely

**❌ WRONG** - fails with existing data:
```python
def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(), nullable=False))
```

**✅ CORRECT** - safe with existing data:
```python
def upgrade():
    # Step 1: Add as nullable
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))

    # Step 2: Populate existing rows
    op.execute("UPDATE users SET phone = '+1234567890' WHERE phone IS NULL")

    # Step 3: Make NOT NULL
    op.alter_column('users', 'phone', nullable=False)

def downgrade():
    op.drop_column('users', 'phone')
```

### Renaming a Column

```python
def upgrade():
    op.alter_column('users', 'old_name', new_column_name='new_name')

def downgrade():
    op.alter_column('users', 'new_name', new_column_name='old_name')
```

### Adding an Enum Type

```python
from sqlalchemy.dialects.postgresql import ENUM

def upgrade():
    # Create enum type
    subscription_status = ENUM('active', 'inactive', 'trial',
                               name='subscription_status')
    subscription_status.create(op.get_bind())

    # Add column with enum type
    op.add_column('users',
        sa.Column('subscription_status',
                  subscription_status,
                  nullable=True))

def downgrade():
    op.drop_column('users', 'subscription_status')
    op.execute("DROP TYPE subscription_status")
```

### Complex Data Migration

```python
def upgrade():
    # Create new column
    op.add_column('interviews',
        sa.Column('category', sa.String(), nullable=True))

    # Transform existing data
    connection = op.get_bind()
    connection.execute("""
        UPDATE interviews
        SET category = CASE
            WHEN old_category = 'JS' THEN 'JavaScript Core'
            WHEN old_category = 'TS' THEN 'TypeScript'
            ELSE old_category
        END
    """)

    # Make NOT NULL now that all rows have values
    op.alter_column('interviews', 'category', nullable=False)

def downgrade():
    op.drop_column('interviews', 'category')
```

### Adding Foreign Key with Cascade

```python
def upgrade():
    op.create_foreign_key(
        constraint_name='fk_tasks_user_id',
        source_table='tasks',
        local_cols=['user_id'],
        remote_table='users',
        remote_side=['id'],
        ondelete='CASCADE'  # Delete tasks when user is deleted
    )

def downgrade():
    op.drop_constraint('fk_tasks_user_id', 'tasks')
```

### Adding Index

```python
def upgrade():
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

def downgrade():
    op.drop_index('ix_users_email')
```

## Debugging

### Check Current Revision

```bash
alembic current
```

Output:
```
Current revision for postgresql://user:pass@localhost/nareshka_dev: 20250115_143022
```

### Check Pending Migrations

```bash
alembic heads
```

Shows which migration(s) should be current.

### Multiple Heads Error

If you see:
```
Multiple heads found. Use alembic merge to create a new migration that merges them.
```

Fix it:
```bash
alembic merge -m "merge branches"
```

### View Migration History

```bash
alembic history --verbose
```

### Offline Mode (Emergency)

If database is down but you need to see what would happen:
```bash
alembic upgrade head --sql
```

Prints SQL without executing it.

## Best Practices

### DO:
- ✅ Review every generated migration
- ✅ Test migrations locally before committing
- ✅ Use descriptive migration messages
- ✅ Keep migrations small and focused
- ✅ Handle data transformations carefully
- ✅ Test both upgrade AND downgrade
- ✅ Commit migrations with code changes

### DON'T:
- ❌ Skip migrations (alembic will get out of sync)
- ❌ Modify old migration files (only the latest)
- ❌ Drop tables without data backup
- ❌ Use nullable=False without defaults or data migration
- ❌ Ignore migration failures in development
- ❌ Deploy code without running migrations
- ❌ Manually modify database schema (use migrations instead)

## Production Safety

Before deploying to production:

1. **Backup database:**
   ```bash
   pg_dump -U postgres nareshka_prod > backup.sql
   ```

2. **Test migration on copy:**
   ```bash
   # Restore backup to test database
   psql nareshka_test < backup.sql

   # Test migration
   alembic upgrade head
   ```

3. **Have rollback plan:**
   ```bash
   # Know which revision to rollback to
   alembic downgrade <safe_revision_id>
   ```

4. **Monitor after deploy:**
   - Watch database performance
   - Check application logs
   - Monitor error rates

## SQLAlchemy Model → Migration Example

### Model Changes:

```python
# In back/app/features/auth/models/user.py
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    subscription_level: Mapped[str] = mapped_column(String(50), default="free")  # NEW
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime)  # NEW
    updated_at: Mapped[datetime] = mapped_column(DateTime, onupdate=datetime.utcnow)
```

### Generate Migration:

```bash
cd back
alembic revision --autogenerate -m "add subscription fields to users"
```

### Review Generated File:

```python
# back/alembic/versions/20250115_143022_add_subscription_fields.py

def upgrade():
    op.add_column('users',
        sa.Column('subscription_level', sa.String(length=50), nullable=True))
    op.add_column('users',
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True))

def downgrade():
    op.drop_column('users', 'trial_ends_at')
    op.drop_column('users', 'subscription_level')
```

### Set Defaults (if needed):

```python
def upgrade():
    op.add_column('users',
        sa.Column('subscription_level', sa.String(length=50),
                  server_default='free', nullable=False))
    op.add_column('users',
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True))

    # Update existing rows
    op.execute("UPDATE users SET subscription_level = 'free' WHERE subscription_level IS NULL")

    # Remove server_default if only needed for existing rows
    op.alter_column('users', 'subscription_level', server_default=None)

def downgrade():
    op.drop_column('users', 'trial_ends_at')
    op.drop_column('users', 'subscription_level')
```

## File Locations

| Component | Location |
|-----------|----------|
| Alembic Config | `back/alembic.ini` |
| Migration Files | `back/alembic/versions/` |
| Migration Env | `back/alembic/env.py` |
| Entrypoint Hook | `back/entrypoint.sh` (runs migrations on startup) |

## Related Commands

```bash
# Create migration
alembic revision --autogenerate -m "description"

# View current revision
alembic current

# Upgrade to head
alembic upgrade head

# Downgrade one step
alembic downgrade -1

# View history
alembic history --verbose

# Get SQL without executing
alembic upgrade head --sql
```

## Related Skills

- **fastapi-backend-guidelines** - SQLAlchemy model creation
- **database-migrations** - You are here
