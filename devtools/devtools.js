chrome.devtools.panels.create(
  "Request Diff",
  "/icons/icon16.png",
  "/panel/panel.html",
);

console.log("[diffwatch] devtools.js 로드됨");

chrome.devtools.network.onRequestFinished.addListener((request) => {
  console.log(
    "[diffwatch] 요청 캡처:",
    request.request.url,
    request._resourceType,
  );
  const mime = request.response.content.mimeType || "";
  const url = request.request.url;
  const skipExtensions =
    /\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|css|map)(\?|$)/i;
  if (skipExtensions.test(url)) return;
  if (mime.includes("image") || mime.includes("font") || mime.includes("css"))
    return;

  request.getContent((body) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      method: request.request.method,
      url: request.request.url,
      status: request.response.status,
      contentType: request.response.content.mimeType || "",
      body: body || "",
      capturedAt: new Date().toISOString(),
    };
    chrome.storage.local.get("rdEntries", ({ rdEntries = [] }) => {
      rdEntries.unshift(entry);
      if (rdEntries.length > 300) rdEntries.length = 300;
      chrome.storage.local.set({ rdEntries });
    });
  });
});
