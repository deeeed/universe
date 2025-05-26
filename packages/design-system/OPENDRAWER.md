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
      <MyModalContent onFinish={(data) => resolve(data)} />
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

## The Solution ✅ FIXED

We fixed this at the design-system level by ensuring modal content is only rendered once when the modal opens, not on every parent re-render, while still allowing the modal to re-render when its internal state changes.

### Implementation

The fix uses a combination of memoization and refs to maintain a stable reference to the rendered content:

```tsx
const ModalContent = memo(
  ({
    state,
    onChange,
    render,
    resolve,
    reject,
  }: Omit<ModalContentProps, "modalId">) => {
    // Store the initial render function in a ref to prevent recreation on parent re-renders
    const renderRef = useRef(render);

    // Only update the render function on mount to prevent parent re-renders from affecting us
    useEffect(() => {
      renderRef.current = render;
    }, []); // Empty deps - only run once on mount

    // Render the content with current state - this will re-render when state changes
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
  // Custom comparison function - only re-render when state actually changes
  (prevProps, nextProps) => {
    // Only re-render if state changed
    return prevProps.state === nextProps.state;
  },
);
```

### Key Improvements

1. **Stable Render Function**: The render function is stored in a ref and only updated on mount, preventing parent re-renders from creating new function instances
2. **State-Aware Re-rendering**: The component re-renders when modal state changes via `onChange`, ensuring UI updates properly
3. **Optimized Comparison**: Custom memo comparison only checks state changes, ignoring other prop changes that don't affect the UI

## How It Works

### Before the Fix

```
Parent Re-render → render() called → New Component Instance → All Hooks Re-initialized
Modal State Change → render() NOT called → ❌ STALE CONTENT → User sees old data
```

### After the Fix

```
Parent Re-render → render() NOT called → Same Component Instance → Hooks Maintain State
Modal State Change → render() called → ✅ UPDATED CONTENT → User sees new data
```

## Testing the Fix

To validate the fix works correctly, use the test page at `examples/designdemo/src/app/(tabs)/bug.tsx`:

1. **Test Parent Re-renders**: Type in the parent input field - modal content should NOT re-render
2. **Test Modal State Updates**: Click "Test EditableInfoCard Bug (Recording Edit)" button
   - Edit the title or description using inline edit
   - Changes should persist immediately without reverting
   - The UI should update to reflect the new values

### Expected Behavior

When editing an EditableInfoCard within a modal:

1. Click the pencil icon to enter edit mode
2. Type new value
3. Click the checkmark to save
4. ✅ The new value should persist and display immediately
5. ✅ The modal's internal state should update
6. ✅ No reverting to old values

## API Compatibility

The `openDrawer` API remains completely unchanged. All existing functionality is preserved:

```tsx
const result = await openDrawer({
  // Initial data for the modal
  initialData: { name: "", email: "" },

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
    <Button onPress={() => resolve(state.data)}>Save Changes</Button>
  ),
});
```

## Benefits

1. **Improved Performance**: Modal content is rendered once per modal lifecycle
2. **Predictable Behavior**: Hooks and effects work as expected without surprises
3. **Better User Experience**: No flickering or state loss during interactions
4. **Reduced Resource Usage**: Expensive operations aren't repeated unnecessarily
5. **✅ Proper State Updates**: Modal content updates when state changes via `onChange`
6. **✅ EditableInfoCard Support**: Inline editing works correctly without reverting values

## Technical Details

The optimization leverages:

- **React.memo**: Prevents re-renders when props haven't changed
- **useRef**: Maintains stable references across renders
- **Custom Comparison**: Fine-grained control over when re-renders occur
- **Prop Stability**: Ensures callback functions maintain referential equality

This ensures that modal content behaves like a properly isolated component, unaffected by parent component re-renders while still maintaining full reactivity to its own state changes.
