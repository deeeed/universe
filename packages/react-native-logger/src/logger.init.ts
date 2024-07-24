import { setNamespaces } from './logger.core';
import { state } from './logger.state';

// Function to initialize debug settings from environment variables or local storage
export const initializeDebugSettings = () => {
  let debugSetting = '';

  if (typeof process !== 'undefined' && process.env.DEBUG) {
    debugSetting = process.env.DEBUG;
    console.debug(`DEBUG setting from environment variable: ${debugSetting}`);
  } else if (typeof window !== 'undefined' && window.localStorage) {
    debugSetting = window.localStorage.getItem('DEBUG') || '';
    console.debug('DEBUG setting from local storage:', debugSetting);
  }

  if (debugSetting) {
    state.config.namespaces = debugSetting;
    setNamespaces(debugSetting);
  }
};
