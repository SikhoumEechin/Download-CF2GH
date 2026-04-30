// ============================================================
//  Telegram Bot — Cloudflare Worker  (v3.0)
//  All messages in English. Owner-only restricted commands.
//  Numbered wipe, emoji-typed folders, paginated /folders, etc.
// ============================================================

// ──────────────────────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────────────────────
const OWNER_ONLY_COMMANDS = new Set([
  "/kv", "/admins", "/addadmin", "/rmadmin", "/wipe",
  "/dump_memory", "/rmkey", "/stop",
  "/groups", "/addgroup", "/rmgroup",
]);

// ──────────────────────────────────────────────────────────────
//  File extension → emoji map  (exhaustive list)
// ──────────────────────────────────────────────────────────────
const EXT_EMOJI_MAP = {
    // Video
    mp4: "🎬", mkv: "🎬", avi: "🎬", mov: "🎬", wmv: "🎬",
    webm: "🎬", m4v: "🎬", flv: "🎬", ts: "🎬", vob: "🎬",
    // Audio
    mp3: "🎵", flac: "🎵", aac: "🎵", wav: "🎵", ogg: "🎵",
    m4a: "🎵", wma: "🎵", opus: "🎵", ape: "🎵", alac: "🎵",
    // Image
    jpg: "🖼", jpeg: "🖼", png: "🖼", gif: "🖼", webp: "🖼",
    bmp: "🖼", svg: "🖼", tiff: "🖼", ico: "🖼", raw: "🖼",
    // Archive
    zip: "📦", rar: "📦", "7z": "📦", tar: "📦", gz: "📦",
    bz2: "📦", xz: "📦", zst: "📦", lz4: "📦", cab: "📦",
    // Mobile
    apk: "📱", aab: "📱", ipa: "📱",
    // Disk Image
    iso: "💿", img: "💿", dmg: "💿", vhd: "💿", vmdk: "💿",
    // Executable
    exe: "⚙️", msi: "⚙️", deb: "⚙️", rpm: "⚙️", sh: "⚙️",
    bat: "⚙️", cmd: "⚙️", appimage: "⚙️",
    // Document
    pdf: "📕",
    doc: "📝", docx: "📝", odt: "📝", rtf: "📝",
    xls: "📊", xlsx: "📊", ods: "📊", csv: "📊",
    ppt: "📊", pptx: "📊", odp: "📊",
    // Subtitle / text
    sub: "💬", srt: "💬", ass: "💬", ssa: "💬", vtt: "💬",
    txt: "📄", md: "📄", nfo: "📄", log: "📄",
    // Part / split
    part: "🔩", "001": "🔩", "002": "🔩", "003": "🔩",
};

// Priority order for detecting folder "type" from children
const EXT_PRIORITY = [
    ["🎬", ["mp4","mkv","avi","mov","wmv","webm","m4v","flv","ts","vob"]],
    ["🎵", ["mp3","flac","aac","wav","ogg","m4a","wma","opus","ape","alac"]],
    ["📦", ["zip","rar","7z","tar","gz","bz2","xz","zst"]],
    ["📱", ["apk","aab","ipa"]],
    ["💿", ["iso","img","dmg","vhd","vmdk"]],
    ["⚙️", ["exe","msi","deb","rpm","sh","appimage"]],
    ["📕", ["pdf"]],
    ["📝", ["doc","docx","odt","rtf"]],
    ["📊", ["xls","xlsx","ods","csv","ppt","pptx"]],
    ["🖼", ["jpg","jpeg","png","gif","webp","bmp","svg","tiff"]],
    ["💬", ["sub","srt","ass","ssa","vtt"]],
];

// ──────────────────────────────────────────────────────────────
//  File emoji
// ──────────────────────────────────────────────────────────────
function getFileEmoji(name) {
    if (!name) return "📄";
    let lower = name.toLowerCase();
    // حذف پسوند پارت عددی (.001.part .002.part ...)
    lower = lower.replace(/\.\d{3}\.part$/, "");
    // حذف .part ساده
    if (lower.endsWith(".part")) lower = lower.replace(/\.part$/, "");
    const ext = lower.split(".").pop() || "";
    return EXT_EMOJI_MAP[ext] || "📄";
}

// ──────────────────────────────────────────────────────────────
//  Folder emoji — از روی فایل‌های داخل فولدر (recursive)
// ──────────────────────────────────────────────────────────────
function getFolderEmoji(children) {
    if (!Array.isArray(children) || children.length === 0) return "📁";
    const extSet = new Set();
    function walk(nodes) {
        for (const n of nodes) {
            if (n.type === "file") {
                let lower = (n.name || "").toLowerCase();
                lower = lower.replace(/\.\d{3}\.part$/, "");
                if (lower.endsWith(".part")) lower = lower.replace(/\.part$/, "");
                const ext = lower.split(".").pop();
                if (ext) extSet.add(ext);
            } else if (n.type === "folder" && Array.isArray(n.children)) {
                walk(n.children);
            }
        }
    }
    walk(children);
    for (const [emoji, exts] of EXT_PRIORITY) {
        for (const ext of exts) {
            if (extSet.has(ext)) return emoji;
        }
    }
    return "📁";
}

// ──────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────
function truncateFileName(name) {
    if (!name) return "";

    const mainExts = [
        // ترتیب مهمه — طولانی‌تر اول
        ".tar.gz", ".tar.bz2", ".tar.xz",
        // Video
        ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".webm", ".m4v", ".flv", ".ts", ".vob",
        // Audio
        ".mp3", ".flac", ".aac", ".wav", ".ogg", ".m4a", ".wma", ".opus", ".ape", ".alac",
        // Archive
        ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".zst", ".lz4", ".cab",
        // Mobile
        ".apk", ".aab", ".ipa",
        // Disk Image
        ".iso", ".img", ".dmg", ".vhd", ".vmdk",
        // Executable
        ".appimage", ".exe", ".msi", ".deb", ".rpm", ".sh", ".bat", ".cmd",
        // Document
        ".pdf", ".docx", ".doc", ".odt", ".rtf",
        ".xlsx", ".xls", ".ods", ".csv",
        ".pptx", ".ppt", ".odp",
        // Subtitle / Text
        ".srt", ".ass", ".ssa", ".vtt", ".sub",
        ".txt", ".md", ".nfo", ".log",
        // Image
        ".jpeg", ".jpg", ".png", ".gif", ".webp", ".bmp", ".svg", ".tiff", ".ico", ".raw",
    ];

    const lower = name.toLowerCase();

    // اگه پارت بود — پسوند اصلی قبلش رو در نظر بگیر
    const partMatch = lower.match(/^(.+)(\.\d{3}\.part)$/);
    const effectiveLower = partMatch ? partMatch[1] : lower;
    // effectiveName: اسم اصلی با حروف بزرگ/کوچک اصلی، بدون پسوند پارت
    const effectiveName  = partMatch ? name.slice(0, partMatch[1].length) : name;
    const partSuffix     = partMatch ? name.slice(partMatch[1].length) : "";
    // partSuffix مثلاً: ".001.part"

    // پیدا کردن اولین mainExt توی effectiveLower
    let extIdx = -1;
    for (const ext of mainExts) {
        const idx = effectiveLower.indexOf(ext);
        if (idx !== -1 && (extIdx === -1 || idx < extIdx)) {
            extIdx = idx;
        }
    }

    if (extIdx === -1) {
        // پسوند شناخته‌شده‌ای نبود — از lastIndexOf استفاده کن
        const dotIdx = effectiveLower.lastIndexOf(".");
        if (dotIdx > 0) {
            const base    = effectiveName.slice(0, dotIdx);
            const extPart = effectiveName.slice(dotIdx) + partSuffix;
            if (base.length <= 10) return name;
            return base.slice(0, 10) + "…" + extPart;
        }
        // اصلاً پسوند نداره
        if (name.length <= 15) return name;
        return name.slice(0, 10) + "…" + name.slice(-5);
    }

    // ✅ از effectiveName بخون نه name — تا partSuffix دو بار اضافه نشه
    const prefix = effectiveName.slice(0, extIdx);
    const suffix = effectiveName.slice(extIdx) + partSuffix;

    if (prefix.length <= 10) return name; // کوتاهه، دست نزن
    return prefix.slice(0, 10) + "…" + suffix;
}

function truncateFolderName(name) {
    if (!name) return "";
    if (name.length <= 20) return name;
    return name.slice(0, 12) + "…" + name.slice(-7);
}

function truncateUrl(url) {
    if (!url) return "";
    if (url.length <= 31) return url;
    return url.slice(0, 15) + "…" + url.slice(-15);
}

function formatMono(val) {
    return `<code>${esc(String(val))}</code>`;
}

function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min === 0) return `${sec}s`;
    return `${min}m ${sec}s`;
}

function esc(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}







// ──────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────

// Truncate filename: keep 10 chars before main ext + suffix

// ──────────────────────────────────────────────────────────────
//  KVManager
// ──────────────────────────────────────────────────────────────
class KVManager {
    constructor(env) {
        this.kv = env.BOT_KV;
        this.ownerId = String(env.OWNER_ID);
    }

    async getAdmins() {
        return (await this.kv.get("admins_list", "json")) || [];
    }

    async isAdmin(userId) {
        if (String(userId) === this.ownerId) return true;
        const admins = await this.getAdmins();
        return admins.map(String).includes(String(userId));
    }

    async addAdmin(userId) {
        const admins = await this.getAdmins();
        if (!admins.map(String).includes(String(userId))) {
            admins.push(String(userId));
            await this.kv.put("admins_list", JSON.stringify(admins));
        }
    }

    async removeAdmin(userId) {
        const admins = await this.getAdmins();
        const updated = admins.filter(id => String(id) !== String(userId));
        await this.kv.put("admins_list", JSON.stringify(updated));
    }

    async getQueue() {
        return (await this.kv.get("queue_list", "json")) || [];
    }

    async addToQueue(item) {
        const queue = await this.getQueue();
        queue.push(item);
        await this.kv.put("queue_list", JSON.stringify(queue));
    }

    async popQueue() {
        const queue = await this.getQueue();
        if (queue.length === 0) return { nextTask: null };
    
        const nextTask = queue.shift(); // ← اولین نفر صف = همون که باید بعدی اجرا بشه
        await this.kv.put("queue_list", JSON.stringify(queue));
    
        return { nextTask };
    }
    
    async clearQueue() {
        await this.kv.put("queue_list", JSON.stringify([]));
    }

    async setCurrentTask(taskData) {
        await this.kv.put("current_task", JSON.stringify(taskData));
    }

    async getCurrentTask() {
        return await this.kv.get("current_task", "json");
    }

    async clearCurrentTask() {
        await this.kv.put("current_task", JSON.stringify(null));
    }

    // ── tree_cache: each top-level item has a stable numeric id ──
    async getTreeCache() {
        return (await this.kv.get("tree_cache", "json")) || [];
    }

    /**
     * Merge/update tree cache.
     * Keeps existing numeric ids stable; assigns new ids to new items.
     * Also stamps each top-level item with a folderEmoji.
     * New items get the lowest id numbers (sorted newest-first by insertion).
     */
    async updateTreeCache(newTree) {
        if (!newTree || !Array.isArray(newTree)) {
            await this.kv.put("tree_cache", JSON.stringify([]));
            return [];
        }
    
        // ۱. شماره‌گذاری مجدد از ۱ تا N
        // چون می‌خواهیم جدیدترین‌ها آیدی بزرگتری داشته باشند تا در سورت اول قرار بگیرند،
        // ابتدا لیست را معکوس می‌کنیم یا در مرحله سورت مدیریت می‌کنیم.
        // اما برای سادگی، ابتدا شماره‌گذاری می‌کنیم:
        let processed = newTree.map((item, index) => {
            // اختصاص آیدی موقت بر اساس ایندکس
            const tempId = index + 1;
            
            const emoji = item.type === "folder"
                ? (typeof getFolderEmoji === 'function' ? getFolderEmoji(item.children || []) : "📁")
                : (typeof getFileEmoji === 'function' ? getFileEmoji(item.name) : "📄");
    
            return { 
                ...item, 
                id: tempId, 
                folderEmoji: emoji 
            };
        });
    
        // ۲. مرتب‌سازی: جدیدترین‌ها (که قاعدتاً در لیست گیت‌هاب جدیدتر هستند) 
        // آیدی بزرگتر بگیرند تا در صدر باشند.
        // اگر می‌خواهی آیدیِ ۱ همیشه قدیمی‌ترین باشد و آخرین آیدی جدیدترین:
        processed.sort((a, b) => b.id - a.id);
    
        // ۳. بازنگری آیدی‌ها بعد از سورت (اگر می‌خواهی آیدی ۱ حتماً همیشه جدیدترین باشد)
        // اینجاست که خواسته تو دقیقاً اجرا می‌شود:
        const finalResult = processed.map((item, index) => {
            return { ...item, id: index + 1 };
        });
    
        // ۴. ذخیره در KV
        await this.kv.put("tree_cache", JSON.stringify(finalResult));
        
        return finalResult;
    }
        /**
     * Upsert a single folder into tree_cache (used after task_completed).
     * New items are inserted at the front (newest-first order).
     */
    async upsertFolderInCache(folderNode) {
        const existing = await this.getTreeCache();
        const idx = existing.findIndex(n => n.name === folderNode.name);
        let maxId = existing.reduce((m, n) => Math.max(m, n.id || 0), 0);
        const id = idx >= 0 && existing[idx].id !== undefined
            ? existing[idx].id
            : ++maxId;
        const emoji = folderNode.type === "folder"
            ? getFolderEmoji(folderNode.children || [])
            : getFileEmoji(folderNode.name);
        const enriched = { ...folderNode, id, folderEmoji: emoji };
        // Remove old entry if exists
        const filtered = idx >= 0 ? existing.filter((_, i) => i !== idx) : existing;
        // Insert at front (newest first)
        const updated = [enriched, ...filtered];
        await this.kv.put("tree_cache", JSON.stringify(updated));
        return updated;
    }

    /**
     * Delete an item from tree_cache by its numeric id.
     * Returns the deleted item or null.
     */
    async deleteFromCacheById(id) {
        const existing = await this.getTreeCache();
        const idx = existing.findIndex(n => n.id === id);
        if (idx === -1) return null;
        const [deleted] = existing.splice(idx, 1);
        await this.kv.put("tree_cache", JSON.stringify(existing));
        return deleted;
    }

    async getAllowedGroups() {
        return (await this.kv.get("allowed_groups", "json")) || [];
    }

    async setAllowedGroups(groupsArray) {
        await this.kv.put("allowed_groups", JSON.stringify(groupsArray));
    }


    async getKV() {
        const keys = ["admins_list", "queue_list", "current_task", "tree_cache", "allowed_groups"];
        const result = {};
        for (const key of keys) {
            result[key] = (await this.kv.get(key, "json")) ?? null;
        }
        return result;
    }

    async resetQueueAndStatus() {
        await this.kv.put("queue_list", JSON.stringify([]));
        await this.kv.put("current_task", JSON.stringify(null));
    }

    async clearKeyValue(key) {
        const validKeys = ["admins_list", "queue_list", "current_task", "tree_cache", "allowed_groups"];
        if (!validKeys.includes(key)) return false;
        const emptyVals = {
            admins_list: "[]",
            queue_list: "[]",
            current_task: "null",
            tree_cache: "[]",
            allowed_groups: "[]",
        };
        await this.kv.put(key, emptyVals[key]);
        return true;
    }
}

// ──────────────────────────────────────────────────────────────
//  UIBuilder
// ──────────────────────────────────────────────────────────────
class UIBuilder {
    // Progress bar for downloading only (not uploading — no real data)
    generateProgressBar(percent, step = null, totalSteps = null) {
        const pct = Math.min(100, Math.max(0, Number(percent) || 0));
        const barWidth = 12;
        const filled = Math.round((pct / 100) * barWidth);
        const empty = barWidth - filled;
        let bar;
        if (filled === 0) bar = "•" + "━".repeat(barWidth - 1);
        else if (filled >= barWidth) bar = "━".repeat(barWidth);
        else bar = "━".repeat(filled - 1) + "•" + "━".repeat(empty);
    
        const stepStr = (step !== null && totalSteps !== null) ? ` ${step}/${totalSteps}` : "";
        return `▶ ${formatMono(`${bar} ${pct}%${stepStr}`)}`;
    }
    // Tree display (for /folder detail view)
    buildTreeText(node, indent = "", isLast = true) {
      if (Array.isArray(node)) {
        if (node.length === 0) return "📂 <i>(empty)</i>\n";
        return node.map((child, i) =>
          this.buildTreeText(child, indent, i === node.length - 1)
        ).join("");
      }
      const isFolder = node.type === "folder";
      const connector = indent === "" ? "" : (isLast ? "└── " : "├── ");
      const childIndent = indent === "" ? "" : (isLast ? "    " : "│   ");
      let line;
      if (isFolder) {
        const emoji = node.folderEmoji || "📁";
        const displayName = truncateFolderName(node.name);
        const sizeStr = node.size ? ` ${formatMono(node.size)}` : "";
        if (node.url) {
          line = `${indent}${connector}${emoji} <a href="${node.url}">${esc(displayName)}</a>${sizeStr}\n`;
        } else {
          line = `${indent}${connector}${emoji} <b>${esc(displayName)}</b>${sizeStr}\n`;
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          node.children.forEach((child, i) => {
            line += this.buildTreeText(child, indent + childIndent, i === node.children.length - 1);
          });
        }
      } else {
        const displayName = truncateFileName(node.name);
        const emoji = getFileEmoji(node.name);
        const sizeStr = node.size ? ` ${formatMono(node.size)}` : "";
        if (node.url) {
          line = `${indent}${connector}${emoji} <a href="${esc(node.url)}">${esc(displayName)}</a>${sizeStr}\n`;
        } else {
          line = `${indent}${connector}${emoji} ${formatMono(displayName)}${sizeStr}\n`;
        }
      }
      return line;
    }
        // Status message
    formatStatusMessage({ status, fileName, progress, size, step, totalSteps, speed, isUploading, isLargeFile, uploadPart, totalParts, isLargeUpload }) {
        let statusEmoji = "⏳";
        if (status && status.includes("Setting up")) statusEmoji = "⚙️";
        else if (status && status.includes("Download")) statusEmoji = "📥";
        else if (status && status.includes("Upload")) statusEmoji = "📤";
        else if (status && status.includes("Split")) statusEmoji = "✂️";
    
        const fileEmoji = fileName ? getFileEmoji(fileName) : "🎬";
        const fileStr = fileName
            ? `${fileEmoji} <b>File:</b> ${formatMono(truncateFileName(fileName))}\n`
            : "";
        const sizeStr = size ? `💾 <b>Size:</b> ${formatMono(size)}\n` : "";
    
        const cleanStatus = String(status || "Processing")
            .replace(/^[⚙️📥📤✂️⏳\uFE0F]+\s*/, "")
            .trim();
        const statusStr = `${statusEmoji} <b>Status:</b> ${formatMono(cleanStatus)}\n`;
    
        // progress bar + speed برای دانلود فایل بزرگ
        // progress bar + parts برای آپلود فایل بزرگ
        let barStr = "";
        if (!isUploading && isLargeFile && progress !== null && progress !== undefined) {
            barStr = `\n${this.generateProgressBar(progress, step, totalSteps)}`;
            if (speed) barStr += `\n⏩ ${formatMono(speed)}`;
        } else if (isLargeUpload && progress !== null && progress !== undefined) {
            barStr = `\n${this.generateProgressBar(progress, step, totalSteps)}`;
            if (uploadPart !== null && totalParts !== null) {
                barStr += `\n⏩ ${formatMono(`${uploadPart}/${totalParts} parts uploaded`)}`;
            }
        }
    
        return `${fileStr}${sizeStr}${statusStr}${barStr}`;
    }
        // Queue display
    formatQueue(queueList, currentTask, userUrl = null) {
      const positions = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      let text = "📋 <b>Download Queue</b>\n━━━━━━━━━━━━━━━━━━━━\n\n";
      if (currentTask) {
        const emoji = getFileEmoji(currentTask.url);
        text += `🔄 <b>Now Processing:</b>\n   ${emoji} <code>${esc(truncateUrl(currentTask.url))}</code>\n\n`;
      } else {
        text += `😴 <b>Idle</b> — No active download\n\nSend a link or use /link URL\n`;
      }
      if (queueList.length > 0) {
        text += `⏳ <b>Waiting (${queueList.length}):</b>\n`;
        queueList.slice(0, 10).forEach((item, i) => {
          const emoji = getFileEmoji(item.url);
          const pos = positions[i] || `${i + 1}.`;
          text += `${pos} ${emoji} <code>${esc(truncateUrl(item.url))}</code>\n`;
        });
        if (queueList.length > 10) text += `\n<i>… and ${queueList.length - 10} more</i>\n`;
      } else {
        text += `✅ <b>Queue is empty</b>\n`;
      }
      if (userUrl) {
        const pos = queueList.findIndex(item => item.url === userUrl);
        if (pos >= 0) text += `\n🎯 <b>Your position:</b> ${pos + 1} of ${queueList.length}`;
      }
      return text;
    }
        // Finished message
    formatFinishedMessage({ fileName, size, folderTree, duration, fileEmoji }) {
      const emoji = fileEmoji
        || (folderTree ? getFolderEmoji(folderTree.children || []) : null)
        || (fileName ? getFileEmoji(fileName) : "📄");
    
      let text = `${emoji} <b>File:</b> ${formatMono(truncateFileName(fileName || folderTree?.name || ""))}\n`;
      if (size) text += `💾 <b>Size:</b> ${formatMono(size)}\n`;
      text += `✅ <b>Status:</b> ${formatMono("Finished!")}\n`;
      if (duration) text += `⏱ <b>Duration:</b> ${formatMono(duration)}\n`;
      if (folderTree) {
        const folderEmoji = folderTree.folderEmoji || "📂";
        const folderDisplay = truncateFolderName(folderTree.name);
        const folderLink = folderTree.url
          ? `<a href="${esc(folderTree.url)}">${esc(folderDisplay)}</a>`
          : `<b>${esc(folderDisplay)}</b>`;
        const folderSize = folderTree.size ? ` ${formatMono(folderTree.size)}` : "";
        text += `\n${folderEmoji} ${folderLink}${folderSize}\n`;
        if (Array.isArray(folderTree.children) && folderTree.children.length > 0) {
          for (const child of folderTree.children) {
            const fe = getFileEmoji(child.name);
            const fd = truncateFileName(child.name);
            const fl = child.url
              ? `<a href="${esc(child.url)}">${esc(fd)}</a>`
              : formatMono(fd);
            const fs = child.size ? ` ${formatMono(child.size)}` : "";
            text += `  ${fe} ${fl}${fs}\n`;
          }
        }
      }
      return text;
    }
    
    buildKeyboard(type, data = {}) {
        const kb = { inline_keyboard: [] };
        switch (type) {
            case "confirm_wipe":
                kb.inline_keyboard = [[
                    { text: "✅ Confirm Wipe", callback_data: `wipe_confirm:${data.id}` },
                    { text: "❌ Cancel", callback_data: "wipe_cancel" },
                ]];
                break;
            case "confirm_wipe_all":
                kb.inline_keyboard = [[
                    { text: "✅ Confirm Wipe ALL", callback_data: "wipe_all_confirm" },
                    { text: "❌ Cancel", callback_data: "wipe_cancel" },
                ]];
                break;
            case "confirm_wipe_multi":
                kb.inline_keyboard = [[
                    { text: `✅ Confirm Wipe All`, callback_data: `wipe_multi_confirm:${data.ids}` },
                    { text: "❌ Cancel", callback_data: "wipe_cancel" },
                ]];
                break;
            case "confirm_rmAdmin":
                kb.inline_keyboard = [[
                    { text: "✅ Remove", callback_data: `rmadmin_confirm:${data.userId}` },
                    { text: "❌ Cancel", callback_data: "rmadmin_cancel" },
                ]];
                break;
            case "confirm_dump":
                kb.inline_keyboard = [[
                    { text: "✅ Confirm Reset", callback_data: "dump_confirm" },
                    { text: "❌ Cancel", callback_data: "dump_cancel" },
                ]];
                break;
            case "folders_page": {
                const row = [];
                if (data.page > 0) row.push({ text: "⬅️ Prev", callback_data: `folders_page:${data.page - 1}` });
                if (data.hasNext) row.push({ text: "Next ➡️", callback_data: `folders_page:${data.page + 1}` });
                if (row.length > 0) kb.inline_keyboard = [row];
                break;
            }
        }
        return kb;
    }
}

// ──────────────────────────────────────────────────────────────
//  TelegramAPI
// ──────────────────────────────────────────────────────────────
class TelegramAPI {
    constructor(env) {
        this.token = env.BOT_TOKEN;
        this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    }

    async callApi(method, payload) {
        const resp = await fetch(`${this.apiUrl}/${method}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return resp.json();
    }

    async sendMessage(chatId, text, keyboard = null, replyToMessageId = null) {
        const payload = {
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
        };
        if (replyToMessageId) payload.reply_to_message_id = replyToMessageId;
        if (keyboard) payload.reply_markup = keyboard;
        return this.callApi("sendMessage", payload);
    }

    async editMessageText(chatId, messageId, text, keyboard = null) {
        const payload = {
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
        };
        if (keyboard) payload.reply_markup = keyboard;
        return this.callApi("editMessageText", payload);
    }

    async answerCallbackQuery(callbackQueryId, text = "") {
        return this.callApi("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
    }

    async setMyCommands(commands) {
        return this.callApi("setMyCommands", { commands });
    }
    
    async setMenuButton(chatId = null) {
        return this.callApi("setChatMenuButton", {
            menu_button: {
                type: "commands"
            }
        });
    }    
}

// ──────────────────────────────────────────────────────────────
//  GitHubAPI
// ──────────────────────────────────────────────────────────────
class GitHubAPI {
    constructor(env) {
        this.token = env.MY_GH_TOKEN;
        this.repoOwner = env.REPO_OWNER;
        this.repoName = env.REPO_NAME;
        this.dispatchUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/dispatches`;
        this.contentsUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
        this.actionsUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/actions/runs`;
    }

    _headers() {
        return {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Cloudflare-Worker-Bot",
        };
    }

    async triggerWorkflow(eventType, clientPayload) {
        const resp = await fetch(this.dispatchUrl, {
            method: "POST",
            headers: this._headers(),
            body: JSON.stringify({ event_type: eventType, client_payload: clientPayload }),
        });
        return resp.status === 204;
    }

    async sendDownloadRequest(task) {
        return this.triggerWorkflow("start_download", {
            url: task.url,
            tg_chat_id: task.chatId,
            tg_message_id: task.statusMessageId,
        });
    }

    /**
     * Send wipe request to GitHub Actions.
     * @param {string} path      - actual repo path, e.g. "downloads/FolderName"
     * @param {string|null} chatId     - Telegram chat id for notification (optional)
     * @param {string|null} messageId  - Telegram message id for notification (optional)
     */
    async sendWipeRequest(path, chatId = null, messageId = null) {
        return this.triggerWorkflow("wipe_storage", {
            target_path: path,
            tg_chat_id: chatId || "",
            tg_message_id: messageId || "",
        });
    }

    async sendSyncRequest() {
        return this.triggerWorkflow("sync_files", {});
    }

    async stopAllRuns() {
        const resp = await fetch(`${this.actionsUrl}?status=in_progress&per_page=20`, {
            headers: this._headers(),
        });
        if (!resp.ok) return { cancelled: 0, errors: 1 };
        const data = await resp.json();
        const runs = data.workflow_runs || [];
        let cancelled = 0, errors = 0;
        for (const run of runs) {
            const cancelResp = await fetch(
                `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/actions/runs/${run.id}/cancel`,
                { method: "POST", headers: this._headers() }
            );
            if (cancelResp.status === 202) cancelled++;
            else errors++;
        }
        const resp2 = await fetch(`${this.actionsUrl}?status=queued&per_page=20`, {
            headers: this._headers(),
        });
        if (resp2.ok) {
            const data2 = await resp2.json();
            for (const run of (data2.workflow_runs || [])) {
                const cr = await fetch(
                    `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/actions/runs/${run.id}/cancel`,
                    { method: "POST", headers: this._headers() }
                );
                if (cr.status === 202) cancelled++;
                else errors++;
            }
        }
        return { cancelled, errors, total: runs.length };
    }

    async getContents(path = "") {
        const resp = await fetch(`${this.contentsUrl}/${path}`, { headers: this._headers() });
        if (!resp.ok) return null;
        return resp.json();
    }

    async buildDownloadsTree() {
        return this._buildTree("downloads");
    }

    async _buildTree(path) {
        const items = await this.getContents(path);
        if (!Array.isArray(items)) return [];
        const result = [];
        for (const item of items) {
            if (item.type === "dir") {
                const children = await this._buildTree(item.path);
                const folderSize = this._sumSize(children);
                result.push({
                    type: "folder",
                    name: item.name,
                    url: item.html_url,
                    size: folderSize ? this._formatBytes(folderSize) : null,
                    rawSize: folderSize,
                    children,
                });
            } else if (item.type === "file") {
                result.push({
                    type: "file",
                    name: item.name,
                    url: item.download_url || item.html_url,
                    size: item.size ? this._formatBytes(item.size) : null,
                    rawSize: item.size || 0,
                });
            }
        }
        return result;
    }

    _sumSize(nodes) {
        return (nodes || []).reduce((acc, n) => acc + (n.rawSize || 0), 0);
    }

// الان — فاصله داره و MiB نیست ولی بعداً از sync.yml میاد
    _formatBytes(bytes) {
        if (bytes === 0) return "0B";
        const k = 1000; // ← از 1024 به 1000 عوض کن (SI units = MB نه MiB)
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + sizes[i]; // ← فاصله حذف شد
    }
}

// ──────────────────────────────────────────────────────────────
//  URL Validator
// ──────────────────────────────────────────────────────────────
function validateUrl(raw) {
    if (!raw || typeof raw !== "string") return { valid: false, reason: "no_input" };
    const trimmed = raw.trim();
    if (!trimmed) return { valid: false, reason: "empty" };
    try {
        const parsed = new URL(trimmed);
        if (!["http:", "https:", "ftp:"].includes(parsed.protocol))
            return { valid: false, reason: "bad_protocol" };
        if (!parsed.hostname || parsed.hostname.length < 3)
            return { valid: false, reason: "bad_host" };
        return { valid: true, url: trimmed };
    } catch {
        return { valid: false, reason: "parse_error" };
    }
}

// ──────────────────────────────────────────────────────────────
//  /folders — flat list (folders + direct files under downloads)
//  Each item shows: [number] [emoji] [hyperlinked name] [size]
// ──────────────────────────────────────────────────────────────
const FOLDERS_PAGE_SIZE = 10;

function buildFoldersPage(tree, page = 0) {
  let totalRaw = 0;
  for (const node of tree) totalRaw += (node.rawSize || 0);
  const k = 1024;
  const szNames = ["B","KB","MB","GB","TB"];
  const si = totalRaw > 0 ? Math.floor(Math.log(totalRaw) / Math.log(k)) : 0;
  const totalSize = totalRaw > 0
    ? parseFloat((totalRaw / Math.pow(k, si)).toFixed(2)) + " " + szNames[si]
    : "0 B";

  const start = page * FOLDERS_PAGE_SIZE;
  const slice = tree.slice(start, start + FOLDERS_PAGE_SIZE);
  const hasNext = tree.length > start + FOLDERS_PAGE_SIZE;
  const totalPages = Math.ceil(tree.length / FOLDERS_PAGE_SIZE) || 1;

  let text = `📂 <b>Downloads</b>  ${formatMono(totalSize)}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;

  if (tree.length === 0) {
    text += "\n<i>No files found. Run /sync to refresh.</i>";
  } else {
    text += "\n";
    for (const node of slice) {
      const sizeStr = node.size ? `  ${formatMono(node.size)}` : "";
      if (node.type === "folder") {
        const emoji = node.folderEmoji || "📁";
        const displayName = truncateFolderName(node.name);
        const link = node.url
          ? `<a href="${esc(node.url)}">${esc(displayName)}</a>`
          : `<b>${esc(displayName)}</b>`;
        text += `${emoji} ${link}${sizeStr}\n`;
      } else {
        const emoji = getFileEmoji(node.name);
        const displayName = truncateFileName(node.name);
        const link = node.url
          ? `<a href="${esc(node.url)}">${esc(displayName)}</a>`
          : `<code>${esc(displayName)}</code>`;
        text += `${emoji} ${link}${sizeStr}\n`;
      }
    }
  }
  if (totalPages > 1) text += `\n<i>Page ${page + 1} of ${totalPages}</i>`;
  return { text, hasNext, page };
}

// ──────────────────────────────────────────────────────────────
//  CommandHandler
// ──────────────────────────────────────────────────────────────
class CommandHandler {
    constructor(env, telegram, kv, ui, github) {
        this.env = env;
        this.telegram = telegram;
        this.kv = kv;
        this.ui = ui;
        this.github = github;
        this.ownerId = String(env.OWNER_ID);
    }

    async getBotId() {
        let botId = await this.kv.kv.get("BOT_ID_CACHE");
        if (!botId) {
            const resp = await this.telegram.callApi("getMe", {});
            if (resp.ok) {
                botId = String(resp.result.id);
                await this.kv.kv.put("BOT_ID_CACHE", botId);
            }
        }
        return botId;
    }

    async registerBotCommands() {
      // دستورات عمومی (برای همه)
      const publicCommands = [
        { command: "start",   description: "Bot status" },
        { command: "link",    description: "Queue a download link" },
        { command: "queue",   description: "View download queue" },
        { command: "folders", description: "Browse downloaded files" },
        { command: "folder",  description: "Show a specific folder" },
        { command: "sync",    description: "Sync file list from GitHub" },
        { command: "help",    description: "Show available commands" },
      ];
      // دستورات اونر (فقط در چت خصوصی اونر نمایش داده میشه)
      const ownerCommands = [
        ...publicCommands,
        { command: "admins",      description: "List admins" },
        { command: "addadmin",    description: "Add admin" },
        { command: "rmadmin",     description: "Remove admin" },
        { command: "wipe",        description: "Delete files" },
        { command: "kv",          description: "View KV store" },
        { command: "rmkey",       description: "Clear a KV key" },
        { command: "dump_memory", description: "Reset queue/state" },
        { command: "stop",        description: "Stop GitHub Actions" },
        { command: "groups",      description: "List authorized groups" },
        { command: "addgroup",    description: "Add group" },
        { command: "rmgroup",     description: "Remove group" },
      ];
      // ست کردن برای اونر (private chat scope)
      await this.telegram.callApi("setMyCommands", {
        commands: ownerCommands,
        scope: { type: "chat", chat_id: Number(this.ownerId) },
      });
      // ست کردن برای همه پیوی‌ها (غیر از اونر)
      await this.telegram.callApi("setMyCommands", {
        commands: publicCommands,
        scope: { type: "all_private_chats" },
      });
      // ست کردن برای همه گروه‌ها
      await this.telegram.callApi("setMyCommands", {
        commands: publicCommands,
        scope: { type: "all_group_chats" },
      });
      // default scope به عنوان fallback
      await this.telegram.callApi("setMyCommands", {
        commands: publicCommands,
        scope: { type: "default" },
      });
      await this.telegram.setMenuButton();
    }
        
    async handleWipeCommand(message, args) {
        const chatId = message.chat.id;
        const msgId = message.message_id;
    
        // حالت حذف کل
        if (args[0] === ".") {
            await this.github.dispatch("wipe_storage", {
                target_path: "downloads/",
                tg_chat_id: String(chatId),
                tg_message_id: String(msgId)
            });
            return this.telegram.sendMessage(chatId, "🗑 Wipe request for <b>all downloads</b> sent.");
        }
    
        // گرفتن دیتای فعلی از متد شما
        const tree = await this.kv.getTreeCache();
        const idsToWipe = args.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    
        if (idsToWipe.length === 0) {
            return this.telegram.sendMessage(chatId, "❌ Please provide IDs. (e.g., <code>/wipe 1 5</code>)");
        }
    
        const paths = [];
        for (const id of idsToWipe) {
            const target = tree.find(n => n.id === id);
            if (target && target.url) {
                // استخراج مسیر پوشه از URL
                const urlParts = target.url.split("downloads/");
                if (urlParts.length > 1) {
                    const folderName = urlParts[1].split("/")[0];
                    paths.push(`downloads/${folderName}`);
                }
            }
        }
    
        if (paths.length === 0) {
            return this.telegram.sendMessage(chatId, "❌ IDs not found in cache.");
        }
    
        // ارسال لیست مسیرها به گیت‌هاب
        await this.github.dispatch("wipe_storage", {
            target_path: paths.join(","),
            tg_chat_id: String(chatId),
            tg_message_id: String(msgId)
        });
    
        await this.telegram.sendMessage(chatId, `⏳ Wipe initiated for IDs: ${idsToWipe.join(", ")}`);
    }
        

    // ── startNextTask (called after queue pop) ────────────────
    async startNextTask(task) {
        const setupText = this.ui.formatStatusMessage({
            status: "⚙️Starting Github Actions…",
            fileName: null, progress: null, size: null,
        });

        let statusMessageId = null;

        // FIX: if the task has a queue reply message, edit it into a status message
        if (task.queueMessageId) {
            const editResult = await this.telegram.editMessageText(
                task.chatId, task.queueMessageId, setupText
            );
            if (editResult?.ok) {
                statusMessageId = task.queueMessageId;
            }
        }

        // Fallback: send a fresh message if edit failed or no queueMessageId
        if (!statusMessageId) {
            const sentMsg = await this.telegram.sendMessage(task.chatId, setupText, null, null);
            if (!sentMsg?.ok) return;
            statusMessageId = sentMsg.result.message_id;
        }

        const activeTask = { ...task, status: "Downloading", statusMessageId };
        await this.kv.setCurrentTask(activeTask);
        await this.github.sendDownloadRequest(activeTask);
    }

    // ── updateQueuePositionMessages ───────────────────────────
    // After a task starts, tell remaining queued users their new position
    async updateQueuePositionMessages(queue) {
        // اگر صفی وجود نداشت کاری نکن
        if (!queue || queue.length === 0) return;
    
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            
            // اگر موقع Queue کردن، آیدی پیام را ذخیره نکرده باشیم، رد شو
            if (!item.queueMessageId) continue;
    
            const pos = i + 1; // رتبه جدید
            const total = queue.length; // تعداد کل افراد باقی‌مانده در صف
            const text = `📬 <b>Link queued!</b> You're <b>${pos}/${total}</b> in the queue.`;
    
            try {
                // آپدیت پیام کاربر در تلگرام
                await this.telegram.editMessageText(item.chatId, item.queueMessageId, text);
            } catch (e) {
                // اگر کاربر پیام را پاک کرده باشد یا تلگرام خطا دهد، نادیده بگیر تا حلقه متوقف نشود
                console.log("Error updating queue msg:", e.message);
            }
        }
    }

    // ── processLink ───────────────────────────────────────────
    async processLink(rawUrl, chatId, replyToMsgId, userId) {
        const validation = validateUrl(rawUrl);
        if (!validation.valid) {
            const msgs = {
                no_input: "❌ No link provided. Usage: <code>/link URL</code>",
                empty: "❌ Empty link.",
                bad_protocol: "❌ Invalid protocol. Only http/https/ftp allowed.",
                bad_host: "❌ Invalid host. Please send a valid URL.",
                parse_error: "❌ Invalid URL. Example: <code>https://example.com/file.mp4</code>",
            };
            return this.telegram.sendMessage(chatId, msgs[validation.reason] || "❌ Invalid link.", null, replyToMsgId);
        }
    
        const url = validation.url;
        const queue = await this.kv.getQueue();
        const currentTask = await this.kv.getCurrentTask();
    
        if (currentTask?.url === url || queue.some(item => item.url === url)) {
            const pos = queue.findIndex(item => item.url === url);
            const posText = pos >= 0
                ? `\n📍 <b>Queue position:</b> ${pos + 1} of ${queue.length}`
                : "\n🔄 <b>Status:</b> Currently processing";
            return this.telegram.sendMessage(
                chatId,
                `⚠️ <b>Duplicate link detected!</b>\nThis URL is already in the pipeline.${posText}`,
                null, replyToMsgId
            );
        }
    
        const taskData = { url, chatId, userId, status: "Queued", timestamp: Date.now() };
    
        if (!currentTask) {
            // ── هیچ تسکی در حال اجرا نیست → مستقیم شروع کن ──
            const sentMsg = await this.telegram.sendMessage(
                chatId,
                this.ui.formatStatusMessage({ status: "⚙️Starting Github Actions…", fileName: null, progress: null, size: null }),
                null, replyToMsgId
            );
            if (!sentMsg?.ok) {
                return this.telegram.sendMessage(chatId, "❌ Failed to send status message.");
            }
            const statusMessageId = sentMsg.result.message_id;
            const activeTask = { ...taskData, status: "Downloading", statusMessageId };
            await this.kv.setCurrentTask(activeTask);
            await this.github.sendDownloadRequest(activeTask);
        } else {
            // ── یه تسک داره اجرا میشه → به صف اضافه کن ──
            await this.kv.addToQueue(taskData);
            const updatedQueue = await this.kv.getQueue();
    
            // pos و total هر دو از updatedQueue میان (بعد از اضافه شدن لینک جدید)
            const pos = updatedQueue.length;       // ← جدیدترین آیتم = آخر صف
            const total = updatedQueue.length;     // ← کل صف
    
            const text = `📬 <b>Link queued!</b> You're <b>${pos}/${total}</b> in the queue.`;
            const sent = await this.telegram.sendMessage(chatId, text, null, replyToMsgId);
    
            if (sent?.ok) {
                // ذخیره queueMessageId روی آیتم آخر صف
                updatedQueue[pos - 1].queueMessageId = sent.result.message_id;
                await this.kv.kv.put("queue_list", JSON.stringify(updatedQueue));
    
                // ✅ آپدیت پیام همه لینک‌های قبلی توی صف (مثلاً 1/1 → 1/2)
                await this.updateQueuePositionMessages(updatedQueue);
            }
            return sent;
        }
    }
    // ── handleUpdate ──────────────────────────────────────────
    async handleUpdate(update) {
        const myBotId = await this.getBotId();

        if (update.message?.new_chat_members) {
            const isBotAdded = update.message.new_chat_members.some(m => String(m.id) === myBotId);
            if (isBotAdded && String(update.message.from.id) === this.ownerId) {
                const chatId = String(update.message.chat.id);
                const groups = await this.kv.getAllowedGroups();
                if (!groups.includes(chatId)) {
                    groups.push(chatId);
                    await this.kv.setAllowedGroups(groups);
                    await this.telegram.sendMessage(chatId, "✅ This group has been authorized by the Owner.");
                }
            }
            return;
        }

        if (update.callback_query) {
            return this.processCallback(update.callback_query);
        }

        if (!update.message) return;

        const { text, chat, message_id, from } = update.message;
        if (!text) return;

        const chatId = String(chat.id);
        const userId = String(from.id);

        if (chat.type !== "private") {
            const allowedGroups = await this.kv.getAllowedGroups();
            if (!allowedGroups.includes(chatId)) return;
        }

        const isAdmin = await this.kv.isAdmin(userId);
        const isOwner = userId === this.ownerId;
        const command = text.split(" ")[0].toLowerCase().split("@")[0];

        if (OWNER_ONLY_COMMANDS.has(command) && !isOwner) return;

        if (chat.type === "private" && !isAdmin && !isOwner) return;

        // فقط وقتی دستور /link اجرا شود، پردازش شروع می‌شود
        if (command === "/link") {
            if (!isAdmin && !isOwner) return; // چک کردن دسترسی
            
            const url = text.split(" ").slice(1).join(" ").trim();
            if (url) {
                // فرستادن به متد هوشمند پردازش لینک و صف
                return this.processLink(url, chatId, message_id, userId);
            } else {
                // اگر فقط نوشته بود /link و لینکی جلوش نبود
                await this.telegram.sendMessage(chatId, "⚠️ Please provide a link after the command.\nUsage: <code>/link https://...</code>", null, message_id);
            }
        }
        
        if (!text.startsWith("/")) return;

        return this.processCommand(command, text, chatId, message_id, userId, isOwner, isAdmin);
    }

    // ── processCommand ────────────────────────────────────────
    async processCommand(command, text, chatId, messageId, userId, isOwner, isAdmin) {
        switch (command) {
            case "/start": {
              const currentTask = await this.kv.getCurrentTask();
              const queue = await this.kv.getQueue();
              let statusLine = "😴 Idle — ready for links!";
              if (currentTask) statusLine = `⚡ Processing 1 download + ${queue.length} in queue`;
              return this.telegram.sendMessage(
                chatId,
                `🤖 <b>Download Bot Ready!</b>\n\n${statusLine}\n\nSend a link or use /link URL`,
                null, messageId
              );
            }
            
            case "/folders": {
                const tree = await this.kv.getTreeCache();
                const { text: pageText, hasNext, page } = buildFoldersPage(tree, 0);
                const kb = this.ui.buildKeyboard("folders_page", { page: 0, hasNext });
                return this.telegram.sendMessage(
                    chatId,
                    pageText,
                    kb.inline_keyboard.length > 0 ? kb : null,
                    messageId   // ← null رو حذف کن، مستقیم messageId بذار
                );
            }

            case "/folder": {
              const folderName = text.split(" ").slice(1).join(" ").trim();
              if (!folderName) return this.telegram.sendMessage(chatId, "⚠️ Usage: <code>/folder folder_name</code>", null, messageId);
              const tree = await this.kv.getTreeCache();
              const found = tree.find(n => n.type === "folder" && n.name === folderName);
              if (!found) return this.telegram.sendMessage(chatId, `❌ Folder <b>${esc(folderName)}</b> not found.`, null, messageId);
              const folderEmoji = "📂";
              const folderDisplay = truncateFolderName(found.name);
              const folderSize = found.size ? ` ${formatMono(found.size)}` : "";
              let txt = `${folderEmoji} <b>${esc(folderDisplay)}</b>${folderSize}\n`;
              if (Array.isArray(found.children)) {
                for (const child of found.children) {
                  const fe = getFileEmoji(child.name);
                  const fd = truncateFileName(child.name);
                  const fl = child.url
                    ? `<a href="${esc(child.url)}">${esc(fd)}</a>`
                    : formatMono(fd);
                  const fs = child.size ? ` ${formatMono(child.size)}` : "";
                  txt += `  ${fe} ${fl}${fs}\n`;
                }
              }
              return this.telegram.sendMessage(chatId, txt, null, messageId);
            }
            
            case "/queue": {
                const queue = await this.kv.getQueue();
                const current = await this.kv.getCurrentTask();
                return this.telegram.sendMessage(chatId, this.ui.formatQueue(queue, current), null, messageId);
            }

            case "/sync": {
                const msg = await this.telegram.sendMessage(chatId, "🔄 Syncing with GitHub…", null, messageId);
                try {
                    const rawTree = await this.github.buildDownloadsTree();
                    // updateTreeCache assigns ids and folderEmoji
                    const tree = await this.kv.updateTreeCache(rawTree);
                    await this.telegram.editMessageText(
                        chatId, msg.result.message_id,
                        `✅ Sync complete. <b>${tree.length}</b> item(s) found in <code>downloads/</code>.`
                    );
                } catch (e) {
                    await this.telegram.editMessageText(chatId, msg.result.message_id, `❌ Sync error: ${esc(e.message)}`);
                }
                return;
            }

            case "/help":
                return this.handleHelp(chatId, isOwner);

            case "/kv":
            case "/admins":
            case "/addadmin":
            case "/rmadmin":
            case "/wipe":
            case "/dump_memory":
            case "/rmkey":
            case "/stop":
            case "/groups":
            case "/addgroup":
            case "/rmgroup":
                return this.processOwnerCommand(command, text, chatId, messageId, isOwner);

            default:
                return;
        }
    }

    // ── handleHelp ────────────────────────────────────────────
    async handleHelp(chatId, isOwner, replyToMsgId = null) {
      let text;
      if (isOwner) {
        text = `🛠 <b>Owner Commands</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
        text += `/admins — List all admins\n/addadmin &lt;ID&gt; — Add admin\n/rmadmin &lt;ID&gt; — Remove admin\n`;
        text += `/wipe &lt;num&gt; — Delete item(s) by number\n/wipe . — Wipe entire downloads\n`;
        text += `/kv — View KV store\n/rmkey &lt;key&gt; — Clear a KV key\n`;
        text += `/dump_memory — Reset queue & state\n/stop — Stop all GitHub Actions\n`;
        text += `/groups — List authorized groups\n/addgroup &lt;ID&gt; — Add group\n/rmgroup &lt;ID&gt; — Remove group\n`;
        text += `\n👥 <b>General Commands</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
      } else {
        text = `📖 <b>Available Commands</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
      }
      text += `/start — Bot status\n/link &lt;URL&gt; — Queue a download\n`;
      text += `/queue — View download queue\n/folders — Browse downloaded files\n`;
      text += `/folder &lt;name&gt; — View folder contents\n/sync — Refresh file list\n/help — This help\n`;
      return this.telegram.sendMessage(chatId, text, null, replyToMsgId);
    }
        // ── processOwnerCommand ───────────────────────────────────
    async processOwnerCommand(command, text, chatId, messageId, isOwner) {
        if (!isOwner) return;

        switch (command) {
            case "/admins": {
                const admins = await this.kv.getAdmins();
                let msg = `👑 <b>Admin List</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
                msg += `🔑 <b>Owner:</b> <code>${this.ownerId}</code>\n\n`;
                if (admins.length === 0) {
                    msg += "<i>No admins added yet.</i>";
                } else {
                    admins.forEach((id, i) => { msg += `${i + 1}. <code>${id}</code>\n`; });
                }
                return this.telegram.sendMessage(chatId, msg, null, messageId);
            }

            case "/addadmin": {
                const newId = text.split(" ")[1]?.trim();
                if (!newId) return this.telegram.sendMessage(chatId, "⚠️ Usage: <code>/addAdmin &lt;numeric_ID&gt;</code>", null, messageId);
                if (!/^\d+$/.test(newId)) {
                    return this.telegram.sendMessage(chatId, `❌ Invalid ID: <code>${esc(newId)}</code>\n<i>Only numeric Telegram user IDs are accepted.</i>`, null, messageId);
                }
                if (newId === this.ownerId) return this.telegram.sendMessage(chatId, "ℹ️ You (Owner) already have full access.", null, messageId);
                await this.kv.addAdmin(newId);
                return this.telegram.sendMessage(chatId, `✅ Admin added: <code>${newId}</code>`);
            }

            case "/rmadmin": {
                const rmId = text.split(" ")[1]?.trim();
                if (!rmId) return this.telegram.sendMessage(chatId, "⚠️ Usage: <code>/rmAdmin &lt;numeric_ID&gt;</code>", null, messageId);
                if (!/^\d+$/.test(rmId)) {
                    return this.telegram.sendMessage(chatId, `❌ Invalid ID: <code>${esc(rmId)}</code>\n<i>Only numeric Telegram user IDs are accepted.</i>`, null, messageId);
                }
                const admins = await this.kv.getAdmins();
                if (!admins.map(String).includes(rmId)) {
                    return this.telegram.sendMessage(chatId, `⚠️ ID <code>${rmId}</code> is not in the admin list.`, null, messageId);
                }
                const kb = this.ui.buildKeyboard("confirm_rmAdmin", { userId: rmId });
                return this.telegram.sendMessage(chatId, `❓ Remove admin <code>${rmId}</code>?`, kb, mesaageId);
            }

            // ── /wipe [numbers...] or /wipe . ─────────────────────
            case "/wipe": {
                const args = text.split(" ").slice(1).filter(s => s.trim() !== "");

                // /wipe . → wipe entire downloads folder
                if (args.length === 1 && args[0] === ".") {
                    const kb = this.ui.buildKeyboard("confirm_wipe_all");
                    return this.telegram.sendMessage(
                        chatId,
                        `⚠️ <b>Wipe ENTIRE downloads folder?</b>\n\nThis will delete <b>ALL files and folders</b> inside <code>downloads/</code>.\n\n⛔ This cannot be undone.`,
                        kb
                    );
                }

                if (args.length === 0) {
                    // No argument → show numbered list for reference
                    const tree = await this.kv.getTreeCache();
                    if (tree.length === 0) {
                        return this.telegram.sendMessage(chatId, "📂 Downloads folder is empty. Run /sync first.", null, messageId);
                    }
                    let msg = `🗑 <b>Wipe — Select item(s) to delete</b>\n`;
                    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;                   
                    // جدید:
                    msg += `Usage:\n`;
                    msg += `  ${formatMono("/wipe 1")} — delete item #01\n`;
                    msg += `  ${formatMono("/wipe 1 3 5")} — delete multiple items\n`;
                    msg += `  ${formatMono("/wipe .")} — wipe <b>entire</b> downloads folder\n\n`;
                    for (const node of tree) {
                        const emoji = node.folderEmoji || (node.type === "folder" ? "📁" : getFileEmoji(node.name));
                        const name = node.type === "folder" ? truncateFolderName(node.name) : truncateFileName(node.name);
                        const sizeStr = node.size ? `  <i>${esc(node.size)}</i>` : "";
                        const numStr = String(node.id).padStart(2, "0");
                        msg += `<code>#${numStr}</code> ${emoji} ${esc(name)}${sizeStr}\n`;
                    }
                    return this.telegram.sendMessage(chatId, msg, null, messageId);
                }

                // Parse all numeric args, dedup
                const tree = await this.kv.getTreeCache();
                const uniqueIds = [...new Set(args.map(a => parseInt(a, 10)).filter(n => !isNaN(n)))];

                if (uniqueIds.length === 0) {
                    return this.telegram.sendMessage(
                        chatId,
                        `❌ Invalid argument(s). Usage: <code>/wipe &lt;number&gt; [number2] …</code>\nSend /wipe alone to see the list.`, null, messageId
                    );
                }

                // Find all valid targets
                const targets = uniqueIds.map(id => tree.find(n => n.id === id)).filter(Boolean);
                const notFound = uniqueIds.filter(id => !tree.find(n => n.id === id));

                if (targets.length === 0) {
                    return this.telegram.sendMessage(
                        chatId,
                        `❌ None of the given number(s) were found.\nRun /wipe to see current items.`, null, messageId
                    );
                }

                if (targets.length === 1) {
                    // Single item — use confirm keyboard
                    const target = targets[0];
                    const emoji = target.folderEmoji || (target.type === "folder" ? "📁" : getFileEmoji(target.name));
                    const kb = this.ui.buildKeyboard("confirm_wipe", { id: target.id });
                    let msg = `⚠️ <b>Confirm deletion?</b>\n\n${emoji} <code>${esc(target.name)}</code>${target.size ? `  <i>${esc(target.size)}</i>` : ""}\n\nThis cannot be undone.`;
                    if (notFound.length > 0) {
                        msg += `\n\n<i>⚠️ Not found: #${notFound.join(", #")}</i>`;
                    }
                    return this.telegram.sendMessage(chatId, msg, kb);
                }

                // Multiple items — confirm with multi-wipe callback
                const ids = targets.map(t => t.id).join(",");
                const kb = this.ui.buildKeyboard("confirm_wipe_multi", { ids });
                let msg = `⚠️ <b>Confirm deletion of ${targets.length} item(s)?</b>\n\n`;
                for (const t of targets) {
                    const emoji = t.folderEmoji || (t.type === "folder" ? "📁" : getFileEmoji(t.name));
                    msg += `${emoji} <code>${esc(t.name)}</code>${t.size ? `  <i>${esc(t.size)}</i>` : ""}\n`;
                }
                msg += `\nThis cannot be undone.`;
                if (notFound.length > 0) {
                    msg += `\n\n<i>⚠️ Not found: #${notFound.join(", #")}</i>`;
                }
                return this.telegram.sendMessage(chatId, msg, kb);
            }

            case "/dump_memory": {
                const kb = this.ui.buildKeyboard("confirm_dump");
                return this.telegram.sendMessage(chatId, "⚠️ <b>Reset all queue and processing state?</b>\nThis will clear current task and queue.", kb, messageId);
            }

            case "/kv": {
              const allData = await this.kv.getKV();
              // ترتیب دلخواه
              const ordered = {
                admins_list: allData.admins_list,
                allowed_groups: allData.allowed_groups,
                queue_list: allData.queue_list,
                current_task: allData.current_task,
                tree_cache: (allData.tree_cache || []).map(n => ({
                  id: n.id, type: n.type, name: n.name,
                  size: n.size, rawSize: n.rawSize,
                  url: n.url, folderEmoji: n.folderEmoji,
                  children: (n.children || []).map(c => ({
                    type: c.type, name: c.name,
                    size: c.size, rawSize: c.rawSize, url: c.url,
                  })),
                })),
              };
              const json = JSON.stringify(ordered, null, 2);
              const PAGE_SIZE = 1500;
              const lines = json.split("\n");
              // تقسیم بر اساس خط (max 50 خط یا 1500 کاراکتر)
              const pages = [];
              let cur = [];
              let curLen = 0;
              for (const line of lines) {
                if (cur.length >= 50 || curLen + line.length > PAGE_SIZE) {
                  pages.push(cur.join("\n"));
                  cur = []; curLen = 0;
                }
                cur.push(line);
                curLen += line.length + 1;
              }
              if (cur.length) pages.push(cur.join("\n"));
              // ذخیره صفحات در KV موقت
              await this.kv.kv.put("kv_pages_cache", JSON.stringify(pages), { expirationTtl: 300 });
              const kb = pages.length > 1 ? {
                inline_keyboard: [[{ text: "Next ➡️", callback_data: "kv_page:1" }]]
              } : null;
              return this.telegram.sendMessage(
                chatId,
                `🗄 <b>KV Store (1/${pages.length})</b>\n<pre>${esc(pages[0])}</pre>`,
                kb, messageId
              );
            }
            
            case "/rmkey": {
                const keyArg = text.split(" ")[1]?.trim();
                if (!keyArg) {
                    return this.telegram.sendMessage(chatId,
                        `⚠️ Usage: <code>/rmKey &lt;key_name&gt;</code>\n\nValid keys:\n` +
                        `<code>admins_list</code>\n<code>queue_list</code>\n<code>current_task</code>\n<code>tree_cache</code>\n<code>allowed_groups</code>`, null, messageId
                    );
                }
                const ok = await this.kv.clearKeyValue(keyArg);
                if (!ok) {
                    return this.telegram.sendMessage(chatId, `❌ Unknown key: <code>${esc(keyArg)}</code>`, null, messageId);
                }
                return this.telegram.sendMessage(chatId, `✅ Key <code>${esc(keyArg)}</code> value has been cleared (key preserved).`, null, messageId);
            }

            case "/stop": {
                const msg = await this.telegram.sendMessage(chatId, "⏹ <b>Stopping all GitHub Actions…</b>", null, messageId);
                try {
                    const result = await this.github.stopAllRuns();
                    let report = `⏹ <b>GitHub Actions — Stop Report</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
                    report += `✅ Cancelled: <b>${result.cancelled}</b>\n`;
                    report += `❌ Failed: <b>${result.errors}</b>\n`;
                    if (result.cancelled === 0 && result.errors === 0) {
                        report += `\n<i>No active runs found.</i>`;
                    }
                    await this.kv.resetQueueAndStatus();
                    report += `\n🧹 Queue and current task state cleared.`;
                    await this.telegram.editMessageText(chatId, msg.result.message_id, report);
                } catch (e) {
                    await this.telegram.editMessageText(chatId, msg.result.message_id, `❌ Error stopping runs: ${esc(e.message)}`);
                }
                return;
            }

            case "/groups": {
                const groups = await this.kv.getAllowedGroups();
                let msg = `🏢 <b>Authorized Groups</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
                if (groups.length === 0) msg += "<i>No groups authorized.</i>";
                else groups.forEach((id, i) => { msg += `${i + 1}. <code>${id}</code>\n`; });
                return this.telegram.sendMessage(chatId, msg, null, messageId);
            }

            case "/addgroup": {
                const newGroupId = text.split(" ")[1]?.trim();
                if (!newGroupId) {
                    return this.telegram.sendMessage(chatId, "⚠️ Usage: <code>/addGroup &lt;group_id&gt;</code>\n<i>Group IDs start with <code>-100</code></i>", null, messageId);
                }
                if (!/^-100\d+$/.test(newGroupId)) {
                    return this.telegram.sendMessage(chatId, `❌ Invalid group ID: <code>${esc(newGroupId)}</code>\n<i>Telegram group IDs must start with <code>-100</code> followed by digits.</i>`, null, messageId);
                }
                const groups = await this.kv.getAllowedGroups();
                if (groups.includes(newGroupId)) {
                    return this.telegram.sendMessage(chatId, `ℹ️ Group <code>${newGroupId}</code> is already authorized.`, null, messageId);
                }
                groups.push(newGroupId);
                await this.kv.setAllowedGroups(groups);
                return this.telegram.sendMessage(chatId, `✅ Group <code>${newGroupId}</code> added to authorized list.`, null, messageId);
            }

            case "/rmgroup": {
                const rmGroupId = text.split(" ")[1]?.trim();
                if (!rmGroupId) {
                    return this.telegram.sendMessage(chatId, "⚠️ Usage: <code>/rmGroup &lt;group_id&gt;</code>", null, messageId);
                }
                const groups = await this.kv.getAllowedGroups();
                if (!groups.includes(rmGroupId)) {
                    return this.telegram.sendMessage(chatId, `⚠️ Group <code>${esc(rmGroupId)}</code> is not in the authorized list.`, null, messageId);
                }
                const updated = groups.filter(id => id !== rmGroupId);
                await this.kv.setAllowedGroups(updated);
                return this.telegram.sendMessage(chatId, `✅ Group <code>${esc(rmGroupId)}</code> removed from authorized list.`, null, messageId);
            }
        }
    }

    // ── processCallback ───────────────────────────────────────
    async processCallback(callbackQuery) {
        const { data, message, id: cbId, from } = callbackQuery;
        const userId = String(from.id);
        const isOwner = userId === this.ownerId;
        const chatId = message.chat.id;
        const messageId = message.message_id;

        await this.telegram.answerCallbackQuery(cbId);

        const colonIdx = data.indexOf(":");
        const action = colonIdx >= 0 ? data.slice(0, colonIdx) : data;
        const targetData = colonIdx >= 0 ? data.slice(colonIdx + 1) : "";
        
        if (action === "kv_page") {
          const page = parseInt(targetData) || 0;
          const pages = (await this.kv.kv.get("kv_pages_cache", "json")) || [];
          if (!pages[page]) return;
          const hasPrev = page > 0;
          const hasNext = page < pages.length - 1;
          const row = [];
          if (hasPrev) row.push({ text: "⬅️ Prev", callback_data: `kv_page:${page - 1}` });
          if (hasNext) row.push({ text: "Next ➡️", callback_data: `kv_page:${page + 1}` });
          const kb = row.length > 0 ? { inline_keyboard: [row] } : null;
          await this.telegram.editMessageText(
            chatId, messageId,
            `🗄 <b>KV Store (${page + 1}/${pages.length})</b>\n<pre>${esc(pages[page])}</pre>`,
            kb
          );
          return;
        }     

        // Folders pagination — anyone allowed can page
        if (action === "folders_page") {
            const page = parseInt(targetData) || 0;
            const tree = await this.kv.getTreeCache();
            const { text: pageText, hasNext } = buildFoldersPage(tree, page);
            const kb = this.ui.buildKeyboard("folders_page", { page, hasNext });
            await this.telegram.editMessageText(chatId, messageId, pageText, kb.inline_keyboard.length > 0 ? kb : null);
            return;
        }

        if (!isOwner) {
            await this.telegram.answerCallbackQuery(cbId, "⛔ Owner only.");
            return;
        }

        switch (action) {
            case "rmadmin_confirm":
                await this.kv.removeAdmin(targetData);
                return this.telegram.editMessageText(chatId, messageId, `✅ Admin <code>${targetData}</code> removed.`);

            case "wipe_confirm": {
                const wipeId = parseInt(targetData, 10);
                const tree = await this.kv.getTreeCache();
                const target = tree.find(n => n.id === wipeId);
                if (!target) {
                    return this.telegram.editMessageText(chatId, messageId, `❌ Item <code>#${wipeId}</code> no longer exists.`);
                }
                const repoPath = `downloads/${target.name}`;
                       
                const dispatchResult = await this.github.sendWipeRequest(repoPath, chatId, messageId);
                
                await this.kv.deleteFromCacheById(wipeId);
                return this.telegram.editMessageText(
                    chatId, messageId,
                    `🗑 Wipe request sent for <code>${esc(target.name)}</code>.\nGitHub Actions will delete it from the repository and notify when done.`
                );
            }

            case "wipe_multi_confirm": {
                // targetData is comma-separated ids
                const ids = targetData.split(",").map(s => parseInt(s, 10)).filter(n => !isNaN(n));
                const uniqueIds = [...new Set(ids)];
                const tree = await this.kv.getTreeCache();
                const targets = uniqueIds.map(id => tree.find(n => n.id === id)).filter(Boolean);

                if (targets.length === 0) {
                    return this.telegram.editMessageText(chatId, messageId, `❌ None of the selected items exist anymore.`);
                }

                // FIX: send ONE dispatch with comma-separated paths (avoids concurrent git push conflicts)
                const paths = targets.map(t => `downloads/${t.name}`).join(",");
                await this.github.sendWipeRequest(paths, chatId, messageId);

                // Remove all from KV cache
                for (const target of targets) {
                    await this.kv.deleteFromCacheById(target.id);
                }

                const names = targets.map(t => `<code>${esc(t.name)}</code>`).join(", ");
                return this.telegram.editMessageText(
                    chatId, messageId,
                    `🗑 Wipe request sent for ${targets.length} item(s): ${names}.\nGitHub Actions will delete them from the repository.`
                );
            }

            case "wipe_all_confirm": {
                // Wipe entire downloads/ folder
                await this.github.sendWipeRequest("downloads", chatId, messageId);
                // Clear the entire tree cache
                await this.kv.updateTreeCache([]);
                return this.telegram.editMessageText(
                    chatId, messageId,
                    `🗑 Wipe request sent for entire <code>downloads/</code> folder.\nGitHub Actions will delete all contents and notify when done.`
                );
            }

            case "dump_confirm":
                await this.kv.resetQueueAndStatus();
                return this.telegram.editMessageText(chatId, messageId,
                    "✅ <b>Queue and state cleared.</b>\nBot is ready for new downloads."
                );

            case "wipe_cancel":
            case "rmadmin_cancel":
            case "dump_cancel":
                return this.telegram.editMessageText(chatId, messageId, "❌ Operation cancelled.");
        }
    }

    // ── handleWebhook (from GitHub Actions) ──────────────────
    async handleWebhook(request) {
        let payload;
        try {
            payload = await request.json();
        } catch {
            return new Response("Bad Request: invalid JSON", { status: 400 });
        }

        const { event, data } = payload;
        if (!data) return new Response("Bad Request: missing data", { status: 400 });

        const chatId = data.chatId || data.tg_chat_id;
        const statusMessageId = Number(data.messageId || data.tg_message_id);

        if (!chatId || !statusMessageId) {
            return new Response("Bad Request: missing chatId or messageId", { status: 400 });
        }

        switch (event) {
            // ── Progress update ────────────────────────────────
            case "progress_update": {
              const { progress, status, fileName, size, step, totalSteps, speed, remoteSize, uploadPart, totalParts } = data;
              const isUploading = typeof status === "string" && status.toLowerCase().includes("upload");
              const fileSizeBytes = Number(remoteSize || 0);
              const isLargeFile = fileSizeBytes >= 100 * 1024 * 1024;
              const isLargeUpload = isUploading && totalParts !== undefined && totalParts !== null && totalParts > 1;
              const text = this.ui.formatStatusMessage({
                status: status || "Processing...",
                fileName: fileName || null,
                progress: progress !== undefined ? progress : null,
                size: size || null,
                step: step || null,
                totalSteps: totalSteps || null,
                speed: speed || null,
                isUploading,
                isLargeFile,
                uploadPart: uploadPart !== undefined ? uploadPart : null,
                totalParts: totalParts !== undefined ? totalParts : null,
                isLargeUpload,
              });
              await this.telegram.editMessageText(chatId, statusMessageId, text);
              return new Response("OK", { status: 200 });
            }        
            case "task_completed": {
                const { folderTree, fileName, size, startedAt } = data;
                let duration = null;
                if (startedAt) duration = formatDuration(Date.now() - Number(startedAt));
            
                // ۱. نمایش پیام موفقیت آمیز در تلگرام
                if (folderTree) {
                    await this.kv.upsertFolderInCache(folderTree);
                    const finalMsg = this.ui.formatFinishedMessage({
                        fileName: fileName || folderTree.name,
                        size: folderTree.size || size || null,
                        folderTree,
                        duration,
                    });
                    await this.telegram.editMessageText(chatId, statusMessageId, finalMsg);
                } else {
                    await this.telegram.editMessageText(chatId, statusMessageId, "✅ <b>Operation completed successfully.</b>");
                }
            
                // ۲. پاکسازی تسک فعلی از KV
                await this.kv.clearCurrentTask();
            
                // ۳. برداشتن نفر بعدی از صف
                const { nextTask } = await this.kv.popQueue();
                
                // ۴. اگر کسی در صف بود، آن را شروع کن و پیام‌های بقیه را آپدیت کن
                if (nextTask) {
                    // شروع دانلود نفر بعدی (و ادیت کردن پیام Queued او به Processing)
                    await this.startNextTask(nextTask);  // ✅ درست
                    
                    // دریافت لیست باقی‌مانده و آپدیت کردن رتبه (مثلاً 5/11 به 4/10)
                    const remainingQueue = await this.kv.getQueue();
                    await this.updateQueuePositionMessages(remainingQueue);
                }
            
                return new Response("Task Finished", { status: 200 });
            }
            
                        // ── Wipe completed ────────────────────────────────
            case "wipe_completed": {
              const { tree: wipedTree, foldersDeleted, filesDeleted, sizeFreed, targetPath } = data;
              const tg_chat_id = data.chatId || data.tg_chat_id || chatId;
              const tg_msg_id = data.messageId || data.tg_message_id || statusMessageId;
            
              if (Array.isArray(wipedTree)) {
                await this.kv.updateTreeCache(wipedTree);
              }
            
              let msg = `🗑 <b>Wipe Complete!</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
              if (targetPath) msg += `📁 Path: ${formatMono(targetPath)}\n`;
              msg += `📂 Folders removed: ${formatMono(foldersDeleted ?? 0)}\n`;
              msg += `📄 Files removed: ${formatMono(filesDeleted ?? 0)}\n`;
              msg += `💾 Space freed: ${formatMono(sizeFreed || "0 B")}\n\n`;
              msg += `✅ <i>Cache synchronized.</i>`;
            
              // ادیت پیام اصلی
              try {
                await this.telegram.editMessageText(tg_chat_id, tg_msg_id, msg);
              } catch {
                await this.telegram.sendMessage(tg_chat_id, msg);
              }
              return new Response("OK", { status: 200 });
            }   
                     
            // ── Task failed ───────────────────────────────────
            // ── Task failed ───────────────────────────────────
            case "task_failed": {
                const { reason } = data;
                const errText = reason
                    ? `❌ <b>Processing Error:</b>\n<code>${esc(reason)}</code>`
                    : "❌ <b>Download failed. Check GitHub Actions logs.</b>";
                
                await this.telegram.editMessageText(chatId, statusMessageId, errText);
            
                // --- شروع بخش مدیریت صف ---
                await this.kv.clearCurrentTask();
                const { nextTask } = await this.kv.popQueue(); 
                
                // داخل task_failed
                if (nextTask) {
                    await this.runNextTask(nextTask);
                    const remainingQueue = await this.kv.getQueue();
                    await this.updateQueuePositionMessages(remainingQueue);
                }
                return new Response("Task Failed", { status: 200 });
            }

            // ── Sync complete (from sync.yml) ─────────────────
            case "sync_complete": {
                const { tree } = data;
                if (!Array.isArray(tree)) {
                    return new Response("Bad Request: tree must be an array", { status: 400 });
                }
                // Assign ids and emojis
                await this.kv.updateTreeCache(tree);
                return new Response("Synced", { status: 200 });
            }

            default:
                return new Response("Unknown event", { status: 400 });
        }
    }
    
    
    async addDownloadTask(link, chatId, messageId) {
    // ۱. دریافت لیست فعلی صف
        let queue = await this.kv.env.KV.get("queue_list", { type: "json" }) || [];
        
        // ۲. اضافه کردن تسک جدید (شامل لینک و اطلاعات تلگرام برای نوتیفیکیشن)
        queue.push({ url: link, tg_chat_id: chatId, tg_message_id: messageId });
        await this.kv.env.KV.put("queue_list", JSON.stringify(queue));
        
        // ۳. بررسی اینکه آیا تسکی در حال اجراست یا خیر
        let currentTask = await this.kv.env.KV.get("current_task", { type: "json" });
        
        if (!currentTask) {
            await this.runNextTask();
        } else {
            await this.telegram.sendMessage(chatId, "⏳ Link added to queue. It will start automatically.", messageId);
        }
    }
    
    async runNextTask(nextTask) {
        // ۱. اگر ورودی نداشتیم (یعنی صفی وجود نداشت)، وضعیت رو خالی کن و خارج شو
        if (!nextTask) {
            await this.kv.clearCurrentTask();
            return;
        }
    
        // ۲. آماده‌سازی متن پیام شروع پردازش
        const setupText = "⚙️ <b>Processing started...</b>\nStarting Github Actions...";
        
        // ۳. تصمیم‌گیری برای ادیت یا ارسال پیام جدید
        // از فیلد queueMessageId که موقع /link ذخیره کردیم استفاده می‌کنیم
        let statusMsgId = nextTask.queueMessageId;
        const chatId = nextTask.chatId || nextTask.tg_chat_id;
    
        if (statusMsgId) {
            // اگر این لینک قبلاً توی صف بوده و پیام "You are 5/11" داره، همون رو ادیت کن
            await this.telegram.editMessageText(chatId, statusMsgId, setupText);
        } else {
            // اگر صف خالی بود و لینک مستقیم رفت برای دانلود، یک پیام جدید بفرست
            const sent = await this.telegram.sendMessage(chatId, setupText);
            statusMsgId = sent.result.message_id;
        }
    
        // ۴. به‌روزرسانی وضعیت "تسک فعلی" در KV با اطلاعات کامل و آیدی پیام نهایی
        const activeTask = { 
            ...nextTask,
            chatId: String(chatId),
            tg_chat_id: String(chatId),
            statusMessageId: String(statusMsgId),
            tg_message_id: String(statusMsgId),
        };
        await this.kv.setCurrentTask(activeTask);
    
        // ۵. ارسال دستور نهایی به گیت‌هاب
        await this.github.sendDownloadRequest({
            url: activeTask.url,
            chatId: String(chatId),
            statusMessageId: String(statusMsgId),
        });
    }

}
// ──────────────────────────────────────────────────────────────
//  Entry Point
// ──────────────────────────────────────────────────────────────
export default {
    async fetch(request, env) {
        try {
            const kv = new KVManager(env);
            const ui = new UIBuilder();
            const telegram = new TelegramAPI(env);
            const github = new GitHubAPI(env);
            const handler = new CommandHandler(env, telegram, kv, ui, github);

            const url = new URL(request.url);

            if (url.pathname === "/webhook") {
                return handler.handleWebhook(request);
            }

            if (url.pathname === "/setup") {
                await handler.registerBotCommands();
                return new Response("Bot commands registered.", { status: 200 });
            }

            const update = await request.json();
            await handler.handleUpdate(update);
            return new Response("OK", { status: 200 });
        } catch (e) {
            console.error("Worker error:", e.message);
            return new Response("Internal Error", { status: 500 });
        }
    },
};
