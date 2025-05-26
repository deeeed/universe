# OpenDrawer Performance Optimization

## The Issue

When using `openDrawer` from the `useModal` hook, modal content components were being recreated on every parent component re-render. This caused significant performance issues and unexpected behavior.

### The Problem

```tsx
// In a parent component
const { openDrawer } = useModal();

const handleOpenModal = async () => {
  const result = await openDrawer({
    render: ({ resolve }) => (
      // This component was being recreated on EVERY parent re-render!
      <MyModalContent 
        onFinish={(data) => resolve(data)}
      />
    ),
  });
};
```

Every time the parent component re-rendered (due to state changes, prop updates, etc.), the `render` function would be called again, creating a new instance of the modal content component. This caused:

- **Hook Re-initialization**: All hooks (`useState`, `useEffect`, custom hooks) were re-initialized
- **Lost Component State**: Any internal state was reset
- **Performance Degradation**: Expensive operations were repeated unnecessarily
- **Unexpected Side Effects**: Effects ran multiple times when they shouldn't

### Common Scenarios Where This Occurred

1. **Form Inputs**: Typing in any input field in the parent component
2. **State Updates**: Any state change in the parent component
3. **Context Updates**: Updates from context providers above the parent
4. **Prop Changes**: New props passed to the parent component

## The Solution

We fixed this at the design-system level by ensuring modal content is only rendered once when the modal opens, not on every parent re-render.

### Implementation

The fix uses a combination of memoization and refs to maintain a stable reference to the rendered content:

```tsx
const ModalContent = memo(
  ({ state, onChange, render, resolve, reject }: ModalContentProps) => {
    // Store the initial render function in a ref to prevent re-creation
    const renderRef = useRef(render);
    
    // Only update the ref on mount
    useEffect(() => {
      renderRef.current = render;
    }, []); // Empty deps - only run once
    
    // Render using the stable reference
    return (
      <>
        {renderRef.current({
          state,
          onChange,
          resolve,
          reject,
        })}
      </>
    );
  },
  // Custom comparison to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    return (
      prevProps.modalId === nextProps.modalId &&
      prevProps.state === nextProps.state &&
      prevProps.onChange === nextProps.onChange &&
      prevProps.resolve === nextProps.resolve &&
      prevProps.reject === nextProps.reject
    );
  }
);
```

## How It Works

### Before the Fix
```
Parent Re-render → render() called → New Component Instance → All Hooks Re-initialized
```

### After the Fix
```
Parent Re-render → render() NOT called → Same Component Instance → Hooks Maintain State
```

## API Compatibility

The `openDrawer` API remains completely unchanged. All existing functionality is preserved:

```tsx
const result = await openDrawer({
  // Initial data for the modal
  initialData: { name: '', email: '' },
  
  // Render the modal content
  render: ({ state, onChange, resolve, reject }) => (
    <MyModalContent
      data={state.data}
      onUpdate={(newData) => onChange(newData)}
      onSave={(finalData) => resolve(finalData)}
      onCancel={() => resolve(undefined)}
      onError={(error) => reject(error)}
    />
  ),
  
  // Optional footer with access to current state
  renderFooter: ({ state, resolve }) => (
    <Button onPress={() => resolve(state.data)}>
      Save Changes
    </Button>
  ),
});
```

## Benefits

1. **Improved Performance**: Modal content is rendered once per modal lifecycle
2. **Predictable Behavior**: Hooks and effects work as expected without surprises
3. **Better User Experience**: No flickering or state loss during interactions
4. **Reduced Resource Usage**: Expensive operations aren't repeated unnecessarily

## Technical Details

The optimization leverages:

- **React.memo**: Prevents re-renders when props haven't changed
- **useRef**: Maintains stable references across renders
- **Custom Comparison**: Fine-grained control over when re-renders occur
- **Prop Stability**: Ensures callback functions maintain referential equality

This ensures that modal content behaves like a properly isolated component, unaffected by parent component re-renders while still maintaining full reactivity to its own state changes.
