const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.debug ? console.debug('[DEBUG]', ...args) : console.log('[DEBUG]', ...args),
  warn: (...args) => console.warn ? console.warn('[WARN]', ...args) : console.log('[WARN]', ...args),
};

module.exports = logger; 