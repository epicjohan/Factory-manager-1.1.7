/**
 * Factory Manager — FileRouter Utils v5.1
 * ========================================
 *
 * Gedeelde logica voor de FileRouter hook.
 * Dit bestand wordt geladen via require() vanuit file_router.pb.js
 *
 * BELANGRIJK: Dit bestand NIET hernoemen naar .pb.js!
 * Alleen .pb.js bestanden worden automatisch door PocketBase geladen.
 * Dit bestand wordt HANDMATIG geladen via require().
 */

// ─── CONSTANTEN ──────────────────────────────────────────

var MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;   // 50MB
var SYSTEM_CONFIG_FILTER = "id != ''";

// ─── CONFIGURATIE ────────────────────────────────────────

var MIRROR_CONFIG = {
    machines: {
        fields: ["image", "documents"],
        getTargetDir: function(record, root) {
            var num  = sanitize(record.getString("machineNumber") || "UNSET");
            var name = sanitize(record.getString("name") || "NONAME");
            return root + "\\Assets\\" + num + "_" + name;
        }
    },
    tickets: {
        fields: ["invoice"],
        getTargetDir: function(record, root) {
            return root + "\\Maintenance\\Tickets\\" + record.getId();
        }
    },
    articles: {
        fields: ["documents"],
        getTargetDir: function(record, root) {
            var code = sanitize(record.getString("articleCode") || "UNKNOWN");
            return root + "\\Articles\\" + code;
        }
    }
};

// ─── HOOFD FUNCTIE ───────────────────────────────────────

function runFileSync(e) {
    var record = e.record;
    if (!record) return;

    var collectionName = "";
    try {
        collectionName = record.collection().name;
    } catch (err) {
        console.error("[FileRouter] Kan collectienaam niet bepalen: " + String(err));
        return;
    }

    if (!collectionName) return;

    var config = MIRROR_CONFIG[collectionName];
    if (!config) return;

    try {
        var rootPath = getRootPath();
        if (!rootPath) return;

        var baseDir = config.getTargetDir(record, rootPath);

        config.fields.forEach(function(fieldName) {
            try {
                mirrorFileField(record, fieldName, baseDir, collectionName);
            } catch (fieldErr) {
                console.error("[FileRouter] Fout bij veld '" + fieldName + "': " + String(fieldErr));
            }
        });

        if (collectionName === "articles") {
            try {
                routeArticleFiles(record, rootPath);
            } catch (artErr) {
                console.error("[FileRouter] Article routing fout: " + String(artErr));
            }
        }

    } catch (err) {
        console.error("[FileRouter] Fout in " + collectionName +
                      " (ID: " + record.getId() + "): " + String(err));
    }
}

// ─── ROOT PAD ────────────────────────────────────────────

function getRootPath() {
    var settings;
    try {
        settings = $app.findFirstRecordByFilter("system_config", SYSTEM_CONFIG_FILTER);
    } catch (err) {
        return null;
    }

    if (!settings) return null;

    var raw = settings.getString("ncServerPath");
    if (!raw || raw.length < 3) return null;

    var path = raw.replace(/\//g, "\\");
    if (path.charAt(path.length - 1) === "\\") {
        path = path.substring(0, path.length - 1);
    }

    return path;
}

// ─── FILE SPIEGELING ─────────────────────────────────────

function mirrorFileField(record, fieldName, destDir, collectionName) {
    var filenames = getFileNames(record, fieldName);
    if (filenames.length === 0) return;

    try {
        $os.mkdirAll(destDir, 0o755);
    } catch (err) {
        console.error("[FileRouter] Map aanmaken mislukt: " + destDir + " — " + String(err));
        return;
    }

    cleanupRemovedFiles(destDir, filenames, fieldName);

    var fsys;
    try {
        fsys = $app.newFilesystem();
    } catch (err) {
        console.error("[FileRouter] Filesystem openen mislukt: " + String(err));
        return;
    }

    try {
        filenames.forEach(function(fileName) {
            if (!fileName || typeof fileName !== "string") return;

            var destPath = destDir + "\\" + fileName;

            // Deduplicatie: skip als bestand al bestaat
            try {
                $os.stat(destPath);
                return;
            } catch (e) {
                // Bestaat niet — doorgaan
            }

            var fileKey = record.baseFilesPath() + "/" + fileName;

            try {
                var reader = fsys.getFile(fileKey);
                if (!reader) {
                    console.warn("[FileRouter] Geen reader voor: " + fileKey);
                    return;
                }

                var content = toString(reader);

                try { if (typeof reader.close === "function") reader.close(); } catch (e) {}

                if (!content || content.length === 0) {
                    console.warn("[FileRouter] Leeg bestand: " + fileName);
                    return;
                }

                $os.writeFile(destPath, content, 0o644);
                console.log("[FileRouter] OK " + collectionName + "/" + fileName);

            } catch (err) {
                console.error("[FileRouter] Kopieren mislukt: " + fileName + " — " + String(err));
            }
        });
    } finally {
        try { fsys.close(); } catch (e) {}
    }
}

// ─── ARTICLE ROUTING ─────────────────────────────────────

function routeArticleFiles(record, rootPath) {
    var articleCode = sanitize(record.getString("articleCode") || "");
    if (!articleCode) return;

    var baseDir = rootPath + "\\Articles\\" + articleCode;

    var metaRaw = record.get("filesMeta");
    if (!metaRaw) return;

    var meta = [];
    try {
        if (Array.isArray(metaRaw)) meta = metaRaw;
        else if (typeof metaRaw === "string") meta = JSON.parse(metaRaw);
        else meta = JSON.parse(JSON.stringify(metaRaw));
    } catch (e) { return; }

    if (!meta || meta.length === 0) return;

    var setupsMap = buildSetupsMap(record);

    var fsys;
    try { fsys = $app.newFilesystem(); } catch (e) { return; }

    try {
        meta.forEach(function(fileMeta) {
            if (!fileMeta || !fileMeta.pbFilename) return;

            var targetDir = baseDir;

            if (fileMeta.setupId && setupsMap[fileMeta.setupId]) {
                targetDir = baseDir + "\\Setups\\" + setupsMap[fileMeta.setupId];
                var role = fileMeta.fileRole || "OTHER";
                if (role === "NC")             targetDir += "\\NC";
                else if (role === "CAM")       targetDir += "\\CAM";
                else if (role === "IMAGE" || role === "DRAWING")
                                               targetDir += "\\Drawings";
                else                           targetDir += "\\Documents";
            } else {
                targetDir = baseDir + "\\Customer_Data";
            }

            try { $os.mkdirAll(targetDir, 0o755); } catch (e) { return; }

            var destFilename = sanitize(fileMeta.name || fileMeta.pbFilename);
            var destPath = targetDir + "\\" + destFilename;

            try { $os.stat(destPath); return; } catch (e) {}

            var fileKey = record.baseFilesPath() + "/" + fileMeta.pbFilename;
            try {
                var reader = fsys.getFile(fileKey);
                $os.writeFile(destPath, toString(reader), 0o644);
                try { if (typeof reader.close === "function") reader.close(); } catch (e) {}
                console.log("[FileRouter] OK article/" + articleCode + " -> " + destFilename);
            } catch (err) {
                console.error("[FileRouter] Article bestand mislukt: " + destFilename + " — " + String(err));
            }
        });
    } finally {
        try { fsys.close(); } catch (e) {}
    }
}

// ─── HELPERS ─────────────────────────────────────────────

function getFileNames(record, fieldName) {
    try {
        var val = record.get(fieldName);
        if (!val) return [];
        if (Array.isArray(val)) {
            return val.filter(function(v) {
                return v && typeof v === "string" && v.length > 0;
            });
        }
        if (typeof val === "string" && val.length > 0) return [val];
    } catch (e) {}

    try {
        var single = record.getString(fieldName);
        if (single && single.length > 0) return [single];
    } catch (e) {}

    return [];
}

function buildSetupsMap(record) {
    var map = {};
    var opsRaw = record.get("operations");
    if (!opsRaw) return map;

    try {
        var ops;
        if (Array.isArray(opsRaw)) ops = opsRaw;
        else if (typeof opsRaw === "string") ops = JSON.parse(opsRaw);
        else ops = JSON.parse(JSON.stringify(opsRaw));

        ops.forEach(function(op) {
            if (op && op.setups) {
                op.setups.forEach(function(setup) {
                    if (setup.id && setup.name) {
                        map[setup.id] = sanitize(setup.name);
                    }
                });
            }
        });
    } catch (e) {}

    return map;
}

function cleanupRemovedFiles(dirPath, currentFilenames, fieldName) {
    try {
        var entries = $os.readDir(dirPath);
        if (!entries) return;

        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var entryName = entry.name();

            if (entry.isDir() || entryName === ".lock") continue;

            var belongsToField = (entryName.indexOf(fieldName + "_") === 0);
            var inCurrentList = (currentFilenames.indexOf(entryName) !== -1);

            if (belongsToField && !inCurrentList) {
                try {
                    $os.remove(dirPath + "\\" + entryName);
                    console.log("[FileRouter] VERWIJDERD: " + entryName);
                } catch (e) {
                    console.error("[FileRouter] Verwijderen mislukt: " + entryName);
                }
            }
        }
    } catch (e) {}
}

function sanitize(name) {
    if (!name) return "unnamed";
    return name.toString()
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\.+$/g, "")
        .replace(/\s+$/g, "")
        .replace(/\s+/g, " ")
        .trim() || "unnamed";
}

function handleRecordDelete(e) {
    var record = e.record;
    if (!record) return;

    var collectionName = "";
    try { collectionName = record.collection().name; } catch (err) { return; }

    var config = MIRROR_CONFIG[collectionName];
    if (!config) return;

    try {
        var rootPath = getRootPath();
        if (!rootPath) return;

        var targetDir = config.getTargetDir(record, rootPath);
        var archiveDir = rootPath + "\\_Archive\\" + collectionName + "\\" + record.getId();
        try {
            $os.mkdirAll(archiveDir, 0o755);
            $os.rename(targetDir, archiveDir);
            console.log("[FileRouter] GEARCHIVEERD: " + targetDir);
        } catch (err) {}
    } catch (err) {
        console.error("[FileRouter] Delete handler fout: " + String(err));
    }
}

// ─── EXPORTS ─────────────────────────────────────────────

module.exports = {
    runFileSync:        runFileSync,
    handleRecordDelete: handleRecordDelete
};
