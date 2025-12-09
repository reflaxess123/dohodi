# Form Patterns - React Hook Form + Zod

## Complete Form Example

```typescript
// front/src/features/RegisterForm/ui/RegisterForm.tsx
import { FC } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from 'shared/components/Button';
import { Input } from 'shared/components/Input';

import styles from './RegisterForm.module.scss';

const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, 'Необходимо принять условия')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword']
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterForm: FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur' // Валидация при потере фокуса
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
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

      <Input
        label="Подтверждение пароля"
        type="password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <label className={styles.checkbox}>
        <input type="checkbox" {...register('terms')} />
        Принимаю условия использования
        {errors.terms && <span className={styles.error}>{errors.terms.message}</span>}
      </label>

      <Button type="submit" loading={isSubmitting}>
        Зарегистрироваться
      </Button>
    </form>
  );
};
```

## Zod Schema Patterns

```typescript
// Basic types
const schema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  email: z.string().email('Некорректный email'),
  age: z.number().min(18, 'Минимум 18 лет'),
  phone: z.string().optional(),
});

// Enum
const statusSchema = z.enum(['active', 'inactive', 'pending']);

// Array
const tagsSchema = z.array(z.string()).min(1, 'Минимум 1 тег');

// Union
const idSchema = z.union([z.string(), z.number()]);

// Custom validation
const passwordSchema = z.string()
  .min(8, 'Минимум 8 символов')
  .regex(/[A-Z]/, 'Минимум 1 заглавная буква')
  .regex(/[0-9]/, 'Минимум 1 цифра');

// Conditional validation (refine)
const formSchema = z.object({
  password: z.string(),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

// Type inference
type FormData = z.infer<typeof schema>;
```

## Form with API Mutation

```typescript
import { useRegisterMutation } from 'shared/api/generated/auth/auth';

export const RegisterForm: FC = () => {
  const { mutate: register, isPending, error } = useRegisterMutation({
    onSuccess: () => {
      navigate('/login');
    }
  });

  const { register: formRegister, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = (data: FormData) => {
    register({ data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {error && <div className={styles.apiError}>{error.message}</div>}
      {/* ... fields */}
      <Button type="submit" loading={isPending}>Отправить</Button>
    </form>
  );
};
```

## Form with Default Values

```typescript
interface EditFormProps {
  initialData: FormData;
}

export const EditForm: FC<EditFormProps> = ({ initialData }) => {
  const { register, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData
  });

  // Reset form when initialData changes
  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  return <form>...</form>;
};
```

## Dynamic Form Fields

```typescript
import { useFieldArray } from 'react-hook-form';

const schema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().min(1),
  })).min(1, 'Минимум 1 элемент')
});

export const DynamicForm: FC = () => {
  const { control, register, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ name: '', quantity: 1 }] }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  return (
    <form>
      {fields.map((field, index) => (
        <div key={field.id}>
          <Input {...register(`items.${index}.name`)} />
          <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
          <Button onClick={() => remove(index)}>Удалить</Button>
        </div>
      ))}
      <Button onClick={() => append({ name: '', quantity: 1 })}>Добавить</Button>
    </form>
  );
};
```

## Form Validation Modes

```typescript
useForm({
  mode: 'onChange',    // Валидация при каждом изменении
  mode: 'onBlur',      // Валидация при потере фокуса
  mode: 'onSubmit',    // Валидация только при submit (default)
  mode: 'onTouched',   // Валидация после первого blur, затем onChange
  mode: 'all',         // Все режимы
});
```
