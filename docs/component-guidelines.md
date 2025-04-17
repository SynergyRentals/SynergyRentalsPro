# Component Development Guidelines

This document outlines best practices for developing UI components in the application, with a focus on avoiding common errors.

## SelectItem Component Guidelines

### Problem: Empty String Values

One of the most common errors encountered is using empty string values in `SelectItem` components, which can cause validation failures and UI rendering issues.

**Example of problematic code:**

```tsx
<Select>
  <SelectItem value="">Select an option</SelectItem> {/* WRONG: Empty string value */}
  <SelectItem value="option1">Option 1</SelectItem>
  <SelectItem value="option2">Option 2</SelectItem>
</Select>
```

### Best Practices

1. **Always use non-empty values for SelectItem components**

```tsx
<Select>
  <SelectItem value="default">Select an option</SelectItem> {/* CORRECT */}
  <SelectItem value="option1">Option 1</SelectItem>
  <SelectItem value="option2">Option 2</SelectItem>
</Select>
```

2. **For placeholder options that shouldn't be selectable, use the placeholder prop on Select**

```tsx
<Select placeholder="Select an option">
  <SelectItem value="option1">Option 1</SelectItem>
  <SelectItem value="option2">Option 2</SelectItem>
</Select>
```

3. **Use the validation utility to prevent empty values**

```tsx
import { validateSelectItemValue } from '@/utils/componentValidator';

// In your component
const options = items.map(item => {
  // This will throw an error if value is empty
  validateSelectItemValue(item.id, 'itemSelect');
  
  return (
    <SelectItem key={item.id} value={item.id}>
      {item.name}
    </SelectItem>
  );
});
```

4. **For data-driven SelectItems, ensure values have a default**

```tsx
// BAD
const value = item.code; // If code is undefined or '', this will cause issues

// GOOD
const value = item.code || `item-${item.id}`; // Provide a fallback
```

## Form Field Guidelines

1. **Always provide a default value for form fields**

```tsx
// Form field with default value
<FormField
  control={form.control}
  name="priority"
  defaultValue="normal" // Set a default value
  render={({ field }) => (
    <FormItem>
      <FormLabel>Priority</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="normal">Normal</SelectItem>
        <SelectItem value="high">High</SelectItem>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

2. **Use Zod validation for forms**

```tsx
const formSchema = z.object({
  status: z.string().min(1, "Status is required"),
  priority: z.string().min(1, "Priority is required"),
});
```

## Other Component Guidelines

1. **Badge components should have consistent colors**

```tsx
// Use consistent color codes based on status
const getBadgeVariant = (status: string) => {
  switch (status) {
    case 'open': return 'warning';
    case 'in-progress': return 'info';
    case 'escalated': return 'destructive';
    case 'resolved': return 'success';
    default: return 'secondary';
  }
};
```

2. **Avoid direct DOM manipulation; use React state instead**

```tsx
// BAD
document.getElementById('element').style.display = 'none';

// GOOD
const [isVisible, setIsVisible] = useState(true);
return isVisible ? <div>Content</div> : null;
```

3. **Use controlled components for forms**

```tsx
// Controlled component
const [value, setValue] = useState('');
<Input
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>
```

By following these guidelines, we can prevent many common component errors and ensure a more stable application.