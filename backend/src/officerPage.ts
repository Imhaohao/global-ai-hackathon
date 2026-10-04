import { ALERT_FOOTER, OUTBREAK_MIN_FARMS } from "../../shared/src/neighbourAlerts.ts";

const STYLES = `
  :root {
    --surface: #f6f3ec; --panel: #ffffff; --panel-sunken: #efebe2; --text: #1f2a24; --muted: #55625a;
    --accent: #1f5136; --on-accent: #ffffff; --line: #d8d2c4; --problem: #8a2f1d;
    --radius: 12px; --radius-inner: 8px; --shadow: 0 1px 3px rgb(0 0 0 / 0.08), 0 8px 24px rgb(0 0 0 / 0.04);
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --surface: #141a16; --panel: #1d2520; --panel-sunken: #232c26; --text: #e8ece9; --muted: #a3b0a8;
      --accent: #8fc9a5; --on-accent: #0f1712; --line: #3a463f; --problem: #f0a08c;
      --shadow: 0 1px 3px rgb(0 0 0 / 0.4);
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--surface); color: var(--text); font: 1rem/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; display: grid; gap: 2rem; }
  h1 { font-size: 1.75rem; line-height: 1.2; margin: 0; }
  h2 { font-size: 1.125rem; line-height: 1.3; margin: 0; }
  p { margin: 0; }
  .muted { color: var(--muted); }
  #status:empty { margin-block-end: -2rem; }
  .figure { font-variant-numeric: tabular-nums; }
  header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  button { font: inherit; font-weight: 600; min-height: 2.75rem; padding: 0.5rem 1.125rem; border: 0; border-radius: var(--radius-inner); cursor: pointer; }
  button.primary { background: var(--accent); color: var(--on-accent); }
  button.quiet { background: var(--panel-sunken); color: var(--text); }
  button:disabled { opacity: 0.55; cursor: progress; }
  button:focus-visible, textarea:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .card { background: var(--panel); border-radius: var(--radius); box-shadow: var(--shadow); padding: 1.25rem; display: grid; gap: 1rem; }
  dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: 0.75rem; margin: 0; }
  dl div { background: var(--panel-sunken); border-radius: var(--radius-inner); padding: 0.625rem 0.75rem; }
  dt { color: var(--muted); font-size: 0.875rem; }
  dd { margin: 0; font-size: 1.5rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  label { font-weight: 600; display: block; margin-block-end: 0.375rem; }
  textarea, input { width: 100%; font: inherit; color: var(--text); background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius-inner); padding: 0.625rem 0.75rem; }
  textarea { min-height: 7.5rem; field-sizing: content; resize: vertical; }
  .footer-line { color: var(--muted); font-size: 0.875rem; margin-block-start: 0.375rem; }
  .problem { color: var(--problem); font-weight: 600; }
  .stack { display: grid; gap: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: start; padding: 0.5rem 0; border-block-end: 1px solid var(--line); }
  td.figure, th.figure { text-align: end; }
  .sent-body { white-space: pre-wrap; background: var(--panel-sunken); border-radius: var(--radius-inner); padding: 0.75rem; }
  [hidden] { display: none !important; }
`;

const SCRIPT = `
const TOKEN_KEY = "leaf-doctor-officer-token";
const $ = (id) => document.getElementById(id);
const status = $("status");

function readToken() { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } }
function saveToken(token) { try { sessionStorage.setItem(TOKEN_KEY, token); } catch {} }
function forgetToken() { try { sessionStorage.removeItem(TOKEN_KEY); } catch {} }

function element(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function announce(text) { status.textContent = text; }

async function call(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: "Bearer " + readToken(), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) { lock("That token was not accepted. Paste the hub token again."); throw new Error("locked"); }
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error ?? "The server answered " + response.status + ". Try again in a minute.");
  return payload;
}

function lock(problem) {
  forgetToken();
  $("dashboard").hidden = true;
  $("dashboard-actions").hidden = true;
  $("unlock").hidden = false;
  $("token-problem").textContent = problem ?? "";
  $("token").setAttribute("aria-invalid", problem ? "true" : "false");
  $("token").focus();
}

function fact(label, value) {
  return element("div", {}, [element("dt", { textContent: label }), element("dd", { textContent: String(value) })]);
}

function suggestionCard({ alert, subscriberCount }) {
  const fieldId = "message-" + alert.id;
  const problem = element("p", { className: "problem", id: fieldId + "-problem" });
  const message = element("textarea", { id: fieldId, value: alert.draft });
  message.setAttribute("aria-describedby", fieldId + "-footer " + fieldId + "-problem");
  const recipients = subscriberCount === 1 ? "1 farmer" : subscriberCount + " farmers";
  const send = element("button", { className: "primary", type: "button", textContent: "Send to " + recipients + " in " + alert.areaName });
  const dismiss = element("button", { className: "quiet", type: "button", textContent: "Dismiss" });
  send.disabled = subscriberCount === 0;
  send.addEventListener("click", () => decide(send, problem, "/officer/send", { id: alert.id, text: message.value },
    "Send this alert to " + recipients + " in " + alert.areaName + "? Texts cannot be recalled.", message));
  dismiss.addEventListener("click", () => decide(dismiss, problem, "/officer/dismiss", { id: alert.id },
    "Dismiss this alert? No new alert for " + alert.conditionName.toLowerCase() + " in " + alert.areaName + " will be suggested for 7 days."));
  return element("article", { className: "card" }, [
    element("h2", { textContent: alert.conditionName + " in " + alert.areaName }),
    element("dl", {}, [
      fact("Farms reporting this week", alert.farmCount),
      fact("Seen in a photo", alert.photoFarmCount),
      fact("Farmers signed up here", subscriberCount),
    ]),
    element("div", {}, [
      element("label", { htmlFor: fieldId, textContent: "Message" }),
      message,
      element("p", { className: "footer-line", id: fieldId + "-footer", textContent: "Added to every text: ${ALERT_FOOTER}" }),
    ]),
    problem,
    element("div", { className: "actions" }, [send, dismiss]),
  ]);
}

async function decide(button, problem, path, body, question, field) {
  problem.textContent = "";
  if (field && !field.value.trim()) { problem.textContent = "Write a message before sending."; field.focus(); return; }
  if (!window.confirm(question)) return;
  button.disabled = true;
  try {
    const result = await call(path, body);
    announce(result?.recipientCount !== undefined ? "Alert queued for " + result.recipientCount + " farmers." : "Alert dismissed.");
    await refresh();
  } catch (error) {
    button.disabled = false;
    if (error.message !== "locked") problem.textContent = error.message;
  }
}

function sentItem(alert) {
  const when = new Date(alert.decidedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  return element("article", { className: "card" }, [
    element("h2", { textContent: alert.conditionName + " in " + alert.areaName }),
    element("p", { className: "muted", textContent: "Sent " + when + " to " + alert.recipientCount + " farmers" }),
    element("p", { className: "sent-body", textContent: alert.sentBody }),
  ]);
}

function areaRow(area) {
  return element("tr", {}, [element("td", { textContent: area.name }), element("td", { className: "figure", textContent: String(area.subscriberCount) })]);
}

function render(view) {
  $("suggested").replaceChildren(...view.suggested.map(suggestionCard));
  $("no-suggestions").hidden = view.suggested.length > 0;
  $("areas").replaceChildren(...view.areas.map(areaRow));
  $("sent").replaceChildren(...view.sent.map(sentItem));
  $("sent-section").hidden = view.sent.length === 0;
}

async function refresh() {
  const view = await call("/officer/alerts");
  $("unlock").hidden = true;
  $("dashboard").hidden = false;
  $("dashboard-actions").hidden = false;
  render(view);
}

$("unlock").addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = $("token").value.trim();
  if (!token) { lock("Paste the hub token to continue."); return; }
  saveToken(token);
  $("token").value = "";
  await refresh().catch((error) => { if (error.message !== "locked") lock(error.message); });
});
$("refresh").addEventListener("click", () => refresh().then(() => announce("Up to date.")).catch((error) => announce(error.message)));
$("lock").addEventListener("click", () => lock());

if (readToken()) refresh().catch((error) => { if (error.message !== "locked") lock(error.message); });
else lock();
`;

export const officerPage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Area alerts | Leaf Doctor</title><style>${STYLES}</style></head><body><main>
<header><h1>Area alerts</h1><div class="actions" id="dashboard-actions" hidden><button type="button" class="quiet" id="refresh">Check for new reports</button><button type="button" class="quiet" id="lock">Lock page</button></div></header>
<p role="status" id="status" class="muted"></p>
<form id="unlock" class="card" hidden novalidate>
  <div><label for="token">Hub token</label><input id="token" type="password" autocomplete="current-password" aria-describedby="token-problem token-help"></div>
  <p class="muted" id="token-help">The same token the hub phone and Messages bridge use. It is kept only until you close this tab.</p>
  <p class="problem" id="token-problem"></p>
  <div class="actions"><button type="submit" class="primary">Open alerts</button></div>
</form>
<div id="dashboard" class="stack" hidden>
  <section class="stack" aria-labelledby="waiting-heading">
    <h2 id="waiting-heading">Waiting for your check</h2>
    <p id="no-suggestions" class="muted">Nothing to check. A draft appears here when ${OUTBREAK_MIN_FARMS} farms in one area report the same disease within 7 days.</p>
    <div id="suggested" class="stack"></div>
  </section>
  <section class="card" aria-labelledby="areas-heading">
    <h2 id="areas-heading">Farmers signed up</h2>
    <p class="muted">Farmers join by texting ALERTS and their area, for example ALERTS Karima.</p>
    <table><thead><tr><th scope="col">Area</th><th scope="col" class="figure">Farmers</th></tr></thead><tbody id="areas"></tbody></table>
  </section>
  <section class="stack" id="sent-section" aria-labelledby="sent-heading" hidden>
    <h2 id="sent-heading">Recently sent</h2>
    <div id="sent" class="stack"></div>
  </section>
</div>
</main><script>${SCRIPT}</script></body></html>`;
