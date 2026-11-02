// In-memory stand-in for the WebExtension APIs the add-on uses, so its pages
// run on a plain local server. Storage persists in localStorage across reloads
// and between the fixture pages.
(() => {
  const KEY = "undoomscroll-fixture";
  const data = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));
  const listeners = [];
  window.undoomscrollData = data;
  window.browser = {
    storage: {
      local: {
        get: async (key) => (key in data ? { [key]: structuredClone(data[key]) } : {}),
        set: async (items) => {
          Object.assign(data, structuredClone(items));
          save();
        },
      },
      onChanged: { addListener() {} },
    },
    runtime: {
      getURL: (path) => `/dist/${path}`,
      onMessage: { addListener: (fn) => listeners.push(fn) },
      sendMessage: async (message) => {
        for (const fn of listeners) {
          const reply = fn(message);
          if (reply !== undefined) return reply;
        }
      },
      openOptionsPage: async () => window.open("/fixtures/options.html"),
    },
    permissions: { contains: async () => true, request: async () => true },
  };
})();
