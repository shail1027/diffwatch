chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.set({ rdEntries: [] });
});
