# Contributing to Genesis

Thank you for your interest in contributing! This guide will help you extend and customize Genesis.

## Development Workflow

### Setting Up Development Environment

1. **Fork and Clone**
   ```bash
   git clone <your-fork-url>
   cd genesis-builder
   npm run install:all
   ```

2. **Start Development Servers**
   ```bash
   npm run dev
   ```

3. **Make Changes**
   - Frontend code: `frontend/src/`
   - Backend code: `backend/src/`

4. **Test Your Changes**
   - Test in the browser at http://localhost:5173
   - Check backend at http://localhost:5000

## Adding New Element Types

To add a new element type (e.g., "Form", "Video", "Card"):

### 1. Update TypeScript Types

**File:** `frontend/src/types/element.types.ts`

```typescript
export type ElementType = 'div' | 'section' | 'text' | 'heading' | 'button' | 'image' | 'link' | 'container' | 'form'; // Add 'form'
```

### 2. Add to Elements Library

**File:** `frontend/src/components/LeftPanel/ElementsLibrary.tsx`

```typescript
const elements: DraggableElementProps[] = [
  // ... existing elements
  {
    type: 'form',
    label: 'Form',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Your SVG path */}
      </svg>
    ),
  },
];
```

### 3. Add Default Styles

**File:** `frontend/src/components/Canvas/Canvas.tsx`

```typescript
const createDefaultElement = (type: ElementType): Element => {
  // ... existing cases
  case 'form':
    baseElement.styles.desktop = {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px',
    };
    break;
}
```

### 4. Add Rendering Logic

**File:** `frontend/src/components/Canvas/CanvasElement.tsx`

```typescript
const renderElement = () => {
  // ... existing cases
  case 'form':
    return (
      <form {...commonProps} onSubmit={(e) => e.preventDefault()}>
        {element.children.length > 0 ? (
          element.children.map((child) => <CanvasElement key={child.id} element={child} />)
        ) : (
          <div className="text-gray-400 text-sm">Add form fields here</div>
        )}
      </form>
    );
}
```

### 5. Add HTML Generation

**File:** `backend/src/utils/generateHTML.ts`

```typescript
const generateElementHTML = (element: Element, depth = 0): string => {
  // ... existing cases
  case 'form':
    html += `${indent}<form ${classAttr}>\n`;
    element.children.forEach((child) => {
      html += generateElementHTML(child, depth + 1);
    });
    html += `${indent}</form>\n`;
    break;
}
```

## Adding Style Controls

To add a new style control panel:

### 1. Create Control Component

**File:** `frontend/src/components/RightPanel/controls/YourControl.tsx`

```typescript
import { useState } from 'react';
import { useBuilderStore } from '@/store/useBuilderStore';
import { Element } from '@/types/element.types';

interface YourControlProps {
  element: Element;
}

const YourControl = ({ element }: YourControlProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentBreakpoint, updateElementStyles } = useBuilderStore();

  const styles = element.styles[currentBreakpoint];

  const handleChange = (property: string, value: string) => {
    updateElementStyles(element.id, currentBreakpoint, { [property]: value });
  };

  return (
    <div className="p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <h4 className="text-sm font-semibold">Your Control</h4>
        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          {/* Chevron icon */}
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {/* Your controls here */}
        </div>
      )}
    </div>
  );
};

export default YourControl;
```

### 2. Add to Style Panel

**File:** `frontend/src/components/RightPanel/StylePanel.tsx`

```typescript
import YourControl from './controls/YourControl';

// In the render:
<div className="divide-y divide-border-color">
  <LayoutControl element={selectedElement} />
  <YourControl element={selectedElement} />
  {/* ... other controls */}
</div>
```

## Adding API Endpoints

### 1. Create Controller

**File:** `backend/src/controllers/yourController.ts`

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import YourModel from '../models/YourModel';

export const yourAction = async (req: AuthRequest, res: Response) => {
  try {
    // Your logic here
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
```

### 2. Create Routes

**File:** `backend/src/routes/yourRoutes.ts`

```typescript
import { Router } from 'express';
import { yourAction } from '../controllers/yourController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.post('/action', yourAction);

export default router;
```

### 3. Register Routes

**File:** `backend/src/server.ts`

```typescript
import yourRoutes from './routes/yourRoutes';

app.use('/api/your-endpoint', yourRoutes);
```

## Code Style Guidelines

### Frontend (TypeScript/React)

- Use functional components with hooks
- Use TypeScript for type safety
- Follow the existing component structure
- Use Tailwind CSS for styling
- Keep components small and focused

```typescript
// Good
const MyComponent = ({ prop }: { prop: string }) => {
  const [state, setState] = useState('');
  return <div className="p-4">{prop}</div>;
};

// Avoid
class MyComponent extends React.Component { ... }
```

### Backend (Node.js/Express)

- Use async/await for async operations
- Always handle errors with try/catch
- Use TypeScript types
- Validate user input
- Use meaningful variable names

```typescript
// Good
export const getProject = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

## Testing

### Manual Testing Checklist

Before submitting changes:

- [ ] Test on Desktop, Tablet, and Mobile breakpoints
- [ ] Test drag-and-drop functionality
- [ ] Test style changes persist
- [ ] Test undo/redo works
- [ ] Test save and load
- [ ] Check console for errors
- [ ] Test with MongoDB
- [ ] Test authentication flow

### Adding Tests

Currently, the project doesn't have automated tests, but you can add them:

**Frontend (Vitest):**
```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Backend (Jest):**
```bash
cd backend
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

## Project Architecture

### Frontend State Management (Zustand)

State is managed in `frontend/src/store/useBuilderStore.ts`:

- **Elements:** Array of page elements
- **Selected Element:** Currently selected element ID
- **Breakpoint:** Current responsive breakpoint
- **History:** Undo/redo state

All state changes should go through the store actions.

### Backend Models (MongoDB)

Models are in `backend/src/models/`:

- **User:** Authentication and user data
- **Project:** Stores element tree and metadata
- **Asset:** Uploaded files
- **PublishedSite:** Generated HTML/CSS

## Common Patterns

### Adding a New Style Property

1. Add to `StyleProperties` interface in `types/element.types.ts`
2. Add control in appropriate control component
3. Ensure it's included in CSS generation in `generateHTML.ts`

### Making Elements Editable

Use `contentEditable` with `suppressContentEditableWarning`:

```typescript
<div
  contentEditable
  suppressContentEditableWarning
  onBlur={(e) => updateElement(id, { content: e.currentTarget.textContent || '' })}
>
  {content}
</div>
```

### Responsive Styles

Styles cascade from desktop → tablet → mobile:

```typescript
const getComputedStyles = () => {
  let computed = { ...element.styles.desktop };
  if (currentBreakpoint === 'tablet' || currentBreakpoint === 'mobile') {
    computed = { ...computed, ...element.styles.tablet };
  }
  if (currentBreakpoint === 'mobile') {
    computed = { ...computed, ...element.styles.mobile };
  }
  return computed;
};
```

## Performance Tips

- Use `React.memo()` for expensive components
- Avoid inline function definitions in renders
- Use `useCallback` and `useMemo` appropriately
- Limit database queries with pagination
- Use indexes on frequently queried fields

## Getting Help

- Review existing code for patterns
- Check the SETUP.md for configuration issues
- Open an issue for bugs or questions
- Read the inline code comments

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit PR with clear description

---

Thank you for contributing to Genesis! 🎉
