const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

export const debug = {
  log: (...args) => { if (DEBUG) console.log(...args); },
  warn: (...args) => { if (DEBUG) console.warn(...args); },
  error: (...args) => { if (DEBUG) console.error(...args); },
  info: (...args) => { if (DEBUG) console.info(...args); },
};
