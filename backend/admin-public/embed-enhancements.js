let embedMentionInput = null;
let embedMentionContext = null;
let embedMentionIndex = 0;

const embedMentionAliases = new Map();
const embedMentionFieldIds = ["authorName", "embedTitle", "description", "footer"];

function mentionLabel(type, id) {
    const candidate = mentionCandidates().find(item => item.type === type && item.id === id);
    return candidate?.label || id;
}

function hydrateEmbedMentionFields() {
    const expression = /<@(!?)(\d{17,20})>|<@&(\d{17,20})>/g;
    for (const id of embedMentionFieldIds) {
        const input = byId(id);
        const aliases = [];
        input.value = input.value.replace(expression, (token, nickname, userId, roleId) => {
            const type = roleId ? "role" : "user";
            const mentionId = roleId || userId;
            const visible = "@" + mentionLabel(type, mentionId);
            aliases.push({ visible, token });
            return visible;
        });
        embedMentionAliases.set(id, aliases);
    }
}

embedTextValue = function serializedEmbedTextValue(id) {
    let value = byId(id).value;
    const aliases = embedMentionAliases.get(id) || [];
    for (const alias of aliases) {
        const index = value.indexOf(alias.visible);
        if (index >= 0) value = value.slice(0, index) + alias.token + value.slice(index + alias.visible.length);
    }
    return value.trim();
};
function plainOutgoingTextHtml(value) {
    let html = escapeHtml(value || "");
    html = html.replace(/&lt;@&amp;(\d{17,20})&gt;|&lt;@!?(\d{17,20})&gt;/g, (token, roleId, userId) => {
        const type = roleId ? "role" : "user";
        const id = roleId || userId;
        const candidate = mentionCandidates().find(item => item.type === type && item.id === id);
        return `<span class="preview-mention">@${escapeHtml(candidate?.label || id)}</span>`;
    });
    return html.replace(/\n/g, "<br>");
}

function outgoingTextHtml(value) {
    let html = plainOutgoingTextHtml(value).replace(/<br>/g, "\n");
    html = html.replace(/`([^`\n]+)`/g, '<code class="preview-inline-code">$1</code>');
    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__([^_\n]+)__/g, "<u>$1</u>");
    html = html.replace(/~~([^~\n]+)~~/g, "<s>$1</s>");
    html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    return html.split("\n").map(line => {
        const bullet = line.match(/^\s*[-*]\s+(.+)$/);
        if (bullet) return `<div class="preview-list-item"><span>•</span><div>${bullet[1]}</div></div>`;
        const quote = line.match(/^\s*>\s?(.*)$/);
        if (quote) return `<div class="preview-quote">${quote[1] || "<br>"}</div>`;
        return `<div class="preview-line">${line || "<br>"}</div>`;
    }).join("");
}

preview = function renderDiscordPreview() {
    const embed = embedData();
    const messageText = byId("content").value.trim();
    const messagePreview = byId("previewMessageText");
    messagePreview.hidden = messageType() === "embed" || !messageText;
    messagePreview.innerHTML = outgoingTextHtml(messageText);
    const embedPreview = byId("preview");
    embedPreview.hidden = !embed;
    if (!embed) return;

    embedPreview.style.borderColor = byId("colorHex").value;
    const authorIcon = embed.authorIconUrl ? `<img class="preview-author-icon" src="${escapeHtml(embed.authorIconUrl)}" alt="">` : "";
    const authorLabel = plainOutgoingTextHtml(embed.authorName);
    const authorContent = embed.authorUrl ? `<a href="${escapeHtml(embed.authorUrl)}" target="_blank" rel="noopener noreferrer">${authorLabel}</a>` : authorLabel;
    const author = embed.authorName ? `<div class="preview-author">${authorIcon}${authorContent}</div>` : "";
    const thumbnail = embed.thumbnailUrl ? `<img class="preview-thumbnail" src="${escapeHtml(embed.thumbnailUrl)}" alt="Embed thumbnail">` : "";
    const image = embed.imageUrl ? `<img class="preview-image" src="${escapeHtml(embed.imageUrl)}" alt="Embed image">` : "";
    const footerIcon = embed.footerIconUrl ? `<img class="preview-footer-icon" src="${escapeHtml(embed.footerIconUrl)}" alt="">` : "";
    const footer = embed.footer ? `<div class="preview-footer">${footerIcon}${plainOutgoingTextHtml(embed.footer)}</div>` : "";
    byId("preview").innerHTML =
        `<div class="preview-main"><div class="preview-copy">${author}<div class="preview-title">${plainOutgoingTextHtml(embed.title || "Embed title")}</div><div class="preview-description">${outgoingTextHtml(embed.description || "Your embed description will appear here.")}</div></div>${thumbnail}</div>${image}${footer}`;
    embedPreview.querySelectorAll("img").forEach(img => {
        const hideBrokenImage = () => { img.hidden = true; };
        img.addEventListener("error", hideBrokenImage, { once: true });
        if (img.complete && img.naturalWidth === 0) hideBrokenImage();
    });
};

function findEmbedMentionContext(input) {
    const cursor = input.selectionStart;
    if (cursor === null || input.selectionEnd !== cursor) return null;
    const before = input.value.slice(0, cursor);
    const match = before.match(/@([^@\n]{0,50})$/u);
    if (!match) return null;
    return {
        start: cursor - match[0].length,
        end: cursor,
        query: match[1].trim().toLocaleLowerCase(),
    };
}

function embedMentionMatches() {
    if (!embedMentionContext || !currentGuild()) return [];
    return mentionCandidates()
        .filter(item => item.label.toLocaleLowerCase().includes(embedMentionContext.query))
        .slice(0, 10);
}

function embedCaretPosition(input) {
    const rect = input.getBoundingClientRect();
    const style = getComputedStyle(input);
    const mirror = document.createElement("div");
    const properties = [
        "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight",
        "textTransform", "wordSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
        "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
        "textIndent", "tabSize", "direction",
    ];
    mirror.style.position = "fixed";
    mirror.style.visibility = "hidden";
    mirror.style.pointerEvents = "none";
    mirror.style.left = rect.left + "px";
    mirror.style.top = rect.top + "px";
    mirror.style.width = rect.width + "px";
    mirror.style.boxSizing = style.boxSizing;
    mirror.style.whiteSpace = input.tagName === "TEXTAREA" ? "pre-wrap" : "pre";
    mirror.style.overflowWrap = input.tagName === "TEXTAREA" ? "break-word" : "normal";
    properties.forEach(property => { mirror.style[property] = style[property]; });
    mirror.textContent = input.value.slice(0, input.selectionStart ?? input.value.length);
    const marker = document.createElement("span");
    marker.textContent = "\u200b";
    mirror.appendChild(marker);
    document.body.appendChild(mirror);
    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
    const markerRect = marker.getBoundingClientRect();
    const position = {
        left: markerRect.left - input.scrollLeft,
        top: markerRect.top - input.scrollTop + lineHeight,
    };
    mirror.remove();
    return position;
}

function positionEmbedMentionResults() {
    if (!embedMentionInput) return;
    const results = byId("embedMentionResults");
    const rect = embedMentionInput.getBoundingClientRect();
    const caret = embedCaretPosition(embedMentionInput);
    positionMentionPopup(results, { left: caret.left, bottom: caret.top }, rect.width);
}

function renderEmbedMentionResults(input) {
    embedMentionInput = input;
    embedMentionContext = findEmbedMentionContext(input);
    const results = byId("embedMentionResults");
    if (!embedMentionContext) {
        results.hidden = true;
        return;
    }
    const matches = embedMentionMatches();
    embedMentionIndex = Math.min(embedMentionIndex, Math.max(matches.length - 1, 0));
    results.innerHTML = matches.length
        ? matches.map((item, index) =>
            `<button type="button" class="${index === embedMentionIndex ? "active" : ""}" data-embed-mention-index="${index}"><span class="mention-icon">${item.type === "role" ? "@" : "●"}</span><span><strong>${escapeHtml(item.label)}</strong><small>${item.type}</small></span></button>`,
        ).join("")
        : "<p>No matching members or roles.</p>";
    results.hidden = false;
    positionEmbedMentionResults();
}

function insertEmbedMention(index = embedMentionIndex) {
    const item = embedMentionMatches()[index];
    if (!item || !embedMentionInput || !embedMentionContext) return;
    const token = item.type === "role" ? `<@&${item.id}>` : `<@${item.id}>`;
    const visible = "@" + item.label;
    const input = embedMentionInput;
    const nextValue = input.value.slice(0, embedMentionContext.start) + visible + " " + input.value.slice(embedMentionContext.end);
    if (input.maxLength > -1 && nextValue.length > input.maxLength) return;
    const aliases = embedMentionAliases.get(input.id) || [];
    aliases.push({ visible, token });
    embedMentionAliases.set(input.id, aliases);
    input.value = nextValue;
    const cursor = embedMentionContext.start + visible.length + 1;
    input.setSelectionRange(cursor, cursor);
    input.focus();
    byId("embedMentionResults").hidden = true;
    embedMentionContext = null;
    input.dispatchEvent(new Event("input", { bubbles: true }));
}

document.querySelectorAll("[data-mention-input]").forEach(input => {
    input.addEventListener("input", () => {
        embedMentionIndex = 0;
        renderEmbedMentionResults(input);
    });
    input.addEventListener("click", () => renderEmbedMentionResults(input));
    input.addEventListener("keydown", event => {
        const results = byId("embedMentionResults");
        if (results.hidden) return;
        const count = embedMentionMatches().length;
        if (event.key === "ArrowDown" && count) {
            event.preventDefault();
            embedMentionIndex = (embedMentionIndex + 1) % count;
            renderEmbedMentionResults(input);
        } else if (event.key === "ArrowUp" && count) {
            event.preventDefault();
            embedMentionIndex = (embedMentionIndex - 1 + count) % count;
            renderEmbedMentionResults(input);
        } else if ((event.key === "Enter" || event.key === "Tab") && count) {
            event.preventDefault();
            insertEmbedMention();
        } else if (event.key === "Escape") {
            results.hidden = true;
            embedMentionContext = null;
        }
    });
});

byId("embedMentionResults").addEventListener("mousedown", event => {
    const button = event.target.closest("[data-embed-mention-index]");
    if (!button) return;
    event.preventDefault();
    insertEmbedMention(Number(button.dataset.embedMentionIndex));
});
document.addEventListener("mousedown", event => {
    if (!event.target.closest("[data-mention-input]") && !event.target.closest("#embedMentionResults")) {
        byId("embedMentionResults").hidden = true;
    }
});
window.addEventListener("resize", positionEmbedMentionResults);
window.addEventListener("scroll", positionEmbedMentionResults, true);
preview();
