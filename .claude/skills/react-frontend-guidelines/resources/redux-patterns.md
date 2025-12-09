# Redux Toolkit Patterns

## createSlice Pattern

```typescript
// front/src/entities/ContentBlock/model/contentBlockSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from 'app/providers/ReduxProvider/store';

interface ContentBlock {
  id: number;
  title: string;
  content: string;
  completed: boolean;
}

interface ContentBlockState {
  blocks: ContentBlock[];
  selectedId: number | null;
  filter: 'all' | 'completed' | 'active';
}

const initialState: ContentBlockState = {
  blocks: [],
  selectedId: null,
  filter: 'all'
};

export const contentBlockSlice = createSlice({
  name: 'contentBlock',
  initialState,
  reducers: {
    setBlocks: (state, action: PayloadAction<ContentBlock[]>) => {
      state.blocks = action.payload;
    },
    selectBlock: (state, action: PayloadAction<number>) => {
      state.selectedId = action.payload;
    },
    toggleCompleted: (state, action: PayloadAction<number>) => {
      const block = state.blocks.find(b => b.id === action.payload);
      if (block) {
        block.completed = !block.completed;
      }
    },
    setFilter: (state, action: PayloadAction<ContentBlockState['filter']>) => {
      state.filter = action.payload;
    }
  }
});

// Actions
export const { setBlocks, selectBlock, toggleCompleted, setFilter } = contentBlockSlice.actions;

// Selectors
export const selectAllBlocks = (state: RootState) => state.contentBlock.blocks;
export const selectSelectedId = (state: RootState) => state.contentBlock.selectedId;
export const selectFilter = (state: RootState) => state.contentBlock.filter;
export const selectFilteredBlocks = (state: RootState) => {
  const { blocks, filter } = state.contentBlock;
  switch (filter) {
    case 'completed': return blocks.filter(b => b.completed);
    case 'active': return blocks.filter(b => !b.completed);
    default: return blocks;
  }
};

// Reducer
export default contentBlockSlice.reducer;
```

## Patterns Checklist

- ✅ Redux Toolkit `createSlice`
- ✅ Typed state interface
- ✅ Selectors exported
- ✅ Actions exported
- ✅ Immer для иммутабельности (встроен в RTK)

## Using in Component

```typescript
// front/src/widgets/ContentList/ui/ContentList.tsx
import { useAppDispatch, useAppSelector } from 'app/providers/ReduxProvider/hooks';
import { selectFilteredBlocks, toggleCompleted } from 'entities/ContentBlock';

export const ContentList: FC = () => {
  const dispatch = useAppDispatch();
  const blocks = useAppSelector(selectFilteredBlocks);

  const handleToggle = (id: number) => {
    dispatch(toggleCompleted(id));
  };

  return (
    <div>
      {blocks.map(block => (
        <div key={block.id} onClick={() => handleToggle(block.id)}>
          {block.title} - {block.completed ? '✅' : '⏳'}
        </div>
      ))}
    </div>
  );
};
```

## Typed Hooks

```typescript
// front/src/app/providers/ReduxProvider/hooks.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

## Store Configuration

```typescript
// front/src/app/providers/ReduxProvider/store.ts
import { configureStore } from '@reduxjs/toolkit';
import contentBlockReducer from 'entities/ContentBlock/model/contentBlockSlice';
import sidebarReducer from 'widgets/Sidebar/model/sidebarSlice';

export const store = configureStore({
  reducer: {
    contentBlock: contentBlockReducer,
    sidebar: sidebarReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## Async Actions with createAsyncThunk

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from 'shared/api';

export const fetchBlocks = createAsyncThunk(
  'contentBlock/fetchBlocks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/v2/content-blocks');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const contentBlockSlice = createSlice({
  name: 'contentBlock',
  initialState: {
    blocks: [],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlocks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlocks.fulfilled, (state, action) => {
        state.loading = false;
        state.blocks = action.payload;
      })
      .addCase(fetchBlocks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});
```

## Memoized Selectors (reselect)

```typescript
import { createSelector } from '@reduxjs/toolkit';

const selectBlocks = (state: RootState) => state.contentBlock.blocks;
const selectFilter = (state: RootState) => state.contentBlock.filter;

// Memoized selector - recalculates only when blocks or filter change
export const selectFilteredBlocks = createSelector(
  [selectBlocks, selectFilter],
  (blocks, filter) => {
    switch (filter) {
      case 'completed': return blocks.filter(b => b.completed);
      case 'active': return blocks.filter(b => !b.completed);
      default: return blocks;
    }
  }
);
```
