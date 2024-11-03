export const storage = {
  load: function (key, defaultValue = null) {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  },
  store: function (key, value) {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  },
};
