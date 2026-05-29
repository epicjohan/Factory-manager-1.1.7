/**
 * Factory Manager — MKG API Proxy v5.0 (PocketBase v0.35 compatibel)
 * ====================================================================
 *
 * Wijzigingen t.o.v. v4.x:
 *   - Body lezen via toString(e.request.body) + JSON.parse  (v0.35 correct)
 *   - Record-velden lezen via record.get() + String()       (v0.35 correct)
 *   - Top-level try/catch zodat PocketBase nooit crasht
 *
 * Ondersteunde acties:
 *   PING      — Test de verbinding (login + root API check).
 *   REQUEST   — Willekeurige MKG API-aanroep (GET/POST/PATCH).
 *   SYNC_PLNC — Haal geplande capaciteit (tabel: plnc) op.
 */

console.log("[MKG Proxy] v5.0 — Registering /api/mkg-proxy ...");

// ─── HULPFUNCTIES ──────────────────────────────────────────────────────────────

/**
 * Lees de MKG-instellingen uit system_config.
 * Gebruikt record.get() — de v0.35-correcte methode.
 */
function readMkgConfig() {
    try {
        var record = $app.findFirstRecordByFilter("system_config", "id != ''");
        if (!record) return null;

        var mkgUrl      = String(record.get("mkgServerUrl")  || "");
        var mkgUsername = String(record.get("mkgUsername")   || "");
        var mkgPassword = String(record.get("mkgPassword")   || "");
        var mkgApiKey   = String(record.get("mkgApiKey")     || "");

        if (!mkgUrl || !mkgUsername || !mkgPassword) return null;

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
 * Login bij MKG via Spring Security (j_spring_security_check).
 * Geeft { success, sessionCookie, error } terug.
 */
function mkgLogin(cfg) {
    var loginUrl = cfg.url + "/j_spring_security_check";
    try {
        var formBody = "j_username=" + encodeURIComponent(cfg.username)
                     + "&j_password=" + encodeURIComponent(cfg.password);

        var res = $http.send({
            url:     loginUrl,
            method:  "POST",
            body:    formBody,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15
        });

        console.log("[MKG Proxy] Login status: " + res.statusCode);

        // Zoek JSESSIONID in de Set-Cookie response
        // Docs: res.cookies.sessionId.value
        var sessionCookie = "";
        if (res.cookies && res.cookies["JSESSIONID"]) {
            var c = res.cookies["JSESSIONID"];
            sessionCookie = "JSESSIONID=" + (c.value !== undefined ? c.value : String(c));
        }

        if (sessionCookie) {
            return { success: true, sessionCookie: sessionCookie };
        }

        return {
            success: false,
            error: "Geen JSESSIONID ontvangen (HTTP " + res.statusCode + "). "
                 + "Controleer gebruikersnaam en wachtwoord."
        };

    } catch (err) {
        console.error("[MKG Proxy] Login fout: " + String(err));
        return {
            success: false,
            error: "Kan MKG niet bereiken op '" + cfg.url + "': " + String(err)
        };
    }
}

/**
 * Bouw headers voor MKG API-aanroepen.
 */
function mkgApiHeaders(sessionCookie, apiKey) {
    var headers = {
        "Cookie":       sessionCookie,
        "Content-Type": "application/json",
        "Accept":       "application/json"
    };
    if (apiKey) {
        headers["X-customerID"] = apiKey;
    }
    return headers;
}

/**
 * Extraheer data array uit MKG response structuur.
 */
function extractMkgData(json, tableName) {
    if (!json) return null;
    try {
        var resultData = json.response && json.response.ResultData;
        if (Array.isArray(resultData) && resultData.length > 0) {
            var first = resultData[0];
            if (tableName && Array.isArray(first[tableName])) {
                return first[tableName];
            }
            return first;
        }
        return json;
    } catch (e) {
        return json;
    }
}

// ─── PROXY ENDPOINT ────────────────────────────────────────────────────────────

routerAdd("POST", "/api/mkg-proxy", function(e) {

    // Alles in één grote try/catch — PocketBase mag NOOIT crashen met 500
    try {

        // 1. Lees de request body
        //    Docs: toString(e.request.body) geeft de raw body als string.
        //    e.request is een property (geen methode-aanroep) in v0.35.
        var body = {
            action:      "",
            endpoint:    "",
            method:      "GET",
            requestBody: null,
            rsrcNum:     null,
            weekFrom:    null,
            limit:       null,
            admiNum:     null
        };

        try {
            var rawBody = toString(e.request.body);
            if (rawBody && rawBody.length > 0) {
                var parsed = JSON.parse(rawBody);
                if (parsed.action      != null) body.action      = String(parsed.action);
                if (parsed.endpoint    != null) body.endpoint    = String(parsed.endpoint);
                if (parsed.method      != null) body.method      = String(parsed.method);
                if (parsed.requestBody != null) body.requestBody = parsed.requestBody;
                if (parsed.rsrcNum     != null) body.rsrcNum     = parsed.rsrcNum;
                if (parsed.weekFrom    != null) body.weekFrom    = parsed.weekFrom;
                if (parsed.limit       != null) body.limit       = parsed.limit;
                if (parsed.admiNum     != null) body.admiNum     = parsed.admiNum;
            }
        } catch (bodyErr) {
            return e.json(400, { success: false, message: "Ongeldige JSON body: " + String(bodyErr) });
        }

        // 2. Lees MKG-credentials uit system_config
        var cfg = readMkgConfig();
        if (!cfg) {
            return e.json(200, {
                success: false,
                message: "MKG is nog niet geconfigureerd. Ga naar Instellingen → Connectiviteit → MKG ERP Koppeling."
            });
        }

        // ── PING ──────────────────────────────────────────────────────────────
        if (body.action === "PING") {
            console.log("[MKG Proxy] PING voor: " + cfg.url);

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            // Controleer of de REST API bereikbaar is
            try {
                var pingRes = $http.send({
                    url:     cfg.url + "/api/v3",
                    method:  "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 10
                });
                return e.json(200, {
                    success: true,
                    message: "MKG verbinding geslaagd (HTTP " + pingRes.statusCode + ").",
                    statusCode: pingRes.statusCode
                });
            } catch (apiErr) {
                return e.json(200, {
                    success: true,
                    message: "MKG login geslaagd. API root niet bereikbaar: " + String(apiErr)
                });
            }
        }

        // ── REQUEST ───────────────────────────────────────────────────────────
        if (body.action === "REQUEST") {
            if (!body.endpoint) {
                return e.json(400, { success: false, message: "endpoint is vereist." });
            }

            var reqMethod = (body.method || "GET").toUpperCase();
            console.log("[MKG Proxy] REQUEST: " + reqMethod + " " + body.endpoint);

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            try {
                var apiUrl = cfg.url + "/api/v3/" + body.endpoint;
                var reqConfig = {
                    url:     apiUrl,
                    method:  reqMethod,
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 30
                };

                if (body.requestBody && (reqMethod === "POST" || reqMethod === "PATCH" || reqMethod === "PUT")) {
                    reqConfig.body = JSON.stringify(body.requestBody);
                }

                var apiRes = $http.send(reqConfig);

                return e.json(200, {
                    success:    (apiRes.statusCode >= 200 && apiRes.statusCode < 300),
                    statusCode: apiRes.statusCode,
                    message:    "HTTP " + apiRes.statusCode,
                    data:       apiRes.json || null
                });

            } catch (apiErr) {
                return e.json(200, { success: false, message: "API aanroep mislukt: " + String(apiErr) });
            }
        }

        // ── SYNC_PLNC ─────────────────────────────────────────────────────────
        if (body.action === "SYNC_PLNC") {
            console.log("[MKG Proxy] SYNC_PLNC aanvraag");

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            try {
                var fieldList = "admi_num,plnc_datum,plnc_week,plnc_maand,plnc_tijd,plnc_tijd_bemand,plnc_forecast,rsrc_num,prdh_num,prdr_num";
                var filterParts = ["plnc_historisch = false"];
                if (body.rsrcNum)  filterParts.push("rsrc_num = " + body.rsrcNum);
                if (body.weekFrom) filterParts.push("plnc_week >= " + body.weekFrom);

                var queryParams = "?FieldList=" + encodeURIComponent(fieldList)
                                + "&Filter="    + encodeURIComponent(filterParts.join(" AND "))
                                + "&limit="     + (body.limit || 500);

                var plncRes = $http.send({
                    url:     cfg.url + "/api/v3/Documents/plnc" + queryParams,
                    method:  "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 30
                });

                console.log("[MKG Proxy] SYNC_PLNC response: " + plncRes.statusCode);

                var plncJson = plncRes.json || null;
                var plncData = extractMkgData(plncJson, "plnc");

                return e.json(200, {
                    success:     (plncRes.statusCode >= 200 && plncRes.statusCode < 300),
                    statusCode:  plncRes.statusCode,
                    message:     "plnc opgehaald: HTTP " + plncRes.statusCode,
                    data:        plncData,
                    rawResponse: plncJson
                });

            } catch (plncErr) {
                console.error("[MKG Proxy] SYNC_PLNC fout: " + String(plncErr));
                return e.json(200, { success: false, message: "plnc ophalen mislukt: " + String(plncErr) });
            }
        }

        // ── Onbekende actie ───────────────────────────────────────────────────
        return e.json(400, {
            success: false,
            message: "Onbekende actie '" + body.action + "'. Ondersteund: PING, REQUEST, SYNC_PLNC."
        });

    } catch (fatalErr) {
        // Vang ALLES op — nooit een 500 laten escapen
        console.error("[MKG Proxy] Fatale fout: " + String(fatalErr));
        return e.json(200, {
            success: false,
            message: "Proxy interne fout: " + String(fatalErr)
        });
    }
});

console.log("[MKG Proxy] v5.0 — Klaar. Luistert op POST /api/mkg-proxy");
