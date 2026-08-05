const markdownFormats = [
    { format: "bold", label: "B", title: "Bold", before: "**", after: "**" },
    { format: "italic", label: "I", title: "Italic", before: "*", after: "*" },
    { format: "underline", label: "U", title: "Underline", before: "__", after: "__" },
    { format: "strike", label: "S", title: "Strikethrough", before: "~~", after: "~~" },
    { format: "code", label: "</>", title: "Inline code", before: "`", after: "`" },
    { format: "bullet", label: "•≡", title: "Bulleted list", blockPrefix: "- " },
    { format: "quote", label: "❞", title: "Quote", blockPrefix: "> " },
];

document.querySelectorAll(".markdown-toolbar").forEach(toolbar => {
    toolbar.replaceChildren();
    toolbar.classList.add("markdown-toolbar-ready");
    toolbar.style.setProperty("display", "flex", "important");
    toolbar.style.setProperty("flex-wrap", "wrap", "important");
    toolbar.style.setProperty("gap", "8px", "important");
    markdownFormats.forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "markdown-tool-button";
        button.dataset.markdownFormat = item.format;
        button.title = item.title;
        button.setAttribute("aria-label", item.title);
        button.textContent = item.label;
        button.style.cssText = "display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 30px!important;width:30px!important;min-width:30px!important;max-width:30px!important;height:30px!important;margin:0!important;padding:0!important;border:1px solid #3b4663!important;border-radius:6px!important;background:#171d2a!important;color:#c5cce0!important;line-height:1!important";
        toolbar.appendChild(button);
    });
    toolbar.addEventListener("mousedown", event => event.preventDefault());
    toolbar.addEventListener("click", event => {
        const button = event.target.closest("[data-markdown-format]");
        if (!button) return;
        applyMarkdown(byId(toolbar.dataset.markdownTarget), markdownFormats.find(item => item.format === button.dataset.markdownFormat));
    });
});

function transformBlock(value, prefix) {
    const lines = (value || "").split("\n");
    return lines.map(line => prefix + line.replace(/^\s*(?:[-*]>?|>)\s+/, "")).join("\n");
}

function applyTextareaMarkdown(input, format) {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const selected = input.value.slice(start, end);
    if (!format.blockPrefix && start === end) {
        input.focus();
        return;
    }
    const replacement = format.blockPrefix
        ? transformBlock(selected, format.blockPrefix)
        : format.before + selected + format.after;
    const nextValue = input.value.slice(0, start) + replacement + input.value.slice(end);
    if (input.maxLength > -1 && nextValue.length > input.maxLength) return;
    input.value = nextValue;
    const emptyBlock = Boolean(format.blockPrefix && start === end);
    const selectionStart = format.blockPrefix ? start + (emptyBlock ? replacement.length : 0) : start + format.before.length;
    const selectionEnd = format.blockPrefix && !emptyBlock ? start + replacement.length : selectionStart + selected.length;
    input.setSelectionRange(selectionStart, selectionEnd);
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyContentEditableMarkdown(editor, format) {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        editor.focus();
        return;
    }
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
        editor.focus();
        return;
    }
    if (!format.blockPrefix && range.collapsed) {
        editor.focus();
        return;
    }
    if (format.blockPrefix) {
        const wasCollapsed = range.collapsed;
        const replacement = transformBlock(range.toString(), format.blockPrefix);
        range.deleteContents();
        const node = document.createTextNode(replacement);
        range.insertNode(node);
        if (wasCollapsed) {
            range.setStartAfter(node);
            range.collapse(true);
        } else {
            range.selectNodeContents(node);
        }
    } else {
        const end = range.cloneRange();
        end.collapse(false);
        end.insertNode(document.createTextNode(format.after));
        const start = range.cloneRange();
        start.collapse(true);
        start.insertNode(document.createTextNode(format.before));
    }
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
    syncMessageEditor();
    updateCounters();
    preview();
}

function applyMarkdown(target, format) {
    if (!target || !format) return;
    if (target.matches("textarea, input")) applyTextareaMarkdown(target, format);
    else applyContentEditableMarkdown(target, format);
}

function keyboardFormat(event, target) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const format = event.key.toLocaleLowerCase() === "b"
        ? markdownFormats[0]
        : event.key.toLocaleLowerCase() === "i"
            ? markdownFormats[1]
            : event.key.toLocaleLowerCase() === "u"
                ? markdownFormats[2]
                : null;
    if (!format) return;
    event.preventDefault();
    applyMarkdown(target, format);
}

byId("messageEditor").addEventListener("keydown", event => keyboardFormat(event, byId("messageEditor")));
byId("description").addEventListener("keydown", event => keyboardFormat(event, byId("description")));
