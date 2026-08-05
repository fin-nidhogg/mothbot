let templates = [];
let templateStatus = "active";
let editingTemplateVersion = null;
let templateSearchTimer;

function templateFormData() {
    return {
        name: byId("templateName").value.trim(),
        description: byId("templateDescription").value.trim(),
        guildId: byId("guildId").value,
        defaultChannelId: byId("channelId").value || undefined,
        content: composedContent(),
        embed: embedData(),
        version: editingTemplateVersion,
    };
}

function templateGuildLabel(template) {
    const guild = guilds.find(item => item.id === template.guildId);
    const channel = guild?.channels.find(item => item.id === template.defaultChannelId);
    if (!guild) return template.guildId;
    return channel ? `${guild.name} · #${channel.name}` : `${guild.name} · channel selected when scheduling`;
}

function templateType(template) {
    return template.content && template.embed ? "Text + embed" : template.embed ? "Embed" : "Text";
}

async function loadTemplates() {
    try {
        const params = new URLSearchParams({ limit: "100" });
        if (templateStatus) params.set("status", templateStatus);
        const search = byId("templateSearch").value.trim();
        if (search) params.set("search", search);
        const result = await request(templateApi + "?" + params);
        templates = result.templates;
        byId("templateCount").textContent = `${result.pagination.total} template${result.pagination.total === 1 ? "" : "s"}`;
        renderTemplates();
    } catch (error) {
        byId("templateItems").innerHTML = `<p class="notice error">${escapeHtml(error.message)}</p>`;
        byId("templateCount").textContent = "Could not load";
    }
}

function renderTemplates() {
    byId("templateItems").innerHTML = templates.length ? templates.map(template => {
        const active = template.status === "active";
        return `<article class="item"><div><div class="item-title"><strong>${escapeHtml(template.name)}</strong><span class="badge ${escapeHtml(template.status)}">${escapeHtml(template.status)}</span></div>
            <div class="meta">${escapeHtml(templateType(template))} · ${escapeHtml(templateGuildLabel(template))}<br>Updated ${new Date(template.updatedAt).toLocaleString()}</div>
            ${template.description ? `<div class="meta">${escapeHtml(template.description)}</div>` : ""}</div>
            <div class="item-actions">
                ${active ? `<button type="button" class="primary" data-use-template="${template._id}">Use template</button><button type="button" class="ghost" data-edit-template="${template._id}">Edit</button><button type="button" class="ghost" data-duplicate-template="${template._id}">Duplicate</button><button type="button" class="danger" data-archive-template="${template._id}">Archive</button>` : `<button type="button" class="ghost" data-restore-template="${template._id}">Restore</button>`}
            </div></article>`;
    }).join("") : '<p class="empty">No templates match this filter.</p>';
}

function populateContentEditor(value) {
    const embed = value.embed || {};
    const parsedContent = extractMentions(value.content || "", value.guildId);
    selectedMentions = parsedContent.mentions;
    const selectedType = parsedContent.content && value.embed ? "both" : value.embed ? "embed" : "text";
    document.querySelector(`[name="messageType"][value="${selectedType}"]`).checked = true;
    byId("guildId").value = value.guildId;
    updateMentionSearch();
    updateChannels(value.defaultChannelId || "");
    byId("content").value = value.content || "";
    renderMessageEditor(value.content || "", value.guildId);
    byId("authorName").value = embed.authorName || "";
    byId("authorIconUrl").value = embed.authorIconUrl || "";
    byId("authorUrl").value = embed.authorUrl || "";
    byId("embedTitle").value = embed.title || "";
    byId("description").value = embed.description || "";
    byId("imageUrl").value = embed.imageUrl || "";
    byId("thumbnailUrl").value = embed.thumbnailUrl || "";
    byId("footer").value = embed.footer || "";
    byId("footerIconUrl").value = embed.footerIconUrl || "";
    if (typeof hydrateEmbedMentionFields === "function") hydrateEmbedMentionFields();
    setColor("#" + (embed.color ?? 5793266).toString(16).padStart(6, "0"));
    updateType();
    updateCounters();
}

function setTemplateMode(template = null) {
    reset();
    byId("editorPurpose").value = "template";
    byId("templateNameField").hidden = false;
    byId("templateName").required = true;
    byId("templateDescriptionField").hidden = false;
    byId("scheduleSection").hidden = true;
    byId("name").required = false;
    byId("scheduledFor").required = false;
    byId("channelId").required = false;
    byId("channelLabel").textContent = "Default channel";
    byId("channelRequired").hidden = true;
    byId("formTitle").textContent = template ? "Edit message template" : "New message template";
    byId("submit").querySelector("span").textContent = template ? "Update template" : "Save template";
    byId("clearButton").textContent = template ? "Cancel editing" : "Reset";
    editingTemplateVersion = template?.__v ?? null;
    if (template) {
        byId("id").value = template._id;
        byId("templateName").value = template.name;
        byId("templateDescription").value = template.description || "";
        populateContentEditor(template);
    }
    showView("create");
    byId("templateName").focus();
    scrollTo({ top: 0, behavior: "smooth" });
}

function useTemplate(template) {
    reset();
    populateContentEditor(template);
    byId("sourceTemplateId").value = template._id;
    byId("sourceTemplateVersion").value = String(template.__v);
    byId("name").value = template.name;
    setSchedule(15);
    setEditorMode(false);
    setNotice(`Started from template “${template.name}”. Changes apply only to this scheduled message.`);
    showView("create");
    scrollTo({ top: 0, behavior: "smooth" });
}

function showTemplateNotice(message, error = false) {
    const notice = byId("templateNotice");
    notice.textContent = message;
    notice.classList.toggle("error", error);
    notice.hidden = false;
    clearTimeout(showTemplateNotice.timer);
    showTemplateNotice.timer = setTimeout(() => { notice.hidden = true; }, 4000);
}

byId("createTemplateButton").addEventListener("click", () => setTemplateMode());
byId("refreshTemplatesButton").addEventListener("click", loadTemplates);
byId("templateSearch").addEventListener("input", () => {
    clearTimeout(templateSearchTimer);
    templateSearchTimer = setTimeout(loadTemplates, 250);
});
document.querySelectorAll("[data-template-status]").forEach(button => button.addEventListener("click", () => {
    templateStatus = button.dataset.templateStatus;
    document.querySelectorAll("[data-template-status]").forEach(item => item.classList.toggle("active", item === button));
    loadTemplates();
}));
byId("templateItems").addEventListener("click", async event => {
    const action = event.target.closest("button");
    if (!action) return;
    const id = action.dataset.useTemplate || action.dataset.editTemplate || action.dataset.duplicateTemplate
        || action.dataset.archiveTemplate || action.dataset.restoreTemplate;
    const template = templates.find(item => item._id === id);
    if (!template) return;
    if (action.dataset.useTemplate) return useTemplate(template);
    if (action.dataset.editTemplate) return setTemplateMode(template);
    try {
        if (action.dataset.duplicateTemplate) {
            await request(templateApi + "/" + id + "/duplicate", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
            });
            showTemplateNotice("Template duplicated.");
        } else {
            const archive = Boolean(action.dataset.archiveTemplate);
            if (archive && !confirm("Archive this template? Existing scheduled messages will not be changed.")) return;
            await request(templateApi + "/" + id + (archive ? "/archive" : "/restore"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ version: template.__v }),
            });
            showTemplateNotice(archive ? "Template archived." : "Template restored.");
        }
        await loadTemplates();
    } catch (error) {
        showTemplateNotice(error.message, true);
    }
});
