if (!globalThis.DOMException) {
  // Fallback if DOMException is not present (highly unlikely in Node 18+)
  globalThis.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'DOMException';
    }
  };
}
module.exports = globalThis.DOMException;
