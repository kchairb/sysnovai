(function () {
  if (window.SysnovaWidgetMounted) return;
  window.SysnovaWidgetMounted = true;

  var cfg = window.SysnovaWidgetConfig || {};
  var scriptTag = document.currentScript;
  var scriptSrc = scriptTag && scriptTag.src ? scriptTag.src : "";
  var basePath = scriptSrc ? scriptSrc.split("/").slice(0, -1).join("/") : "";

  var config = {
    apiUrl: cfg.apiUrl || "http://localhost:3000/api/public/chat",
    streamUrl: cfg.streamUrl || "http://localhost:3000/api/public/chat/stream",
    domain: cfg.domain || window.location.hostname,
    language: cfg.language || "fr",
    title: cfg.title || "Chat with us",
    assistantLabel: cfg.assistantLabel || "Assistant",
    welcomeMessage:
      cfg.welcomeMessage ||
      "Welcome to Sysnova AI support. Ask about products, delivery, payment, or returns.",
    placeholder: cfg.placeholder || "Type your message...",
    buttonText: cfg.buttonText || "Send",
    toggleText: cfg.toggleText || "Ask us",
    position: cfg.position === "left" ? "left" : "right",
    zIndex: Number(cfg.zIndex || 999999),
    primaryColor: cfg.primaryColor || "#22c7d6",
    autoOpen: Boolean(cfg.autoOpen),
    streaming: cfg.streaming !== false,
    assistantMode: cfg.assistantMode || "support",
    brandContext: cfg.brandContext || "",
    enableLeadCapture: Boolean(cfg.enableLeadCapture),
    leadRequired: Boolean(cfg.leadRequired),
    leadTitle: cfg.leadTitle || "Before we start",
    leadNameLabel: cfg.leadNameLabel || "Name",
    leadPhoneLabel: cfg.leadPhoneLabel || "Phone",
    leadSubmitText: cfg.leadSubmitText || "Save",
    leadSkipText: cfg.leadSkipText || "Skip"
  };

  function ensureCss() {
    if (document.getElementById("sysnova-widget-css")) return;
    var link = document.createElement("link");
    link.id = "sysnova-widget-css";
    link.rel = "stylesheet";
    link.href = cfg.cssUrl || (basePath ? basePath + "/widget.css" : "/widget.css");
    document.head.appendChild(link);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function appendBubble(container, role, message, typing) {
    var bubble = el(
      "div",
      "sysnova-widget-bubble " + (role === "user" ? "sysnova-widget-user" : "sysnova-widget-assistant")
    );
    var body = el("div", typing ? "sysnova-widget-typing" : "", message || "");
    bubble.appendChild(body);

    if (role !== "user") {
      var meta = el("div", "sysnova-widget-meta", config.assistantLabel);
      bubble.appendChild(meta);
    }

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return {
      bubble: bubble,
      body: body
    };
  }

  function mount() {
    ensureCss();

    var root = el(
      "div",
      "sysnova-widget-root " + (config.position === "left" ? "sysnova-pos-left" : "sysnova-pos-right")
    );
    root.style.zIndex = String(config.zIndex);
    root.style.setProperty("--sysnova-accent", config.primaryColor);

    var panel = el("section", "sysnova-widget-panel");
    var header = el("div", "sysnova-widget-header");
    var title = el("div", "sysnova-widget-title", config.title);
    var closeBtn = el("button", "sysnova-widget-close", "Close");
    closeBtn.type = "button";
    header.appendChild(title);
    header.appendChild(closeBtn);

    var messages = el("div", "sysnova-widget-messages");
    appendBubble(messages, "assistant", config.welcomeMessage);

    var inputWrap = el("div", "sysnova-widget-input-wrap");
    var leadWrap = el("div", "sysnova-widget-lead");
    var leadTitle = el("div", "sysnova-widget-lead-title", config.leadTitle);
    var leadName = el("input", "sysnova-widget-lead-input");
    var leadPhone = el("input", "sysnova-widget-lead-input");
    leadName.placeholder = config.leadNameLabel;
    leadPhone.placeholder = config.leadPhoneLabel;
    var leadActions = el("div", "sysnova-widget-lead-actions");
    var leadSave = el("button", "sysnova-widget-lead-btn", config.leadSubmitText);
    var leadSkip = el("button", "sysnova-widget-lead-btn sysnova-widget-lead-skip", config.leadSkipText);
    leadSave.type = "button";
    leadSkip.type = "button";
    leadActions.appendChild(leadSave);
    if (!config.leadRequired) {
      leadActions.appendChild(leadSkip);
    }
    leadWrap.appendChild(leadTitle);
    leadWrap.appendChild(leadName);
    leadWrap.appendChild(leadPhone);
    leadWrap.appendChild(leadActions);

    var textarea = el("textarea", "sysnova-widget-input");
    textarea.placeholder = config.placeholder;

    var actions = el("div", "sysnova-widget-actions");
    var sendBtn = el("button", "sysnova-widget-send", config.buttonText);
    sendBtn.type = "button";
    actions.appendChild(sendBtn);

    if (config.enableLeadCapture) {
      inputWrap.appendChild(leadWrap);
    }
    inputWrap.appendChild(textarea);
    inputWrap.appendChild(actions);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputWrap);

    var toggle = el("button", "sysnova-widget-toggle", config.toggleText);
    toggle.type = "button";

    root.appendChild(panel);
    root.appendChild(toggle);
    document.body.appendChild(root);

    var leadData = null;
    var leadCaptured = !config.enableLeadCapture;

    function hideLead() {
      if (leadWrap.parentNode) {
        leadWrap.parentNode.removeChild(leadWrap);
      }
    }

    function captureLeadIfReady() {
      var name = leadName.value.trim();
      var phone = leadPhone.value.trim();
      if (config.leadRequired && (!name || !phone)) {
        appendBubble(messages, "assistant", "Please provide your name and phone to continue.");
        return false;
      }
      leadData = {
        name: name || undefined,
        phone: phone || undefined
      };
      leadCaptured = true;
      hideLead();
      return true;
    }

    leadSave.addEventListener("click", function () {
      captureLeadIfReady();
    });
    leadSkip.addEventListener("click", function () {
      if (config.leadRequired) return;
      leadCaptured = true;
      hideLead();
    });

    function setOpen(open) {
      if (open) root.classList.add("sysnova-open");
      else root.classList.remove("sysnova-open");
    }

    function setSendingState(sending) {
      sendBtn.disabled = sending;
      sendBtn.textContent = sending ? "Sending..." : config.buttonText;
    }

    async function sendWithStream(prompt, assistantBubbleRef) {
      var response = await fetch(config.streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: config.domain,
          language: config.language,
          assistantMode: config.assistantMode,
          brandContext: config.brandContext,
          prompt: prompt,
          lead: leadData || undefined
        })
      });

      if (!response.ok || !response.body) {
        var failedPayload = {};
        try {
          failedPayload = await response.json();
        } catch (err) {}
        assistantBubbleRef.body.className = "";
        assistantBubbleRef.body.textContent = failedPayload.error || "Request failed.";
        return;
      }

      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var output = "";

      assistantBubbleRef.body.className = "";
      assistantBubbleRef.body.textContent = "";

      while (true) {
        var next = await reader.read();
        if (next.done) break;
        buffer += decoder.decode(next.value, { stream: true });
        var events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (var i = 0; i < events.length; i += 1) {
          var line = events[i]
            .split("\n")
            .find(function (candidate) {
              return candidate.indexOf("data: ") === 0;
            });
          if (!line) continue;
          var payload;
          try {
            payload = JSON.parse(line.slice(6));
          } catch (err) {
            continue;
          }
          if (payload.delta) {
            output += payload.delta;
            assistantBubbleRef.body.textContent = output;
            messages.scrollTop = messages.scrollHeight;
          }
        }
      }

      if (!output) {
        assistantBubbleRef.body.textContent = "No reply.";
      }
    }

    async function sendWithoutStream(prompt, assistantBubbleRef) {
      var response = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: config.domain,
          language: config.language,
          assistantMode: config.assistantMode,
          brandContext: config.brandContext,
          prompt: prompt,
          lead: leadData || undefined
        })
      });
      var payload = await response.json();
      assistantBubbleRef.body.className = "";
      assistantBubbleRef.body.textContent = response.ok
        ? payload.reply || "No reply."
        : payload.error || "Request failed.";
    }

    async function sendMessage() {
      var prompt = textarea.value.trim();
      if (!prompt || sendBtn.disabled) return;

      if (config.enableLeadCapture && !leadCaptured) {
        if (!captureLeadIfReady()) return;
      }

      appendBubble(messages, "user", prompt);
      textarea.value = "";
      setSendingState(true);

      var assistantBubbleRef = appendBubble(messages, "assistant", "Typing...", true);

      try {
        if (config.streaming) {
          await sendWithStream(prompt, assistantBubbleRef);
        } else {
          await sendWithoutStream(prompt, assistantBubbleRef);
        }
      } catch (err) {
        assistantBubbleRef.body.className = "";
        assistantBubbleRef.body.textContent = "Connection error. Please try again.";
      } finally {
        setSendingState(false);
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(!root.classList.contains("sysnova-open"));
    });
    closeBtn.addEventListener("click", function () {
      setOpen(false);
    });

    sendBtn.addEventListener("click", function () {
      sendMessage();
    });
    textarea.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });

    if (config.autoOpen) setOpen(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
