# Routing Patterns - React Router v7

## Route Configuration

```typescript
// front/src/app/providers/RouterProvider/routes.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Loading } from 'shared/components/Loading';

// Lazy loading для кодсплиттинга
const HomePage = lazy(() => import('pages/Home'));
const LearningPage = lazy(() => import('pages/Learning'));
const CodeEditorPage = lazy(() => import('pages/CodeEditor'));
const InterviewsPage = lazy(() => import('pages/Interviews'));
const ProfilePage = lazy(() => import('pages/Profile'));
const AdminPage = lazy(() => import('pages/Admin'));
const NotFoundPage = lazy(() => import('pages/NotFound'));

// Layout components
import { MainLayout } from 'widgets/MainLayout';
import { AdminLayout } from 'widgets/AdminLayout';

// Auth guard
import { RequireAuth } from 'features/Auth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <HomePage />
          </Suspense>
        )
      },
      {
        path: 'learning',
        element: (
          <Suspense fallback={<Loading />}>
            <LearningPage />
          </Suspense>
        )
      },
      {
        path: 'code-editor',
        element: (
          <Suspense fallback={<Loading />}>
            <CodeEditorPage />
          </Suspense>
        )
      },
      {
        path: 'interviews',
        element: (
          <Suspense fallback={<Loading />}>
            <InterviewsPage />
          </Suspense>
        )
      },
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <Suspense fallback={<Loading />}>
              <ProfilePage />
            </Suspense>
          </RequireAuth>
        )
      }
    ]
  },
  {
    path: '/admin',
    element: (
      <RequireAuth roles={['admin']}>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <AdminPage />
          </Suspense>
        )
      }
    ]
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<Loading />}>
        <NotFoundPage />
      </Suspense>
    )
  }
]);
```

## Navigation

```typescript
import { useNavigate, Link, NavLink } from 'react-router-dom';

export const Navigation: FC = () => {
  const navigate = useNavigate();

  const handleGoToLearning = () => {
    navigate('/learning');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleReplace = () => {
    navigate('/home', { replace: true }); // Не добавляет в историю
  };

  return (
    <nav>
      {/* Обычная ссылка */}
      <Link to="/">Главная</Link>

      {/* Ссылка с активным состоянием */}
      <NavLink
        to="/learning"
        className={({ isActive }) => isActive ? styles.active : ''}
      >
        Обучение
      </NavLink>

      {/* Программная навигация */}
      <button onClick={handleGoToLearning}>Начать учиться</button>
      <button onClick={handleGoBack}>Назад</button>
    </nav>
  );
};
```

## Route Parameters

```typescript
// Route: /posts/:postId
import { useParams } from 'react-router-dom';

export const PostPage: FC = () => {
  const { postId } = useParams<{ postId: string }>();

  const { data: post, isLoading } = useGetPost(Number(postId));

  if (isLoading) return <Loading />;
  if (!post) return <NotFound />;

  return <PostDetail post={post} />;
};
```

## Query Parameters

```typescript
import { useSearchParams } from 'react-router-dom';

export const SearchPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get('q') || '';
  const page = Number(searchParams.get('page')) || 1;

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: query, page: String(newPage) });
  };

  return (
    <div>
      <input
        value={query}
        onChange={e => handleSearch(e.target.value)}
      />
      <Pagination page={page} onChange={handlePageChange} />
    </div>
  );
};
```

## Protected Routes

```typescript
// front/src/features/Auth/ui/RequireAuth.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from 'app/providers/AuthProvider';

interface RequireAuthProps {
  children: ReactNode;
  roles?: string[];
}

export const RequireAuth: FC<RequireAuthProps> = ({ children, roles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    // Redirect to login, сохраняя текущий URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};
```

## Layout with Outlet

```typescript
// front/src/widgets/MainLayout/ui/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from 'widgets/Sidebar';
import { Header } from 'widgets/Header';

export const MainLayout: FC = () => {
  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.content}>
        <Sidebar />
        <main className={styles.main}>
          <Outlet /> {/* Здесь рендерятся дочерние routes */}
        </main>
      </div>
    </div>
  );
};
```

## Redirect After Login

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Получаем URL, с которого пришёл пользователь
  const from = location.state?.from?.pathname || '/';

  const handleLoginSuccess = () => {
    navigate(from, { replace: true });
  };

  return <LoginForm onSuccess={handleLoginSuccess} />;
};
```
