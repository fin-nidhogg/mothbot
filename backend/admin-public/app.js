const byId = id => document.getElementById(id);
const api = '/admin-api/scheduled-messages';
let csrfToken = null;
let messages = [];
let guilds = [];
let selectedMentions = [];
let recurrenceAnchor = null;

function messageType() { return document.querySelector('[name="messageType"]:checked').value; }
function escapeHtml(value) { const element = document.createElement('div'); element.textContent = value ?? ''; return element.innerHTML; }
function toLocalInput(value) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function embedData() {
    if (messageType() === 'text') return null;
    return {
        title: byId('embedTitle').value.trim(),
        description: byId('description').value.trim(),
        imageUrl: byId('imageUrl').value.trim(),
        thumbnailUrl: byId('thumbnailUrl').value.trim(),
        footer: byId('footer').value.trim(),
        color: Number.parseInt(byId('colorHex').value.slice(1), 16),
    };
}
function formData() {
    return {
        name: byId('name').value.trim(),
        guildId: byId('guildId').value,
        channelId: byId('channelId').value,
        content: composedContent(),
        scheduledFor: new Date(byId('scheduledFor').value).toISOString(),
        embed: embedData(),
        recurrence: recurrenceData(),
    };
}
function setNotice(message, error = false) {
    byId('notice').textContent = message;
    byId('notice').classList.toggle('error', error);
}
function setColor(value) {
    const normalized = value.toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(normalized)) return;
    byId('color').value = normalized;
    byId('colorHex').value = normalized;
    document.documentElement.style.setProperty('--accent', normalized);
    preview();
}
function updateType() {
    const selected = messageType();
    byId('textFields').hidden = false;
    byId('textRequired').hidden = selected === 'embed';
    byId('embedFields').hidden = selected === 'text';
    byId('content').required = false;
    byId('description').required = selected !== 'text';
    preview();
}
function preview() {
    const embed = embedData();
    if (!embed) return;
    byId('preview').style.borderColor = byId('colorHex').value;
    const thumbnail = embed.thumbnailUrl
        ? `<img class="preview-thumbnail" src="${escapeHtml(embed.thumbnailUrl)}" alt="Embed thumbnail">`
        : "";
    const image = embed.imageUrl
        ? `<img class="preview-image" src="${escapeHtml(embed.imageUrl)}" alt="Embed image">`
        : "";
    const footer = embed.footer
        ? `<div class="preview-footer">${escapeHtml(embed.footer)}</div>`
        : "";
    byId("preview").innerHTML = `<div class="preview-copy"><div class="preview-title">${escapeHtml(embed.title || "Embed title")}</div><p>${escapeHtml(embed.description || "Your embed description will appear here.")}</p>${footer}</div>${thumbnail}${image}`;
}
async function request(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);
    let response;
    try { response = await fetch(url, { ...options, method, headers, credentials: "same-origin" }); }
    catch (error) { throw new Error(`API is unavailable: ${error.message}`); }
    if (response.status === 401) { window.location.replace("/admin/login"); throw new Error("Your session has expired."); }
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `API returned HTTP ${response.status}`);
    return body;
}
async function loadDirectory() {
    try {
        const data = await request(api + '/directory');
        guilds = data.guilds;
        byId('guildId').innerHTML = '<option value="">Select a server…</option>' + guilds.map(guild =>
            `<option value="${guild.id}">${escapeHtml(guild.name)} (${guild.channels.length} channels)</option>`
        ).join('');
        const age = data.syncedAt ? `Last synced ${new Date(data.syncedAt).toLocaleString()}` : 'Waiting for the bot to sync its Discord servers.';
        byId('directoryNote').textContent = guilds.length ? age : 'No servers available. Start the bot to sync its Discord directory.';
    } catch (error) {
        byId('guildId').innerHTML = '<option value="">Servers unavailable</option>';
        byId('directoryNote').textContent = error.message;
        byId('directoryNote').classList.add('error');
    }
}
function updateChannels(selectedChannel = '') {
    const guild = guilds.find(item => item.id === byId('guildId').value);
    const channels = guild?.channels || [];
    byId('channelId').disabled = !guild;
    byId('channelId').innerHTML = guild
        ? '<option value="">Select a channel…</option>' + channels.map(channel => `<option value="${channel.id}"># ${escapeHtml(channel.name)}</option>`).join('')
        : '<option value="">Select a server first</option>';
    if (selectedChannel && !channels.some(channel => channel.id === selectedChannel)) {
        byId('channelId').insertAdjacentHTML('beforeend', `<option value="${escapeHtml(selectedChannel)}">Unavailable channel (${escapeHtml(selectedChannel)})</option>`);
    }
    byId('channelId').value = selectedChannel;
}
async function loadMessages() {
    try {
        const query = byId('filter').value ? `?status=${encodeURIComponent(byId('filter').value)}` : '';
        messages = (await request(api + query)).messages;
        render();
        byId('lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        byId('items').innerHTML = `<p class="notice error">${escapeHtml(error.message)}</p>`;
        byId('queueCount').textContent = 'Could not load';
    }
}
function channelLabel(message) {
    const guild = guilds.find(item => item.id === message.guildId);
    const channel = guild?.channels.find(item => item.id === message.channelId);
    return guild && channel ? `${guild.name} · #${channel.name}` : message.channelId;
}
function render() {
    byId('queueCount').textContent = `${messages.length} message${messages.length === 1 ? '' : 's'}`;
    byId('items').innerHTML = messages.length ? messages.map(message => `
        <article class="item"><div><div class="item-title"><strong>${escapeHtml(message.name)}</strong><span class="badge ${escapeHtml(message.status)}">${escapeHtml(message.status)}</span></div>
        <div class="meta">${new Date(message.scheduledFor).toLocaleString()} <span class="recurrence-mark">${message.recurrence ? "· recurring" : ""}</span><br>${escapeHtml(channelLabel(message))}</div></div>
        <div class="item-actions"><button type="button" class="ghost" data-edit="${message._id}">Edit</button><button type="button" class="danger" data-delete="${message._id}">Delete</button></div></article>`).join('')
        : '<p class="empty">No scheduled messages.</p>';
}
function edit(id) {
    const message = messages.find(item => item._id === id);
    if (!message) return;
    const embed = message.embed || {};
    const parsedContent = extractMentions(message.content || '', message.guildId);
    selectedMentions = parsedContent.mentions;
    const selectedType = parsedContent.content && message.embed ? 'both' : message.embed ? 'embed' : 'text';
    document.querySelector(`[name="messageType"][value="${selectedType}"]`).checked = true;
    byId('id').value = id; byId('name').value = message.name; byId('guildId').value = message.guildId; updateMentionSearch();
    updateChannels(message.channelId);
    byId('content').value = message.content || ''; renderMessageEditor(message.content || '', message.guildId); byId('scheduledFor').value = toLocalInput(message.scheduledFor);
    byId('embedTitle').value = embed.title || ''; byId('description').value = embed.description || '';
    byId('imageUrl').value = embed.imageUrl || ''; byId('thumbnailUrl').value = embed.thumbnailUrl || ''; byId('footer').value = embed.footer || '';
    setColor('#' + (embed.color ?? 5793266).toString(16).padStart(6, '0')); populateRecurrence(message.recurrence);
    setEditorMode(true); updateType(); updateCounters(); showView('create'); scrollTo({ top: 0, behavior: 'smooth' });
}
function reset() {
    selectedMentions = []; recurrenceAnchor = null;
    byId('form').reset(); byId('messageEditor').innerHTML = ''; byId('content').value = ''; renderMentionChips(); updateRecurrence(); updateMentionSearch(); byId('mentionResults').hidden = true; byId('id').value = ''; byId('channelId').disabled = true;
    byId('channelId').innerHTML = '<option value="">Select a server first</option>';
    setEditorMode(false); setNotice(''); setColor('#5865F2'); updateType(); setSchedule(15); updateCounters();
}
document.querySelectorAll('[name="messageType"]').forEach(input => input.addEventListener('change', updateType));
document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => setColor(button.dataset.color)));
byId('color').addEventListener('input', event => setColor(event.target.value));
byId('colorHex').addEventListener('input', event => { if (/^#[0-9a-f]{6}$/i.test(event.target.value)) setColor(event.target.value); });
byId('form').addEventListener('input', event => { if (!['color', 'colorHex'].includes(event.target.id)) preview(); updateCounters(); });
byId('guildId').addEventListener('change', () => { updateChannels(); selectedMentions = []; renderMentionChips(); updateMentionSearch(); });
byId('filter').addEventListener('change', loadMessages);
byId('clearButton').addEventListener('click', () => { const wasEditing = Boolean(byId('id').value); reset(); if (wasEditing) showView('manage'); });
byId('items').addEventListener('click', async event => {
    if (event.target.dataset.edit) edit(event.target.dataset.edit);
    if (event.target.dataset.delete && confirm('Delete this scheduled message permanently?')) {
        try { await request(`${api}/${event.target.dataset.delete}`, { method: 'DELETE' }); await loadMessages(); }
        catch (error) { setNotice(error.message, true); }
    }
});
byId('form').addEventListener('submit', async event => {
    event.preventDefault();
    const id = byId('id').value;
    byId('submit').disabled = true; setNotice('Saving…');
    try {
        await request(api + (id ? `/${id}` : ''), { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData()) });
        reset(); showView('manage'); showManageNotice(id ? 'Message updated.' : 'Message created and added to the queue.'); setNotice('');
    } catch (error) { setNotice(error.message, true); }
    finally { byId('submit').disabled = false; }
});
async function bootstrapAdmin() {
    const session = await request('/admin-api/auth/me');
    csrfToken = session.csrfToken;
    byId('adminUser').textContent = session.user.displayName;
    updateType();
    setColor('#5865F2');
    await loadDirectory();
    await loadMessages();
}
bootstrapAdmin().catch(error => setNotice(error.message, true));

function updateCounters() {
    byId('contentCount').textContent = byId('content').value.length.toLocaleString() + ' / 2,000';
    byId('titleCount').textContent = byId('embedTitle').value.length.toLocaleString() + ' / 256';
    byId('descriptionCount').textContent = byId('description').value.length.toLocaleString() + ' / 4,096';
}
function setSchedule(minutes) {
    const date = new Date(Date.now() + Number(minutes) * 60000);
    date.setSeconds(0, 0);
    byId('scheduledFor').value = toLocalInput(date);
}
document.querySelectorAll('[data-delay]').forEach(button => {
    button.addEventListener('click', () => setSchedule(button.dataset.delay));
});
byId('scheduledFor').min = toLocalInput(new Date());
if (!byId('scheduledFor').value) setSchedule(15);
updateCounters();

function showView(view) {
    const managing = view === 'manage';
    byId('createView').hidden = managing;
    byId('manageView').hidden = !managing;
    document.querySelectorAll('[data-view]').forEach(button => {
        button.classList.toggle('active', button.dataset.view === view);
    });
    if (managing) loadMessages();
}
document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => showView(button.dataset.view));
});
document.querySelectorAll('[data-status]').forEach(button => {
    button.addEventListener('click', () => {
        byId('filter').value = button.dataset.status;
        document.querySelectorAll('[data-status]').forEach(item => item.classList.toggle('active', item === button));
        loadMessages();
    });
});
byId('createNewButton').addEventListener('click', () => {
    reset();
    showView('create');
    byId('name').focus();
});
byId('refreshButton').addEventListener('click', loadMessages);
setInterval(() => {
    if (!byId('manageView').hidden) loadMessages();
}, 30000);

function showManageNotice(message) {
    const notice = byId('manageNotice');
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(showManageNotice.timer);
    showManageNotice.timer = setTimeout(() => { notice.hidden = true; }, 4000);
}

function setEditorMode(editing) {
    byId('formTitle').textContent = editing ? 'Edit scheduled message' : 'New scheduled message';
    byId('editorNavButton').textContent = editing ? 'Edit message' : 'New message';
    byId('submit').querySelector('span').textContent = editing ? 'Update message' : 'Schedule message';
    byId('clearButton').textContent = editing ? 'Cancel editing' : 'Reset';
}

function mentionToken(mention) {
    return mention.type === 'role' ? `<@&${mention.id}>` : `<@${mention.id}>`;
}
function composedContent() {
    const content = byId('content').value.trim();
    if (messageType() !== 'embed' && !content) throw new Error('Write a message or select a mention.');
    if (content.length > 2000) throw new Error('Message text and mentions exceed Discord’s 2,000 character limit.');
    return content;
}
function recurrenceData() {
    if (!byId('recurrenceEnabled').checked) return null;
    const frequency = byId('recurrenceFrequency').value;
    const weekdays = [...document.querySelectorAll('[name="weekday"]:checked')].map(input => Number(input.value));
    if (frequency === 'weekly' && !weekdays.length) throw new Error('Select at least one weekday.');
    return {
        frequency,
        interval: Number(byId('recurrenceInterval').value) || 1,
        weekdays: frequency === 'weekly' ? weekdays : undefined,
        dayOfMonth: frequency === 'monthly' ? Number(byId('dayOfMonth').value) : undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        anchor: recurrenceAnchor || new Date(byId('scheduledFor').value).toISOString(),
    };
}
function updateRecurrence() {
    const enabled = byId('recurrenceEnabled').checked;
    if (enabled && byId('scheduledFor').value) {
        const start = new Date(byId('scheduledFor').value);
        if (![...document.querySelectorAll('[name="weekday"]')].some(input => input.checked)) {
            const weekday = start.getDay() || 7;
            const input = document.querySelector('[name="weekday"][value="' + weekday + '"]');
            if (input) input.checked = true;
        }
        if (!recurrenceAnchor) byId('dayOfMonth').value = start.getDate();
    }
    const monthly = byId('recurrenceFrequency').value === 'monthly';
    byId('recurrenceSettings').hidden = !enabled;
    byId('weeklySettings').hidden = monthly;
    byId('monthlySettings').hidden = !monthly;
    byId('intervalUnit').textContent = monthly ? 'month(s)' : 'week(s)';
    byId('timeZoneLabel').textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    byId('scheduleLabel').textContent = enabled ? 'First delivery' : 'Send at';
    byId('scheduleHelp').textContent = enabled ? 'Sets the first occurrence and the recurring local time.' : 'The message will be delivered once at this time.';
    byId('quickTimes').hidden = enabled;
    byId('recurrenceExplanation').hidden = !enabled;
}
function populateRecurrence(rule) {
    recurrenceAnchor = rule?.anchor || null;
    byId('recurrenceEnabled').checked = Boolean(rule);
    byId('recurrenceFrequency').value = rule?.frequency || 'weekly';
    byId('recurrenceInterval').value = rule?.interval || 1;
    byId('dayOfMonth').value = rule?.dayOfMonth || 1;
    document.querySelectorAll('[name="weekday"]').forEach(input => {
        input.checked = Boolean(rule?.weekdays?.includes(Number(input.value)));
    });
    updateRecurrence();
}
function currentGuild() {
    return guilds.find(guild => guild.id === byId('guildId').value);
}
function updateMentionSearch() {
    const guild = currentGuild();
    byId('mentionSearch').disabled = !guild;
    byId('mentionSearch').placeholder = guild ? 'Search members or roles…' : 'Select a server first';
    if (!guild) byId('mentionSearch').value = '';
}
function mentionCandidates() {
    const guild = currentGuild();
    if (!guild) return [];
    return [
        ...(guild.roles || []).map(role => ({ type: 'role', id: role.id, label: role.name })),
        ...(guild.members || []).map(member => ({ type: 'user', id: member.id, label: member.displayName })),
    ];
}
function renderMentionResults() {
    const query = byId('mentionSearch').value.trim().toLocaleLowerCase();
    const results = byId('mentionResults');
    if (!query) { results.hidden = true; results.innerHTML = ''; return; }
    const matches = mentionCandidates().filter(item =>
        item.label.toLocaleLowerCase().includes(query) &&
        !selectedMentions.some(selected => selected.type === item.type && selected.id === item.id)
    ).slice(0, 12);
    results.innerHTML = matches.length ? matches.map(item =>
        `<button type="button" data-mention-type="${item.type}" data-mention-id="${item.id}"><span class="mention-icon">${item.type === 'role' ? '@' : '●'}</span><span><strong>${escapeHtml(item.label)}</strong><small>${item.type}</small></span></button>`
    ).join('') : '<p>No matching members or roles.</p>';
    results.hidden = false;
}
function renderMentionChips() {
    byId('mentionChips').innerHTML = selectedMentions.map((mention, index) =>
        `<span>@${escapeHtml(mention.label)} <button type="button" data-remove-mention="${index}" aria-label="Remove ${escapeHtml(mention.label)}">×</button></span>`
    ).join('');
}
function extractMentions(content, guildId) {
    const guild = guilds.find(item => item.id === guildId);
    const mentions = [];
    const expression = /<@(!?)(\d{17,20})>|<@&(\d{17,20})>/g;
    const stripped = content.replace(expression, (token, nickname, userId, roleId) => {
        const type = roleId ? 'role' : 'user';
        const id = roleId || userId;
        const source = type === 'role'
            ? guild?.roles?.find(role => role.id === id)
            : guild?.members?.find(member => member.id === id);
        const label = source?.name || source?.displayName || id;
        if (!mentions.some(item => item.type === type && item.id === id)) mentions.push({ type, id, label });
        return '';
    }).trim();
    return { content: stripped, mentions };
}
byId('recurrenceEnabled').addEventListener('change', updateRecurrence);
byId('recurrenceFrequency').addEventListener('change', updateRecurrence);
byId('mentionSearch').addEventListener('input', renderMentionResults);
byId('mentionResults').addEventListener('click', event => {
    const button = event.target.closest('[data-mention-id]');
    if (!button) return;
    const candidate = mentionCandidates().find(item => item.type === button.dataset.mentionType && item.id === button.dataset.mentionId);
    if (candidate) selectedMentions.push(candidate);
    byId('mentionSearch').value = '';
    byId('mentionResults').hidden = true;
    renderMentionChips();
});
byId('mentionChips').addEventListener('click', event => {
    const index = event.target.dataset.removeMention;
    if (index === undefined) return;
    selectedMentions.splice(Number(index), 1);
    renderMentionChips();
});
document.addEventListener('click', event => {
    if (!event.target.closest('.mention-search-wrap')) byId('mentionResults').hidden = true;
});
updateRecurrence();
updateMentionSearch();

let inlineMentionContext = null;
let inlineMentionIndex = 0;

function appendEditorText(container, text) {
    text.split('\n').forEach((part, index) => {
        if (index) container.appendChild(document.createElement('br'));
        if (part) container.appendChild(document.createTextNode(part));
    });
}
function mentionElement(type, id, label) {
    const element = document.createElement('span');
    element.className = 'inline-mention';
    element.contentEditable = 'false';
    element.dataset.token = type === 'role' ? `<@&${id}>` : `<@${id}>`;
    element.textContent = '@' + label;
    return element;
}
function serializeEditorNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    if (node.classList.contains('inline-mention')) return node.dataset.token;
    if (node.tagName === 'BR') return '\n';
    const value = [...node.childNodes].map(serializeEditorNode).join('');
    return ['DIV', 'P'].includes(node.tagName) ? value + '\n' : value;
}
function syncMessageEditor() {
    byId('content').value = [...byId('messageEditor').childNodes].map(serializeEditorNode).join('').replace(/\n{3,}/g, '\n\n').trimEnd();
}
function renderMessageEditor(content, guildId) {
    const editor = byId('messageEditor');
    editor.innerHTML = '';
    const guild = guilds.find(item => item.id === guildId);
    const expression = /<@(!?)(\d{17,20})>|<@&(\d{17,20})>/g;
    let cursor = 0;
    for (const match of content.matchAll(expression)) {
        appendEditorText(editor, content.slice(cursor, match.index));
        const type = match[3] ? 'role' : 'user';
        const id = match[3] || match[2];
        const source = type === 'role' ? guild?.roles?.find(role => role.id === id) : guild?.members?.find(member => member.id === id);
        editor.appendChild(mentionElement(type, id, source?.name || source?.displayName || id));
        cursor = match.index + match[0].length;
    }
    appendEditorText(editor, content.slice(cursor));
    syncMessageEditor();
    updateCounters();
}
function findInlineMentionContext() {
    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.isCollapsed) return null;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !byId('messageEditor').contains(node)) return null;
    const before = node.nodeValue.slice(0, range.startOffset);
    const match = before.match(/@([^@\n]{0,50})$/u);
    if (!match) return null;
    const replacementRange = range.cloneRange();
    replacementRange.setStart(node, range.startOffset - match[0].length);
    return { range: replacementRange, query: match[1].trim().toLocaleLowerCase() };
}
function inlineMatches(query) {
    if (!currentGuild()) return [];
    return mentionCandidates().filter(item => item.label.toLocaleLowerCase().includes(query)).slice(0, 10);
}
function renderInlineMentionResults() {
    inlineMentionContext = findInlineMentionContext();
    const results = byId('inlineMentionResults');
    if (!inlineMentionContext) { results.hidden = true; return; }
    const matches = inlineMatches(inlineMentionContext.query);
    inlineMentionIndex = Math.min(inlineMentionIndex, Math.max(matches.length - 1, 0));
    results.innerHTML = matches.length ? matches.map((item, index) =>
        `<button type="button" class="${index === inlineMentionIndex ? 'active' : ''}" data-inline-index="${index}"><span class="mention-icon">${item.type === 'role' ? '@' : '●'}</span><span><strong>${escapeHtml(item.label)}</strong><small>${item.type}</small></span></button>`
    ).join('') : '<p>No matching members or roles.</p>';
    results.hidden = false;
}
function insertInlineMention(index = inlineMentionIndex) {
    if (!inlineMentionContext) return;
    const item = inlineMatches(inlineMentionContext.query)[index];
    if (!item) return;
    const range = inlineMentionContext.range;
    range.deleteContents();
    const mention = mentionElement(item.type, item.id, item.label);
    const space = document.createTextNode(' ');
    range.insertNode(space);
    range.insertNode(mention);
    range.setStartAfter(space);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    byId('messageEditor').focus();
    byId('inlineMentionResults').hidden = true;
    inlineMentionContext = null;
    syncMessageEditor();
    updateCounters();
}
byId('messageEditor').addEventListener('input', () => {
    syncMessageEditor();
    updateCounters();
    inlineMentionIndex = 0;
    renderInlineMentionResults();
});
byId('messageEditor').addEventListener('keydown', event => {
    const results = byId('inlineMentionResults');
    if (results.hidden) return;
    const count = inlineMatches(inlineMentionContext?.query || '').length;
    if (event.key === 'ArrowDown' && count) { event.preventDefault(); inlineMentionIndex = (inlineMentionIndex + 1) % count; renderInlineMentionResults(); }
    if (event.key === 'ArrowUp' && count) { event.preventDefault(); inlineMentionIndex = (inlineMentionIndex - 1 + count) % count; renderInlineMentionResults(); }
    if ((event.key === 'Enter' || event.key === 'Tab') && count) { event.preventDefault(); insertInlineMention(); }
    if (event.key === 'Escape') { event.preventDefault(); results.hidden = true; inlineMentionContext = null; }
});
byId('messageEditor').addEventListener('paste', event => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
});
byId('inlineMentionResults').addEventListener('mousedown', event => {
    const button = event.target.closest('[data-inline-index]');
    if (!button) return;
    event.preventDefault();
    insertInlineMention(Number(button.dataset.inlineIndex));
});
document.addEventListener('click', event => {
    if (!event.target.closest('.message-editor-wrap')) byId('inlineMentionResults').hidden = true;
});

byId('logoutButton').addEventListener('click', async () => {
    try { await request('/admin-api/auth/logout', { method: 'POST' }); }
    finally { window.location.replace('/admin/login'); }
});
