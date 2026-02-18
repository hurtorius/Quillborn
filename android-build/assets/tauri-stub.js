// Tauri API stubs for standalone WebView APK
// Provides enough mock behavior for the UI to render and be interactive
(function() {
  if (window.__TAURI_INTERNALS__) return;

  let callbackId = 0;
  const callbacks = {};

  window.__TAURI_INTERNALS__ = {
    transformCallback: function(fn, once) {
      const id = callbackId++;
      callbacks[id] = fn;
      return id;
    },
    unregisterCallback: function(id) {
      delete callbacks[id];
    },
    invoke: function(cmd, args) {
      // Return empty/mock data for common plugin commands
      if (cmd.includes('read_text_file') || cmd.includes('readTextFile')) {
        return Promise.resolve('');
      }
      if (cmd.includes('write_text_file') || cmd.includes('writeTextFile')) {
        return Promise.resolve();
      }
      if (cmd.includes('read_dir') || cmd.includes('readDir')) {
        return Promise.resolve([]);
      }
      if (cmd.includes('exists')) {
        return Promise.resolve(false);
      }
      if (cmd.includes('create_dir') || cmd.includes('mkdir')) {
        return Promise.resolve();
      }
      if (cmd.includes('open') || cmd.includes('save')) {
        return Promise.resolve(null);
      }
      // Default: resolve with empty result
      return Promise.resolve(null);
    },
    convertFileSrc: function(path, protocol) {
      return path;
    }
  };

  // Mark as not-Tauri so the app can detect standalone mode
  window.isTauri = false;
  // But globalThis.isTauri needs to be false too
  Object.defineProperty(globalThis, '__TAURI_INTERNALS__', {
    value: window.__TAURI_INTERNALS__,
    writable: false
  });
})();
