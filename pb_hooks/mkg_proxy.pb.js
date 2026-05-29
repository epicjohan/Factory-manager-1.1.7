/**
 * Factory Manager — MKG API Proxy v3.0
 * ======================================
 *
 * Registreert een POST-endpoint: /api/mkg-proxy
 *
 * v3.0 wijziging: Authenticatie via HTTP Basic Auth (RFC 7617).
 * MKG API v3 accepteert geen form-login meer maar gebruikt
 * stateless Basic Authentication op elke aanroep:
 *   Authorization: Basic base64(username:password)
 *
 * Voordelen t.o.v. v2 (Spring Security sessie):
 *   - Geen aparte login-stap nodig
 *   - Geen JSESSIONID cookie beheren
 *   - Elke aanroep is onafhankelijk (stateless)
 *
 * Credentials worden gelezen uit PocketBase system_config (server-side).
 * De browser stuurt NOOIT credentials mee — alleen de gewenste actie/endpoint.
 *
 * Ondersteunde acties:
 *   PING      — Test de verbinding met MKG.
 *   REQUEST   — Willekeurige MKG API-aanroep (GET/POST/PATCH).
 *   SYNC_PLNC — Haal geplande capaciteit (tabel: plnc) op.
 *
 * Request body (JSON):
 * {
 *   "action":      "PING" | "REQUEST" | "SYNC_PLNC",
 *   "endpoint":    "plnc" (alleen bij REQUEST),
 *   "method":      "GET" | "POST" | "PATCH" (alleen bij REQUEST),
 *   "requestBody": { ... } (optioneel, alleen bij POST/PATCH),
 *   "rsrcNum":     5 (optioneel, filter bij SYNC_PLNC),
 *   "weekFrom":    22 (optioneel, filter bij SYNC_PLNC),
 *   "limit":       100 (optioneel, bij SYNC_PLNC)
 * }
 */

console.log("[MKG Proxy] v3.0 — Registering /api/mkg-proxy (Basic Auth) ...");

// ─── HULPFUNCTIES ──────────────────────────────────────────────────────────────

/**
 * Lees de MKG-instellingen uit de system_config tabel van PocketBase.
 * Geeft null terug als de configuratie ontbreekt of onvolledig is.
 */
function readMkgConfig() {
    try {
        var record = $app.findFirstRecordByFilter("system_config", "id != ''");
        if (!record) {
            return null;
        }
        var mkgUrl      = record.getString("mkgServerUrl") || "";
        var mkgUsername = record.getString("mkgUsername")  || "";
        var mkgPassword = record.getString("mkgPassword")  || "";
        var mkgApiKey   = record.getString("mkgApiKey")    || "";

        if (!mkgUrl || !mkgUsername || !mkgPassword) {
            return null;
        }
        return {
            url:      mkgUrl.replace(/\/$/, ""),
            username: mkgUsername,
            password: mkgPassword,
            apiKey:   mkgApiKey
        };
    } catch (err) {
        console.error("[MKG Proxy] Fout bij lezen system_config: " + String(err));
        return null;
    }
}

/**
 * Bouw de Basic Auth header waarde: "Basic base64(username:password)"
 * PocketBase JSVM heeft geen btoa() — we bouwen base64 handmatig via $security.
 */
function buildBasicAuth(username, password) {
    var credentials = username + ":" + password;
    // $security.encrypt is niet base64 — gebruik de ingebouwde base64 encoder
    // PocketBase JSVM ondersteunt geen btoa() maar wel $base64Encode (beschikbaar in JSVM)
    try {
        // Methode 1: via $base64Encode (PocketBase JSVM helper, beschikbaar in PocketBase >= 0.20)
        return "Basic " + $base64Encode(credentials);
    } catch (e) {
        // Methode 2: fallback via Buffer (niet beschikbaar in JSVM)
        // Methode 3: handmatige base64 implementatie
        return "Basic " + base64Encode(credentials);
    }
}

/**
 * Handmatige base64 encoder als $base64Encode niet beschikbaar is.
 */
function base64Encode(str) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var result = "";
    var i = 0;
    while (i < str.length) {
        var a = str.charCodeAt(i++);
        var b = i < str.length ? str.charCodeAt(i++) : 0;
        var c = i < str.length ? str.charCodeAt(i++) : 0;
        var idx1 = a >> 2;
        var idx2 = ((a & 3) << 4) | (b >> 4);
        var idx3 = ((b & 15) << 2) | (c >> 6);
        var idx4 = c & 63;
        result += chars[idx1] + chars[idx2];
        result += (i - 2 < str.length || (i - 2 >= str.length && b)) ? chars[idx3] : "=";
        result += (i - 1 < str.length) ? chars[idx4] : "=";
    }
    return result;
}

/**
 * Bouw de headers voor een MKG API-aanroep met Basic Auth.
 */
function mkgHeaders(cfg, extraHeaders) {
    var headers = {
        "Authorization": buildBasicAuth(cfg.username, cfg.password),
        "Content-Type":  "application/json",
        "Accept":        "application/json"
    };
    // MKG API-sleutel via X-customerID header (conform MKG Postman collection)
    if (cfg.apiKey) {
        headers["X-customerID"] = cfg.apiKey;
    }
    if (extraHeaders) {
        Object.keys(extraHeaders).forEach(function(k) {
            headers[k] = extraHeaders[k];
        });
    }
    return headers;
}

/**
 * Test de verbinding met MKG via een eenvoudige GET op de API root.
 * Geeft { success, statusCode, error } terug.
 */
function mkgPing(cfg) {
    try {
        var res = $http.send({
            url:     cfg.url + "/api/v3",
            method:  "GET",
            headers: mkgHeaders(cfg),
            timeout: 10
        });
        console.log("[MKG Proxy] PING status: " + res.statusCode);
        return { success: (res.statusCode >= 200 && res.statusCode < 400), statusCode: res.statusCode };
    } catch (err) {
        console.error("[MKG Proxy] PING fout: " + String(err));
        return { success: false, statusCode: 0, error: "Kan MKG niet bereiken: " + String(err) };
    }
}

// ─── PROXY ENDPOINT ────────────────────────────────────────────────────────────

routerAdd("POST", "/api/mkg-proxy", function(e) {

    // 1. Lees de request body
    var body = {
        action:      "",
        endpoint:    "",
        method:      "GET",
        requestBody: null,
        rsrcNum:     null,
        weekFrom:    null,
        limit:       null
    };

    try {
        e.bindBody(body);
    } catch (err) {
        return e.json(400, { success: false, message: "Ongeldige JSON body: " + String(err) });
    }

    // 2. Lees MKG-credentials uit system_config (server-side, nooit via browser)
    var cfg = readMkgConfig();
    if (!cfg) {
        return e.json(200, {
            success: false,
            message: "MKG is nog niet geconfigureerd. Ga naar Instellingen → Connectiviteit → MKG ERP Koppeling."
        });
    }

    // ── PING: Test verbinding ──────────────────────────────────────────────────
    if (body.action === "PING") {
        console.log("[MKG Proxy] PING voor: " + cfg.url);
        var pingResult = mkgPing(cfg);
        if (pingResult.success) {
            return e.json(200, {
                success: true,
                message: "MKG verbinding geslaagd (HTTP " + pingResult.statusCode + ").",
                statusCode: pingResult.statusCode
            });
        }
        return e.json(200, {
            success: false,
            message: pingResult.error || ("Verbinding mislukt: HTTP " + pingResult.statusCode)
        });
    }

    // ── REQUEST: Geef een willekeurige API-aanroep door ────────────────────────
    if (body.action === "REQUEST") {
        if (!body.endpoint) {
            return e.json(400, { success: false, message: "endpoint is vereist voor een REQUEST actie." });
        }

        var reqMethod = (body.method || "GET").toUpperCase();
        var apiUrl    = cfg.url + "/api/v3/" + body.endpoint;
        console.log("[MKG Proxy] REQUEST: " + reqMethod + " " + apiUrl);

        try {
            var requestConfig = {
                url:     apiUrl,
                method:  reqMethod,
                headers: mkgHeaders(cfg),
                timeout: 30
            };

            if (body.requestBody && (reqMethod === "POST" || reqMethod === "PATCH" || reqMethod === "PUT")) {
                requestConfig.body = JSON.stringify(body.requestBody);
            }

            var apiRes = $http.send(requestConfig);
            console.log("[MKG Proxy] REQUEST response: " + apiRes.statusCode);

            return e.json(200, {
                success:    (apiRes.statusCode >= 200 && apiRes.statusCode < 300),
                statusCode: apiRes.statusCode,
                message:    "HTTP " + apiRes.statusCode,
                data:       apiRes.json || apiRes.raw || null
            });

        } catch (apiErr) {
            console.error("[MKG Proxy] REQUEST fout: " + String(apiErr));
            return e.json(200, { success: false, message: "API aanroep mislukt: " + String(apiErr) });
        }
    }

    // ── SYNC_PLNC: Haal geplande capaciteit op (tabel: plnc) ─────────────────
    if (body.action === "SYNC_PLNC") {
        console.log("[MKG Proxy] SYNC_PLNC aanvraag");

        try {
            var queryParams = "";
            if (body.rsrcNum) {
                queryParams += (queryParams ? "&" : "?") + "rsrc_num=" + body.rsrcNum;
            }
            if (body.weekFrom) {
                queryParams += (queryParams ? "&" : "?") + "plnc_week=" + body.weekFrom;
            }
            var limitVal = body.limit || 500;
            queryParams += (queryParams ? "&" : "?") + "_limit=" + limitVal;

            var plncRes = $http.send({
                url:     cfg.url + "/api/v3/plnc" + queryParams,
                method:  "GET",
                headers: mkgHeaders(cfg),
                timeout: 30
            });

            console.log("[MKG Proxy] SYNC_PLNC response: " + plncRes.statusCode);

            return e.json(200, {
                success:    (plncRes.statusCode >= 200 && plncRes.statusCode < 300),
                statusCode: plncRes.statusCode,
                message:    "plnc opgehaald: HTTP " + plncRes.statusCode,
                data:       plncRes.json || plncRes.raw || null
            });

        } catch (plncErr) {
            console.error("[MKG Proxy] SYNC_PLNC fout: " + String(plncErr));
            return e.json(200, { success: false, message: "plnc ophalen mislukt: " + String(plncErr) });
        }
    }

    // ── Onbekende actie ────────────────────────────────────────────────────────
    return e.json(400, {
        success: false,
        message: "Onbekende actie '" + body.action + "'. Ondersteund: PING, REQUEST, SYNC_PLNC."
    });
});

console.log("[MKG Proxy] v3.0 — Klaar. Luistert op POST /api/mkg-proxy (Basic Auth)");
