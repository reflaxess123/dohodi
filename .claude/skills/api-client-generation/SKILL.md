# API Client Generation Skill

## Overview

Nareshka auto-generates TypeScript API client from FastAPI OpenAPI schema using **Orval**. The generated client includes:

- React Query v5 hooks (useQuery, useMutation)
- Full TypeScript type safety
- Automatic request/response validation
- Axios HTTP client with interceptors
- Auto-completion in IDE

## Architecture

```
FastAPI Backend (Pydantic schemas)
  ↓ (generates OpenAPI spec)
openapi.json (JSON schema)
  ↓ (Orval generator)
front/src/shared/api/generated/
  ├── api.ts (React Query hooks)
  ├── model.ts (TypeScript types)
  └── index.ts (barrel exports)
```

## Workflow

### Step 1: Update Backend API

Modify your FastAPI endpoints in `back/app/features/*/router.py`:

```python
from fastapi import APIRouter, Depends
from app.shared.schemas import ContentBlockCreate, ContentBlockResponse

router = APIRouter(prefix="/content", tags=["content"])

@router.post("/blocks", response_model=ContentBlockResponse)
async def create_content_block(
    data: ContentBlockCreate,
    current_user = Depends(get_current_user)
):
    """Create a new content block."""
    # Implementation
    pass

@router.get("/blocks/{block_id}", response_model=ContentBlockResponse)
async def get_content_block(block_id: int):
    """Get content block by ID."""
    pass
```

**Important:** Use Pydantic schemas for request/response types!

### Step 2: Generate OpenAPI Schema

```bash
cd back
python scripts/generate_openapi.py
```

This creates: `back/openapi.json`

**Or automatically on startup:**
```bash
poetry run uvicorn main:app --host 0.0.0.0 --port 4000
# FastAPI auto-generates at http://localhost:4000/openapi.json
```

### Step 3: Generate TypeScript Client

**Option A: Manual generation**
```bash
cd front
npm run api:generate
```

**Option B: Watch mode (during development)**
```bash
cd front
npm run api:watch
```

Regenerates client automatically when `back/openapi.json` changes.

**Option C: Automated script**
```bash
# From project root
update-api.bat  # Windows
# or
./update-api.sh  # Linux/Mac
```

### Step 4: Use Generated Hooks

The generated client creates React Query hooks for every endpoint:

```typescript
// auto-generated from backend
import {
  useGetContentBlocks,
  usePostContentBlocks,
  useGetContentBlocksBlockId
} from '@/shared/api/generated'

function ContentPage() {
  // GET /content/blocks
  const { data: blocks, isLoading } = useGetContentBlocks()

  // POST /content/blocks (mutation)
  const createBlock = usePostContentBlocks()

  // GET /content/blocks/{block_id}
  const { data: block } = useGetContentBlocksBlockId(blockId)

  return (
    <div>
      {blocks?.map(b => (
        <div key={b.id}>{b.title}</div>
      ))}
      <button onClick={() => createBlock.mutateAsync({
        data: { title: 'New' }
      })}>
        Create
      </button>
    </div>
  )
}
```

## Configuration

### Orval Config

**File:** `front/orval.config.ts`

```typescript
import { defineConfig } from '@orval/core'

export default defineConfig({
  nareshka: {
    input: {
      target: '../back/openapi.json',
    },
    output: {
      target: './src/shared/api/generated/api.ts',
      client: 'react-query',
      httpClient: 'axios',
      mode: 'tags-split',  // One file per endpoint tag
      override: {
        mutator: {
          path: './src/shared/api/axios-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
})
```

### Package.json Scripts

```json
{
  "scripts": {
    "api:generate": "orval --config orval.config.ts",
    "api:watch": "orval --config orval.config.ts --watch",
    "api:mock": "orval --config orval.config.ts --mock"
  }
}
```

## Generated Files

### api.ts

Contains React Query hooks for each endpoint:

```typescript
// GET endpoints → useQuery hooks
export const useGetInterviewCategories = () =>
  useQuery<InterviewCategoryResponse[], Error>({
    queryKey: ['/api/v2/interview-categories'],
    queryFn: () => customInstance.get('/api/v2/interview-categories')
  })

// POST/PUT/DELETE endpoints → useMutation hooks
export const usePostAuthLogin = () =>
  useMutation<TokenResponse, Error, { data: LoginRequest }>({
    mutationFn: ({ data }) =>
      customInstance.post('/api/v2/auth/login', data)
  })
```

### model.ts

TypeScript types generated from Pydantic schemas:

```typescript
export interface InterviewCategory {
  id: number
  name: string
  questionsCount: number
  percentage: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  user: User
}
```

### index.ts (Barrel Export)

Convenient imports:

```typescript
// Instead of:
import { useGetInterviewCategories } from '@/shared/api/generated/api'

// You can:
import { useGetInterviewCategories } from '@/shared/api/generated'
```

## React Query Integration

### Query Pattern

```typescript
// Get interviews with filters
const { data, isLoading, error, refetch } = useGetInterviewCategories({
  queryOptions: {
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 10 * 60 * 1000,  // 10 minutes
    retry: 2,
  }
})
```

### Mutation Pattern

```typescript
// Create new interview
const { mutate, isPending, error } = usePostAuthLogin()

const handleLogin = async (email: string, password: string) => {
  mutate(
    { data: { email, password } },
    {
      onSuccess: (data) => {
        // Token received, redirect to home
        window.location.href = '/'
      },
      onError: (error) => {
        console.error('Login failed:', error.message)
      },
    }
  )
}
```

### Axios Interceptors

**File:** `front/src/shared/api/axios-instance.ts`

```typescript
import axios from 'axios'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000',
  withCredentials: true,  // Include cookies for JWT auth
})

// Request interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const customInstance = axiosInstance
```

## Common Issues & Solutions

### Issue: "Cannot find module @/shared/api/generated"

**Cause:** Client hasn't been generated yet

**Solution:**
```bash
cd front
npm run api:generate
```

### Issue: "Types are out of sync with backend"

**Cause:** Backend changed API but client wasn't regenerated

**Solution:**
```bash
# Option 1: Manual
npm run api:generate

# Option 2: Automatic watch
npm run api:watch
```

### Issue: "Orval fails with parse error"

**Cause:** OpenAPI schema is invalid JSON or malformed Pydantic schemas

**Solution:**
1. Check `back/openapi.json` is valid JSON:
   ```bash
   python -m json.tool ../back/openapi.json > /dev/null
   ```

2. Fix Pydantic schemas in backend:
   - Ensure all fields have type hints
   - Use standard types (str, int, bool, datetime, etc.)
   - Document complex types with docstrings

3. Restart backend to regenerate schema:
   ```bash
   # Backend will regenerate openapi.json on startup
   ```

### Issue: "Generated hooks don't match my endpoint parameters"

**Cause:** Backend endpoint parameters don't match OpenAPI schema

**Solution:**
```python
# BAD - parameter not documented
@router.get("/blocks/{block_id}")
async def get_block(block_id: int):
    pass

# GOOD - proper typing with OpenAPI docs
@router.get("/blocks/{block_id}",
            response_model=ContentBlockResponse)
async def get_block(
    block_id: int = Path(..., description="Content block ID")
):
    """Get content block by ID."""
    pass
```

### Issue: "Circular dependency error"

**Cause:** Pydantic models import each other

**Solution:** Use forward references:
```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.features.auth.models import User

class Task(Base):
    __tablename__ = "tasks"
    id: int = Column(Integer, primary_key=True)
    # Use string reference instead of direct import
    owner_id: Mapped["User"] = relationship("User")
```

## Best Practices

### DO:

- ✅ Always use Pydantic schemas for request/response types
- ✅ Document endpoints with docstrings (shows in OpenAPI)
- ✅ Use proper HTTP status codes (200, 201, 400, 404, etc.)
- ✅ Regenerate after every backend API change
- ✅ Commit generated files to git
- ✅ Use generated types in frontend components
- ✅ Keep watch mode running during development

### DON'T:

- ❌ Manually edit generated client code
- ❌ Use untyped responses (Any, dict, etc.)
- ❌ Import from raw API file (use index.ts)
- ❌ Make HTTP requests manually (use generated hooks)
- ❌ Skip OpenAPI documentation in endpoints

## Workflow Integration

### During Development

```bash
# Terminal 1: Watch for API changes
cd front && npm run api:watch

# Terminal 2: Frontend dev server
cd front && npm run dev

# Terminal 3: Backend dev server
cd back && poetry run uvicorn main:app --reload
```

### Before Commit

```bash
# Ensure client is up-to-date
npm run api:generate

# Commit both backend changes and generated client
git add back/app/features/*/router.py
git add front/src/shared/api/generated/
git commit -m "feat: add new interview search endpoint"
```

### Type Safety Check

```bash
# Ensure TypeScript compiles with generated types
cd front
npm run type-check
```

## File Locations

| Component | Location |
|-----------|----------|
| Orval Config | `front/orval.config.ts` |
| Generated API | `front/src/shared/api/generated/` |
| Axios Setup | `front/src/shared/api/axios-instance.ts` |
| OpenAPI Schema | `back/openapi.json` (auto-generated) |

## Related Skills

- **fastapi-backend-guidelines** - Creating APIs and Pydantic schemas
- **react-frontend-guidelines** - Using generated hooks in components
