# Performance Patterns

## React.memo

```typescript
import { memo } from 'react';

interface ItemProps {
  id: number;
  title: string;
  onClick: (id: number) => void;
}

// Мемоизация компонента - перерендер только при изменении props
export const Item = memo<ItemProps>(({ id, title, onClick }) => {
  console.log('Item render:', id);

  return (
    <div onClick={() => onClick(id)}>
      {title}
    </div>
  );
});
```

## useMemo & useCallback

```typescript
import { useMemo, useCallback } from 'react';

export const ExpensiveComponent: FC<{ items: Item[] }> = ({ items }) => {
  // Мемоизация вычислений - пересчёт только при изменении items
  const sortedItems = useMemo(() => {
    console.log('Sorting...');
    return [...items].sort((a, b) => a.title.localeCompare(b.title));
  }, [items]);

  // Мемоизация колбэка - стабильная ссылка между рендерами
  const handleClick = useCallback((id: number) => {
    console.log('Clicked:', id);
  }, []);

  return (
    <div>
      {sortedItems.map(item => (
        <Item key={item.id} {...item} onClick={handleClick} />
      ))}
    </div>
  );
};
```

## Lazy Loading

```typescript
import { lazy, Suspense } from 'react';
import { Loading } from 'shared/components/Loading';

// Ленивая загрузка тяжёлого компонента
const HeavyChart = lazy(() => import('widgets/HeavyChart'));
const MonacoEditor = lazy(() => import('widgets/MonacoEditor'));

export const Dashboard: FC = () => {
  return (
    <div>
      <h1>Дашборд</h1>

      <Suspense fallback={<Loading />}>
        <HeavyChart />
      </Suspense>

      <Suspense fallback={<Loading />}>
        <MonacoEditor />
      </Suspense>
    </div>
  );
};
```

## Route-based Code Splitting

```typescript
// front/src/app/providers/RouterProvider/routes.tsx
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Lazy loading для страниц
const HomePage = lazy(() => import('pages/Home'));
const LearningPage = lazy(() => import('pages/Learning'));
const CodeEditorPage = lazy(() => import('pages/CodeEditor'));
const AdminPage = lazy(() => import('pages/Admin'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />
  },
  {
    path: '/learning',
    element: <LearningPage />
  },
  {
    path: '/code-editor',
    element: <CodeEditorPage />
  },
  {
    path: '/admin',
    element: <AdminPage />
  }
]);
```

## Virtualization (Large Lists)

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export const VirtualList: FC<{ items: Item[] }> = ({ items }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Примерная высота элемента
    overscan: 5, // Количество элементов за viewport
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index].title}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Image Optimization

```typescript
// Lazy loading изображений
<img
  src={imageUrl}
  loading="lazy"
  decoding="async"
  alt={alt}
/>

// С placeholder
import { useState } from 'react';

export const OptimizedImage: FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={styles.imageWrapper}>
      {!loaded && <div className={styles.placeholder} />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={loaded ? styles.visible : styles.hidden}
      />
    </div>
  );
};
```

## Debounce Hook

```typescript
// front/src/shared/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 500);

const { data } = useSearchQuery(debouncedSearchTerm);
```

## Error Boundaries

```typescript
// front/src/shared/components/ErrorBoundary/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div>
          <h2>Что-то пошло не так</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## When to Optimize

1. **useMemo** - Expensive calculations, filtering/sorting large arrays
2. **useCallback** - Callbacks passed to memoized children
3. **React.memo** - Components that re-render often with same props
4. **lazy** - Large components, route-based splitting
5. **Virtualization** - Lists with 100+ items
