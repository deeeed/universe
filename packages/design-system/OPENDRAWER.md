# Bottom Sheet/Drawer System in Design System

## Architecture Overview

The Design System implements a modal and drawer system using bottom sheets. Key files and components:

### Provider Hierarchy

1. **UIProvider** (`src/providers/UIProvider.tsx`)
   - Root provider that sets up themes, languages, and core functionality
   - Contains SafeAreaProvider, LanguageProvider, and GestureHandlerRootView
   - Creates the portal system for rendering modals and drawers

2. **ModalControllerProvider** (`src/providers/ModalControllerProvider.tsx`)
   - Unified controller for both modals and bottom sheets (drawers)
   - Provides a common interface through the `useModalController` hook
   - Maintains shared ID counter for ordering modals/drawers

3. **BottomSheetProvider** (`src/providers/BottomSheetProvider.tsx`)
   - Implements the bottom sheet functionality
   - Uses `BottomSheetModalProvider` from @gorhom/bottom-sheet
   - Renders bottom sheets through a Portal

### Core Hooks and Components

1. **useBottomSheetStack** (`src/hooks/useBottomSheetStack.ts`)
   - Manages the state of all bottom sheets/drawers
   - Tracks opening, closing, and updates to bottom sheets
   - Handles animations and presentation timing

2. **BottomSheetModalWrapper** (`src/components/bottom-modal/BottomSheetModalWrapper.tsx`)
   - Renders the actual bottom sheet UI components
   - Configures keyboard behavior, animations, and appearance
   - Contains handlers for user interaction

3. **useModal** (`src/hooks/useModal/useModal.tsx`)
   - Provides a clean API for opening drawers and modals
   - Includes specialized functions like `editProp` for common scenarios
   - Sets default configurations for different use cases

## Design Goals

### Drawer Hierarchy and Stacking

A primary design goal was to support hierarchical drawer stacking, allowing multiple drawers to be opened on top of each other. This enables complex user flows such as:

1. Opening a main drawer with a list of items
2. Opening a second drawer to edit a selected item
3. Opening a third drawer for a specific field's complex editor
4. And so on...

The system is designed so these drawers can be controlled independently:
- Each drawer has its own state and lifecycle
- Closing one drawer should not affect others (unless configured to do so)
- Data can flow between drawers through the state system

### State Management and Rendering Optimization

The design aims to optimize rendering performance by:
- Separating state from UI components
- Using memoization to prevent unnecessary re-renders
- Supporting partial updates to drawer content

In theory, when a drawer's content changes (e.g., when typing in an input field), only the affected components should re-render, not the entire drawer or drawer stack. The state management is implemented with this optimization in mind:

```typescript
// Updating just one field in the drawer state
onChange({ ...data, name: newName });
```

## Current Implementation

### Opening a Drawer

The primary way to open a drawer is through the `openDrawer` method provided by `useModal`:

```typescript
const { openDrawer } = useModal();

const openMyDrawer = async () => {
  const result = await openDrawer({
    title: "My Drawer Title",
    initialData: initialValues,
    render: ({ state, onChange }) => {
      // Render your drawer content here
      return <YourComponent data={state.data} onChange={onChange} />;
    },
    bottomSheetProps: {
      // Additional configuration for the bottom sheet
    }
  });
  
  // Handle the result when drawer closes
  if (result) {
    // Do something with the result
  }
};
```

### Configuration Options

1. **Basic Properties**:
   - `title`: Title displayed in the drawer header
   - `initialData`: Initial data to populate the drawer
   - `render`: Function to render drawer content
   - `footerType`: Type of footer to show (e.g., 'confirm_cancel')

2. **Bottom Sheet Properties**:
   - `enableDynamicSizing`: Enables dynamic sizing based on content
   - `snapPoints`: Array of snap points (e.g., ['50%'])
   - `android_keyboardInputMode`: How Android handles keyboard ('adjustResize' or 'adjustPan')
   - `keyboardBehavior`: How the sheet behaves when keyboard appears ('extend', 'interactive', etc.)

## Current Issues

### TextInput and Keyboard Handling

When a TextInput component is placed inside a bottom sheet drawer and receives focus:
1. The keyboard appears
2. The TextInput is pushed off-screen or becomes obscured
3. The user cannot see what they are typing

### Current Configuration

```typescript
const defaultBottomSheetModalProps: Partial<BottomSheetModalProps> = {
  enableDynamicSizing: true,
  android_keyboardInputMode: 'adjustResize',
  keyboardBehavior: 'extend',
  keyboardBlurBehavior: 'restore',
  enablePanDownToClose: true,
  enableDismissOnClose: true,
  stackBehavior: 'push',
  backgroundStyle: { backgroundColor: 'transparent' },
  topInset: 50,
};
```

### Performance Issues

Several performance issues have been observed in the current implementation:

1. **Input Field Responsiveness**:
   - Typing in text inputs sometimes feels sluggish
   - The drawer may lag behind keyboard input
   - This is especially noticeable when typing quickly

2. **Section Update Performance**:
   - When content in one section changes (e.g., main content), updates to other sections (header/footer) can be delayed
   - State changes may not propagate efficiently across the drawer components

3. **Rendering Optimization Concerns**:
   - It's unclear if the current implementation properly optimizes rendering
   - There may be unnecessary re-renders of the entire drawer when only small parts change
   - The memoization strategy may need revision

4. **Stacked Drawer Performance**:
   - Multiple stacked drawers can compound performance issues
   - State updates in lower drawers may inefficiently propagate through the stack

### Attempted Solutions

1. Changed `keyboardBehavior` to various values ('extend', 'interactive')
2. Used different `android_keyboardInputMode` settings ('adjustResize', 'adjustPan')
3. Added dynamic sizing and proper snap points
4. Tried manual keyboard height tracking

### Needed Fixes

#### Keyboard Handling Fix

A solution is needed to properly handle keyboard appearance with TextInputs in bottom sheets, ensuring:
1. The TextInput remains visible when keyboard appears
2. The bottom sheet adjusts its position appropriately
3. The user can see and interact with the input field

Current evidence suggests the issue may be related to:
- Snap point configuration
- Keyboard behavior settings
- Potential limitations in @gorhom/bottom-sheet itself
- Interaction between SafeAreaView and keyboard handling

#### Performance Optimization

To address performance issues, several areas should be investigated:

1. **Rendering Strategy**:
   - Review the current memoization approach
   - Ensure components are properly separated to prevent cascade re-renders
   - Consider implementing `React.memo` more extensively

2. **State Management**:
   - Evaluate if the current state update mechanism is efficient
   - Consider using a more optimized state management approach for complex forms
   - Potentially implement useReducer with selective updates

3. **Component Structure**:
   - Separate header, content, and footer rendering more clearly
   - Ensure state updates in one section don't trigger re-renders in others
   - Consider using context selectors to optimize state consumption
