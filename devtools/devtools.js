chrome.devtools.panels.create(
  "Request Diff",
  "/icons/icon16.png",
  "/panel/panel.html"
);

chrome.devtools.network.onRequestFinished.addListener((request) => {
  const type = request._resourceType;
  if (!["xhr", "fetch"].includes(type)) return;

  request.getContent((body) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      method:      request.request.method,
      url:         request.request.url,
      status:      request.response.status,
      contentType: request.response.content.mimeType || "",
      body:        body || "",
      capturedAt:  new Date().toISOString(),
    };
    chrome.storage.session.get("rdEntries", ({ rdEntries = [] }) => {
      rdEntries.unshift(entry);
      if (rdEntries.length > 300) rdEntries.length = 300;
      chrome.storage.session.set({ rdEntries });
    });
  });
});
