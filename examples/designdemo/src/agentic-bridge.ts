import { Platform } from 'react-native'
import { router } from 'expo-router'

let _uiState: Record<string, unknown> = {}
let _routeInfo: { pathname: string; segments: string[] } = {
  pathname: '',
  segments: [],
}

export function setAgenticUIState(state: Record<string, unknown>) {
  _uiState = state
}

export function setAgenticRouteInfo(pathname: string, segments: string[]) {
  _routeInfo = { pathname, segments }
}

if (__DEV__) {
  ;(globalThis as Record<string, unknown>).__AGENTIC__ = {
    platform: Platform.OS,
    navigate: (path: string) => {
      try { router.push(path as never); return true }
      catch (e) { return { error: String(e) } }
    },
    getRoute: () => _routeInfo,
    getState: () => _uiState,
    canGoBack: () => router.canGoBack(),
    goBack: () => { router.back(); return true },
  }
}
