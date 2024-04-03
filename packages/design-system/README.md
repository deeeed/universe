# design-system

```tsx
import { UIProvider, DefaultDarkTheme } from "@design-system";
// Customize by overwritting the darkTheme
<UIProvider locale={"en"} darkTheme={{...DefaultDarkTheme, colors: { ...DefaultDarkTheme.colors, background: "yellow"}}>
    {children}
</UIProvider>
```
