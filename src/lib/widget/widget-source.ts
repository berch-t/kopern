/**
 * Returns the self-contained JavaScript source for the embeddable chat widget.
 * This script is served from /api/widget/script and creates a Shadow DOM chat bubble.
 */
export function getWidgetScript(): string {
  return `(function() {
  "use strict";

  // Prevent double-initialization
  if (window.__kopernWidgetLoaded) return;
  window.__kopernWidgetLoaded = true;

  // Read config from script tag attributes
  var scriptTag = document.currentScript;
  var API_KEY = scriptTag ? scriptTag.getAttribute("data-key") : null;
  if (!API_KEY) {
    console.error("[Kopern Widget] Missing data-key attribute on script tag.");
    return;
  }

  var API_HOST = scriptTag.getAttribute("data-host") || "";
  if (!API_HOST) {
    try {
      var src = scriptTag.getAttribute("src") || "";
      var url = new URL(src, window.location.href);
      API_HOST = url.origin;
    } catch(e) {
      API_HOST = "https://kopern.vercel.app";
    }
  }

  // ---- Styles (injected into Shadow DOM) ----
  var CSS = \`
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .kopern-bubble {
      position: fixed;
      bottom: 20px;
      z-index: 2147483647;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #7c3aed;
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .kopern-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(124, 58, 237, 0.5);
    }
    .kopern-bubble.right { right: 20px; }
    .kopern-bubble.left { left: 20px; }
    .kopern-bubble svg { width: 24px; height: 24px; fill: currentColor; }

    .kopern-panel {
      position: fixed;
      bottom: 88px;
      z-index: 2147483647;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 108px);
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    .kopern-panel.open { display: flex; }
    .kopern-panel.right { right: 20px; }
    .kopern-panel.left { left: 20px; }

    @media (max-width: 640px) {
      .kopern-panel {
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        bottom: 0;
        right: 0;
        left: 0;
        border-radius: 0;
      }
    }

    .kopern-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      background: #7c3aed;
      color: #fff;
      flex-shrink: 0;
    }
    .kopern-header-title {
      font-weight: 600;
      font-size: 15px;
    }
    .kopern-close-btn {
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .kopern-close-btn:hover { background: rgba(255,255,255,0.15); }
    .kopern-close-btn svg { width: 18px; height: 18px; }

    .kopern-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .kopern-messages::-webkit-scrollbar { width: 4px; }
    .kopern-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }

    .kopern-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .kopern-msg.user {
      align-self: flex-end;
      background: #7c3aed;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .kopern-msg.assistant {
      align-self: flex-start;
      background: #f3f4f6;
      color: #1f2937;
      border-bottom-left-radius: 4px;
    }
    .kopern-msg.welcome {
      align-self: center;
      background: transparent;
      color: #6b7280;
      text-align: center;
      font-size: 13px;
      padding: 8px 0;
    }

    .kopern-msg a { color: #7c3aed; text-decoration: underline; }
    .kopern-msg code {
      background: rgba(0,0,0,0.06);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 13px;
      font-family: "SF Mono", Monaco, Consolas, monospace;
    }
    .kopern-msg pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 10px 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 6px 0;
      font-size: 12px;
    }
    .kopern-msg pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    .kopern-msg ul, .kopern-msg ol {
      padding-left: 18px;
      margin: 4px 0;
    }
    .kopern-msg h1, .kopern-msg h2, .kopern-msg h3, .kopern-msg h4 {
      margin: 8px 0 4px 0;
      font-weight: 600;
      line-height: 1.3;
    }
    .kopern-msg h1 { font-size: 1.25em; }
    .kopern-msg h2 { font-size: 1.15em; }
    .kopern-msg h3 { font-size: 1.05em; }
    .kopern-msg h4 { font-size: 1em; }
    .kopern-msg h1:first-child, .kopern-msg h2:first-child,
    .kopern-msg h3:first-child, .kopern-msg h4:first-child { margin-top: 0; }
    .kopern-msg strong { font-weight: 600; }
    .kopern-msg em { font-style: italic; }
    .kopern-msg hr { border: none; border-top: 1px solid #d1d5db; margin: 8px 0; }

    .kopern-working {
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      color: #6b7280;
      font-size: 13px;
    }
    .kopern-working-dots span {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #9ca3af;
      animation: kopernBounce 1.2s infinite;
    }
    .kopern-working-dots span:nth-child(2) { animation-delay: 0.15s; }
    .kopern-working-dots span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes kopernBounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    .kopern-input-area {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      gap: 8px;
      flex-shrink: 0;
    }
    .kopern-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
      resize: none;
      min-height: 38px;
      max-height: 100px;
    }
    .kopern-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 2px rgba(124,58,237,0.15); }
    .kopern-send-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: #7c3aed;
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .kopern-send-btn:hover { background: #6d28d9; }
    .kopern-send-btn:disabled { background: #c4b5fd; cursor: not-allowed; }
    .kopern-send-btn svg { width: 18px; height: 18px; }

    .kopern-footer {
      padding: 6px 12px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
      flex-shrink: 0;
    }
    .kopern-footer a {
      color: #7c3aed;
      text-decoration: none;
      font-weight: 500;
    }
    .kopern-footer a:hover { text-decoration: underline; }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .kopern-panel { background: #1f2937; }
      .kopern-msg.assistant { background: #374151; color: #f3f4f6; }
      .kopern-msg.welcome { color: #9ca3af; }
      .kopern-msg code { background: rgba(255,255,255,0.1); }
      .kopern-input { background: #374151; border-color: #4b5563; color: #f3f4f6; }
      .kopern-input:focus { border-color: #7c3aed; }
      .kopern-input-area { border-top-color: #374151; }
      .kopern-footer { border-top-color: #374151; color: #6b7280; }
      .kopern-messages::-webkit-scrollbar-thumb { background: #4b5563; }
      .kopern-msg hr { border-top-color: #4b5563; }
    }
  \`;

  // ---- SVG Icons ----
  var CHAT_ICON = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  // ---- Create Shadow DOM host ----
  var host = document.createElement("div");
  host.id = "kopern-widget-host";
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: "closed" });

  var style = document.createElement("style");
  style.textContent = CSS;
  shadow.appendChild(style);

  // ---- State ----
  var config = { welcomeMessage: "", position: "bottom-right", showPoweredBy: true, agentName: "AI Assistant" };
  var history = [];
  var isOpen = false;
  var isLoading = false;

  // ---- Build DOM ----
  var bubble = document.createElement("button");
  bubble.className = "kopern-bubble right";
  bubble.innerHTML = CHAT_ICON;
  bubble.setAttribute("aria-label", "Open chat");
  shadow.appendChild(bubble);

  var panel = document.createElement("div");
  panel.className = "kopern-panel right";
  panel.innerHTML = [
    '<div class="kopern-header">',
    '  <span class="kopern-header-title"></span>',
    '  <button class="kopern-close-btn" aria-label="Close">' + CLOSE_ICON + '</button>',
    '</div>',
    '<div class="kopern-messages"></div>',
    '<div class="kopern-input-area">',
    '  <textarea class="kopern-input" rows="1" placeholder="Type a message..."></textarea>',
    '  <button class="kopern-send-btn" aria-label="Send">' + SEND_ICON + '</button>',
    '</div>',
    '<div class="kopern-footer" style="display:none">Powered by <a href="https://kopern.vercel.app" target="_blank" rel="noopener">Kopern</a></div>',
  ].join("");
  shadow.appendChild(panel);

  var headerTitle = panel.querySelector(".kopern-header-title");
  var closeBtn = panel.querySelector(".kopern-close-btn");
  var messagesEl = panel.querySelector(".kopern-messages");
  var inputEl = panel.querySelector(".kopern-input");
  var sendBtn = panel.querySelector(".kopern-send-btn");
  var footerEl = panel.querySelector(".kopern-footer");

  // ---- Helpers ----
  function setPosition(pos) {
    var isRight = pos !== "bottom-left";
    bubble.className = "kopern-bubble " + (isRight ? "right" : "left");
    panel.className = panel.className.replace(/ (right|left)/g, "") + (isRight ? " right" : " left");
  }

  function renderMarkdown(text) {
    // Basic markdown: code blocks, inline code, bold, italic, links, lists
    var html = text
      // Code blocks
      .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, function(_, code) {
        return "<pre><code>" + escapeHtml(code.trim()) + "</code></pre>";
      })
      // Inline code
      .replace(/\`([^\`]+)\`/g, "<code>$1</code>")
      // Headers (h1-h4)
      .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // Horizontal rule (---, ***, ___ with optional trailing spaces)
      .replace(/^[ \\t]*[-*_]{3,}[ \\t]*$/gm, "<hr>")
      // Bold
      .replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\\*(.+?)\\*/g, "<em>$1</em>")
      // Links
      .replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Unordered list items
      .replace(/^[\\-\\*] (.+)$/gm, "<li>$1</li>")
      // Ordered list items
      .replace(/^\\d+\\. (.+)$/gm, "<li>$1</li>")
      // Wrap consecutive li in ul
      .replace(/(<li>.*<\\/li>\\n?)+/g, "<ul>$&</ul>")
      // Line breaks (but not after block elements)
      .replace(/\\n/g, "<br>");
    // Clean up <br> after block elements
    html = html
      .replace(/<\\/(h[1-4]|pre|ul|ol|li|hr)><br>/g, "</$1>")
      .replace(/<br><(h[1-4]|pre|ul|ol|hr)/g, "<$1");
    return html;
  }

  function escapeHtml(text) {
    var d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function addMessage(role, content) {
    var div = document.createElement("div");
    div.className = "kopern-msg " + role;
    if (role === "assistant") {
      div.innerHTML = renderMarkdown(content);
    } else {
      div.textContent = content;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showWorking() {
    var div = document.createElement("div");
    div.className = "kopern-working";
    div.setAttribute("data-working", "true");
    div.innerHTML = '<div class="kopern-working-dots"><span></span><span></span><span></span></div> Working...';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function removeWorking() {
    var els = messagesEl.querySelectorAll("[data-working]");
    els.forEach(function(el) { el.remove(); });
  }

  function setLoading(v) {
    isLoading = v;
    sendBtn.disabled = v;
    inputEl.disabled = v;
  }

  // ---- SSE Chat ----
  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;

    inputEl.value = "";
    inputEl.style.height = "auto";
    addMessage("user", text);
    history.push({ role: "user", content: text });
    setLoading(true);

    var workingEl = showWorking();
    var assistantText = "";
    var assistantDiv = null;

    // Use fetch + ReadableStream for SSE (works cross-origin)
    fetch(API_HOST + "/api/widget/chat?key=" + encodeURIComponent(API_KEY), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: history.slice(0, -1), // exclude the message we just added
      }),
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Request failed: " + response.status);
      }
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";

      function processChunk() {
        return reader.read().then(function(result) {
          if (result.done) {
            finalize();
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split("\\n");
          buffer = lines.pop() || "";

          var currentEvent = "";
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf("event: ") === 0) {
              currentEvent = line.slice(7).trim();
            } else if (line.indexOf("data: ") === 0) {
              try {
                var data = JSON.parse(line.slice(6));
                handleEvent(currentEvent, data);
              } catch(e) { /* skip */ }
              currentEvent = "";
            }
          }

          return processChunk();
        });
      }

      function handleEvent(event, data) {
        switch(event) {
          case "token":
            removeWorking();
            if (!assistantDiv) {
              assistantDiv = addMessage("assistant", "");
            }
            assistantText += data.text;
            assistantDiv.innerHTML = renderMarkdown(assistantText);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            break;
          case "tool_start":
            if (workingEl && workingEl.parentNode) {
              workingEl.querySelector(".kopern-working-dots").nextSibling.textContent = " Using " + (data.name || "tool") + "...";
            }
            break;
          case "tool_end":
            break;
          case "error":
            removeWorking();
            console.error("[Kopern Widget] Error:", data.message);
            addMessage("assistant", data.message || "Sorry, an error occurred. Please try again.");
            setLoading(false);
            break;
          case "done":
            finalize();
            break;
        }
      }

      function finalize() {
        removeWorking();
        if (assistantText) {
          history.push({ role: "assistant", content: assistantText });
        }
        setLoading(false);
        inputEl.focus();
      }

      return processChunk();
    })
    .catch(function(err) {
      console.error("[Kopern Widget] Error:", err);
      removeWorking();
      addMessage("assistant", "Sorry, something went wrong. Please try again later.");
      setLoading(false);
    });
  }

  // ---- Event Listeners ----
  bubble.addEventListener("click", function() {
    isOpen = !isOpen;
    panel.classList.toggle("open", isOpen);
    bubble.innerHTML = isOpen ? CLOSE_ICON : CHAT_ICON;
    if (isOpen) {
      inputEl.focus();
    }
  });

  closeBtn.addEventListener("click", function() {
    isOpen = false;
    panel.classList.remove("open");
    bubble.innerHTML = CHAT_ICON;
  });

  sendBtn.addEventListener("click", sendMessage);

  inputEl.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener("input", function() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + "px";
  });

  // ---- Load Config ----
  fetch(API_HOST + "/api/widget/config?key=" + encodeURIComponent(API_KEY))
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.error) {
        console.error("[Kopern Widget]", data.error);
        return;
      }
      config = data;
      headerTitle.textContent = config.agentName || "AI Assistant";
      setPosition(config.position);

      if (config.welcomeMessage) {
        var welcomeDiv = document.createElement("div");
        welcomeDiv.className = "kopern-msg welcome";
        welcomeDiv.textContent = config.welcomeMessage;
        messagesEl.appendChild(welcomeDiv);
      }

      if (config.showPoweredBy) {
        footerEl.style.display = "block";
      }
    })
    .catch(function(err) {
      console.error("[Kopern Widget] Failed to load config:", err);
    });

})();`;
}
