let entries    = [];
let pinA       = null;
let pinB       = null;
let diffMode   = "unified";
let filterText = "";

function init() {
  document.getElementById("btn-capture").addEventListener("click", loadEntries);
  document.getElementById("btn-diff").addEventListener("click", runDiff);
  document.getElementById("btn-clear").addEventListener("click", clearAll);
  document.getElementById("filter").addEventListener("input", e => {
    filterText = e.target.value.toLowerCase();
    renderList();
  });
  document.querySelectorAll(".mode-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      diffMode = btn.dataset.mode;
      document.querySelectorAll(".mode-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (pinA && pinB) runDiff();
    });
  });

  loadEntries();
  setInterval(loadEntries, 3000);
}

function loadEntries() {
  chrome.storage.local.get("rdEntries", ({ rdEntries = [] }) => {
    entries = rdEntries;
    renderList();
    document.getElementById("capture-count").textContent =
      entries.length ? `${entries.length}개 캡처됨` : "";
  });
}

function clearAll() {
  chrome.storage.local.set({ rdEntries: [] });
  entries = []; pinA = null; pinB = null;
  renderList();
  resetDiff();
}

function renderList() {
  const scroll = document.getElementById("list-scroll");

  const filtered = entries.filter(e =>
    !filterText || e.url.toLowerCase().includes(filterText)
  );

  if (!filtered.length) {
    scroll.innerHTML = "";
    const msg = document.createElement("div");
    msg.className = "list-empty";
    msg.innerHTML = filterText
      ? `<div>"${escHtml(filterText)}" 결과 없음</div>`
      : `<div>요청이 없어요</div><div class="hint">페이지를 이동하거나 새로고침하면<br/>XHR / Fetch 요청이 자동 캡처됩니다</div>`;
    scroll.appendChild(msg);
    return;
  }

  scroll.innerHTML = filtered.map(e => {
    const urlObj  = tryParseUrl(e.url);
    const path    = urlObj ? urlObj.pathname + urlObj.search : e.url;
    const host    = urlObj ? urlObj.hostname : "";
    const isPinA  = pinA?.id === e.id;
    const isPinB  = pinB?.id === e.id;
    const sc      = statusClass(e.status);
    const time    = new Date(e.capturedAt).toLocaleTimeString("ko-KR", { hour12: false });

    return `
      <div class="req-item${isPinA ? " pinned-a" : isPinB ? " pinned-b" : ""}" data-id="${escHtml(e.id)}">
        <div class="req-left">
          <div><span class="method-pill method-${escHtml(e.method)}">${escHtml(e.method)}</span></div>
          <div class="req-url" title="${escHtml(e.url)}">${escHtml(path)}</div>
          <div class="req-meta">
            <span class="${sc}">${e.status}</span>
            <span>${escHtml(host)}</span>
            <span>${time}</span>
          </div>
        </div>
        <div class="pin-btns">
          <button class="pin-btn pin-a${isPinA ? " active-a" : ""}" data-id="${escHtml(e.id)}" title="A로 설정">A</button>
          <button class="pin-btn pin-b${isPinB ? " active-b" : ""}" data-id="${escHtml(e.id)}" title="B로 설정">B</button>
        </div>
      </div>`;
  }).join("");

  scroll.querySelectorAll(".pin-btn.pin-a").forEach(btn => {
    btn.addEventListener("click", ev => { ev.stopPropagation(); setPin("A", btn.dataset.id); });
  });
  scroll.querySelectorAll(".pin-btn.pin-b").forEach(btn => {
    btn.addEventListener("click", ev => { ev.stopPropagation(); setPin("B", btn.dataset.id); });
  });
}

function setPin(slot, id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  if (slot === "A") pinA = entry;
  else              pinB = entry;
  renderList();
  if (pinA && pinB) runDiff();
}

function runDiff() {
  if (!pinA || !pinB) {
    alert("A와 B를 모두 선택해주세요.");
    return;
  }

  const bodyA = prettyJson(pinA.body);
  const bodyB = prettyJson(pinB.body);

  document.getElementById("diff-header").style.display = "flex";
  document.getElementById("hdr-a").textContent = `A — ${shortUrl(pinA.url)}`;
  document.getElementById("hdr-b").textContent = `B — ${shortUrl(pinB.url)}`;

  if (diffMode === "unified")    renderUnified(bodyA, bodyB);
  else if (diffMode === "sbs")   renderSideBySide(bodyA, bodyB);
  else                           renderRaw(bodyA, bodyB);
}

function renderUnified(textA, textB) {
  const linesA = textA.split("\n");
  const linesB = textB.split("\n");
  const patch  = computeDiff(linesA, linesB);

  let adds = 0, dels = 0;
  const html = [];

  patch.forEach(hunk => {
    html.push(`<div class="line-hunk">@@ -${hunk.startA},${hunk.lenA} +${hunk.startB},${hunk.lenB} @@</div>`);
    hunk.lines.forEach(({ type, text, noA, noB }) => {
      if (type === "add") adds++;
      if (type === "del") dels++;
      const cls    = type === "add" ? "line-add" : type === "del" ? "line-del" : "line-ctx";
      const sign   = type === "add" ? "+" : type === "del" ? "−" : " ";
      const noAStr = noA != null ? noA : "";
      const noBStr = noB != null ? noB : "";
      html.push(`
        <div class="diff-line ${cls}">
          <div class="line-no">${noAStr}</div>
          <div class="line-no">${noBStr}</div>
          <div class="line-sign">${sign}</div>
          <div class="line-code">${escHtml(text)}</div>
        </div>`);
    });
  });

  document.getElementById("diff-stats").innerHTML =
    adds || dels
      ? `<span class="stat-add">+${adds}</span><span class="stat-del">−${dels}</span>`
      : `<span style="color:var(--add-text)">변경 없음</span>`;

  const body = document.getElementById("diff-body");
  if (!adds && !dels) {
    body.innerHTML = `<div class="no-diff-msg">✓ 두 응답이 동일합니다<div class="sub">차이가 없어요</div></div>`;
  } else {
    body.innerHTML = `<div class="diff-table">${html.join("")}</div>`;
  }
}

function renderSideBySide(textA, textB) {
  const body = document.getElementById("diff-body");
  body.innerHTML = `
    <div class="sbs-wrap">
      <div class="sbs-col">
        <div class="sbs-col-header a">A — ${escHtml(shortUrl(pinA.url))}</div>
        <div class="sbs-json">${syntaxHighlight(textA)}</div>
      </div>
      <div class="sbs-col">
        <div class="sbs-col-header b">B — ${escHtml(shortUrl(pinB.url))}</div>
        <div class="sbs-json">${syntaxHighlight(textB)}</div>
      </div>
    </div>`;
  document.getElementById("diff-stats").innerHTML = "";
}

function renderRaw(textA, textB) {
  const body = document.getElementById("diff-body");
  body.innerHTML = `
    <div class="sbs-wrap">
      <div class="sbs-col">
        <div class="sbs-col-header a">A Raw</div>
        <div class="sbs-json">${escHtml(pinA.body)}</div>
      </div>
      <div class="sbs-col">
        <div class="sbs-col-header b">B Raw</div>
        <div class="sbs-json">${escHtml(pinB.body)}</div>
      </div>
    </div>`;
  document.getElementById("diff-stats").innerHTML = "";
}

function resetDiff() {
  document.getElementById("diff-header").style.display = "none";
  document.getElementById("diff-body").innerHTML = `
    <div class="diff-placeholder">
      <div class="big">≠</div>
      <p>두 요청을 선택하면<br/>git diff 스타일로 비교해드려요</p>
      <div class="hint">왼쪽 목록에서 A · B 버튼을 눌러 비교 대상을 선택하세요</div>
    </div>`;
}

function computeDiff(linesA, linesB) {
  const N = linesA.length, M = linesB.length;
  const MAX = N + M;
  const V = new Array(2 * MAX + 1).fill(0);

  function ses() {
    const trace = [];
    for (let d = 0; d <= MAX; d++) {
      trace.push([...V]);
      for (let k = -d; k <= d; k += 2) {
        let x;
        const idx = k + MAX;
        if (k === -d || (k !== d && V[idx - 1] < V[idx + 1])) x = V[idx + 1];
        else x = V[idx - 1] + 1;
        let y = x - k;
        while (x < N && y < M && linesA[x] === linesB[y]) { x++; y++; }
        V[idx] = x;
        if (x >= N && y >= M) return trace;
      }
    }
    return trace;
  }

  const trace = ses();

  const ops = [];
  let x = N, y = M;
  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;
    const idx = k + MAX;
    let prevK;
    if (k === -d || (k !== d && v[idx - 1] < v[idx + 1])) prevK = k + 1;
    else prevK = k - 1;
    const prevX = v[prevK + MAX];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { x--; y--; ops.unshift({ type: "eq", a: x, b: y }); }
    if (d > 0) {
      if (x > prevX) { x--; ops.unshift({ type: "del", a: x, b: -1 }); }
      else           { y--; ops.unshift({ type: "ins", a: -1, b: y }); }
    }
  }

  const CTX = 3;
  const hunks = [];
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type !== "eq") {
      const start = Math.max(0, i - CTX);
      // 인접한 변경 구간을 하나의 hunk로 병합
      let end = Math.min(ops.length, i + 1 + CTX);
      let scanning = true;
      while (scanning) {
        scanning = false;
        let nextChange = end;
        while (nextChange < ops.length && ops[nextChange].type === "eq") nextChange++;
        if (nextChange < ops.length && nextChange - end <= CTX) {
          end = Math.min(ops.length, nextChange + 1 + CTX);
          scanning = true;
        }
      }

      const lines = [];
      let startA = null, startB = null;
      let lenA = 0, lenB = 0;
      for (let j = start; j < end; j++) {
        const op = ops[j];
        if (op.type === "eq") {
          if (startA === null) startA = op.a + 1;
          if (startB === null) startB = op.b + 1;
          lines.push({ type: "ctx", text: linesA[op.a], noA: op.a + 1, noB: op.b + 1 });
          lenA++; lenB++;
        } else if (op.type === "del") {
          if (startA === null) startA = op.a + 1;
          lines.push({ type: "del", text: linesA[op.a], noA: op.a + 1, noB: null });
          lenA++;
        } else {
          if (startB === null) startB = op.b + 1;
          lines.push({ type: "add", text: linesB[op.b], noA: null, noB: op.b + 1 });
          lenB++;
        }
      }
      hunks.push({ startA: startA ?? 1, startB: startB ?? 1, lenA, lenB, lines });
      i = end;
    } else {
      i++;
    }
  }
  return hunks;
}

function prettyJson(str) {
  try { return JSON.stringify(JSON.parse(str), null, 2); }
  catch { return str || ""; }
}

function syntaxHighlight(str) {
  // HTML 이스케이프 후 JSON 토큰 강조
  // "는 escHtml이 변환하지 않으므로 키/값 패턴 매칭이 정상 동작함
  return escHtml(str)
    .replace(/"((?:[^"\\]|\\.)*)"\s*:/g, '<span style="color:#7eb8ff">"$1"</span>:')
    .replace(/:\s*"((?:[^"\\]|\\.)*)"/g, (m, v) => `: <span style="color:#ffd97d">"${v}"</span>`)
    .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, (m, n) => `: <span style="color:#7fffb2">${n}</span>`)
    .replace(/:\s*(true|false|null)/g, (m, b) => `: <span style="color:#ff9e9e">${b}</span>`);
}

function escHtml(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tryParseUrl(url) {
  try { return new URL(url); } catch { return null; }
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname + (u.search.length > 30 ? u.search.slice(0, 30) + "…" : u.search);
  } catch { return url.slice(0, 50); }
}

function statusClass(s) {
  if (s >= 200 && s < 300) return "status-badge status-2xx";
  if (s >= 300 && s < 400) return "status-badge status-3xx";
  if (s >= 400 && s < 500) return "status-badge status-4xx";
  return "status-badge status-5xx";
}

init();
