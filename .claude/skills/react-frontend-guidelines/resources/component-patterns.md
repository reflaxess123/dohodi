# Component Patterns - React

## Functional Component Pattern

```typescript
// front/src/features/LoginForm/ui/LoginForm.tsx
import { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

import { useLoginMutation } from 'shared/api/generated/auth/auth';
import { Button } from 'shared/components/Button';
import { Input } from 'shared/components/Input';
import { useNotification } from 'app/providers/NotificationProvider';

import styles from './LoginForm.module.scss';

// Zod schema для валидации
const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов')
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export const LoginForm: FC<LoginFormProps> = ({ onSuccess, className }) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // React Hook Form с Zod
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  // React Query mutation (auto-generated)
  const { mutate: login, isPending } = useLoginMutation({
    onSuccess: (data) => {
      showNotification('Успешный вход!', 'success');
      onSuccess?.();
      navigate('/dashboard');
    },
    onError: (error) => {
      showNotification(error.message, 'error');
    }
  });

  const onSubmit = (data: LoginFormData) => {
    login({ data });
  };

  return (
    <form className={`${styles.loginForm} ${className}`} onSubmit={handleSubmit(onSubmit)}>
      <h2 className={styles.title}>Вход</h2>

      <Input
        label="Email"
        type="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Пароль"
        type="password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" loading={isPending} fullWidth>
        Войти
      </Button>
    </form>
  );
};
```

## Patterns Checklist

- ✅ `FC<Props>` для типизации
- ✅ Деструктуризация props с дефолтами
- ✅ Props interface с optional fields
- ✅ SCSS modules для стилей
- ✅ React Hook Form + Zod для форм
- ✅ React Query для API

## Component with Children

```typescript
interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export const Card: FC<CardProps> = ({ children, title, className }) => {
  return (
    <div className={`${styles.card} ${className}`}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>{children}</div>
    </div>
  );
};
```

## Component with Ref

```typescript
import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className={styles.inputWrapper}>
        {label && <label className={styles.label}>{label}</label>}
        <input
          ref={ref}
          className={`${styles.input} ${error ? styles.error : ''} ${className}`}
          {...props}
        />
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

## Compound Components

```typescript
// Tab component with compound pattern
interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
}

interface TabProps {
  value: string;
  children: ReactNode;
}

interface TabPanelProps {
  value: string;
  children: ReactNode;
}

const TabsContext = createContext<{ activeTab: string; setActiveTab: (v: string) => void } | null>(null);

export const Tabs: FC<TabsProps> & { Tab: FC<TabProps>; Panel: FC<TabPanelProps> } = ({ children, defaultValue = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={styles.tabs}>{children}</div>
    </TabsContext.Provider>
  );
};

Tabs.Tab = ({ value, children }) => {
  const context = useContext(TabsContext)!;
  return (
    <button
      className={`${styles.tab} ${context.activeTab === value ? styles.active : ''}`}
      onClick={() => context.setActiveTab(value)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = ({ value, children }) => {
  const context = useContext(TabsContext)!;
  if (context.activeTab !== value) return null;
  return <div className={styles.panel}>{children}</div>;
};
```

## Export Pattern (index.ts)

```typescript
// front/src/features/LoginForm/index.ts
export { LoginForm } from './ui/LoginForm';
export type { LoginFormProps } from './ui/LoginForm';
```
