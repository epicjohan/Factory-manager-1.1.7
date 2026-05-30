/**
 * Factory Manager — MKG API Proxy v6.0 (PocketBase v0.35)
 * ========================================================
 * MKG URL-structuur (conform documentatie):
 *   Base:  https://{server}/mkg
 *   Login: https://{server}/mkg/static/auth/j_spring_security_check
 *   REST:  https://{server}/mkg/web/v3/MKG/Documents/{tabel}?...
 */

console.log("[MKG Proxy] v6.0 — Registering /api/mkg-proxy ...");

routerAdd("POST", "/api/mkg-proxy", function(e) {

    // ── MKG URL-paden (conform documentatie) ─────────────────────────────
    var MKG_AUTH_PATH = "/mkg/static/auth/j_spring_security_check";
    var MKG_API_BASE  = "/mkg/web/v3/MKG";

    // ── Helpers ──────────────────────────────────────────────────────────

    function readMkgConfig() {
        try {
            var record = $app.findFirstRecordByFilter("system_config", "id != ''");
            if (!record) return null;

            var mkgUrl      = String(record.get("mkgServerUrl")  || "");
            var mkgUsername  = String(record.get("mkgUsername")   || "");
            var mkgPassword  = String(record.get("mkgPassword")   || "");
            var mkgApiKey    = String(record.get("mkgApiKey")     || "");

            if (!mkgUrl || !mkgUsername || !mkgPassword) return null;

            // Auto-prefix https://
            if (mkgUrl.indexOf("://") === -1) {
                mkgUrl = "https://" + mkgUrl;
            }

            // Strip trailing slashes en eventueel /mkg suffix
            // (we voegen /mkg zelf toe via de constanten)
            mkgUrl = mkgUrl.replace(/\/+$/, "");
            if (mkgUrl.endsWith("/mkg")) {
                mkgUrl = mkgUrl.slice(0, -4);
            }

            return {
                url:      mkgUrl,
                username: mkgUsername,
                password: mkgPassword,
                apiKey:   mkgApiKey
            };
        } catch (err) {
            console.error("[MKG Proxy] Fout bij lezen system_config: " + String(err));
            return null;
        }
    }

    function mkgLogin(cfg) {
        var loginUrl = cfg.url + MKG_AUTH_PATH;
        try {
            var formBody = "j_username=" + encodeURIComponent(cfg.username)
                         + "&j_password=" + encodeURIComponent(cfg.password);

            console.log("[MKG Proxy] Login URL: " + loginUrl);

            var loginHeaders = {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept":       "application/json"
            };
            if (cfg.apiKey) {
                loginHeaders["X-customerID"] = cfg.apiKey;
            }

            var res = $http.send({
                url:     loginUrl,
                method:  "POST",
                body:    formBody,
                headers: loginHeaders,
                timeout: 15
            });

            console.log("[MKG Proxy] Login status: " + res.statusCode);
            console.log("[MKG Proxy] Login cookies: " + JSON.stringify(res.cookies));

            // Debug: response body
            var rawLoginBody = "";
            try { rawLoginBody = toString(res.body); } catch(x) {}

            // Zoek JSESSIONID in cookies
            var sessionCookie = "";
            if (res.cookies && res.cookies["JSESSIONID"]) {
                var c = res.cookies["JSESSIONID"];
                sessionCookie = "JSESSIONID=" + (c.value !== undefined ? c.value : String(c));
            }

            if (sessionCookie) {
                console.log("[MKG Proxy] Login OK — JSESSIONID ontvangen");
                return { success: true, sessionCookie: sessionCookie };
            }

            return {
                success: false,
                error: "Geen JSESSIONID ontvangen (HTTP " + res.statusCode + ")."
                     + " Response: " + (rawLoginBody || "").substring(0, 200)
                     + " | Cookies: " + JSON.stringify(res.cookies || {})
            };
        } catch (err) {
            console.error("[MKG Proxy] Login fout: " + String(err));
            return { success: false, error: "Kan MKG niet bereiken op '" + loginUrl + "': " + String(err) };
        }
    }

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
        } catch (ex) {
            return json;
        }
    }

    // ── Hoofd-logica ─────────────────────────────────────────────────────

    try {
        // 1. Lees request body
        var body = {
            action: "", endpoint: "", method: "GET",
            requestBody: null, rsrcNum: null, weekFrom: null,
            limit: null, admiNum: null
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

        // 2. Lees MKG-credentials
        var cfg = readMkgConfig();
        if (!cfg) {
            return e.json(200, {
                success: false,
                message: "MKG is nog niet geconfigureerd. Ga naar Instellingen → Connectiviteit → MKG ERP Koppeling."
            });
        }

        // ── PING ──────────────────────────────────────────────────────────
        if (body.action === "PING") {
            console.log("[MKG Proxy] PING voor: " + cfg.url);

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            try {
                var pingRes = $http.send({
                    url:     cfg.url + MKG_API_BASE,
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
                    message: "MKG login geslaagd. API root: " + String(apiErr)
                });
            }
        }

        // ── REQUEST ───────────────────────────────────────────────────────
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
                var apiUrl = cfg.url + MKG_API_BASE + "/" + body.endpoint;
                var reqConfig = {
                    url: apiUrl, method: reqMethod,
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

        // ── SYNC_PLNC ─────────────────────────────────────────────────────
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

                var plncUrl = cfg.url + MKG_API_BASE + "/Documents/plnc" + queryParams;
                console.log("[MKG Proxy] SYNC_PLNC URL: " + plncUrl);

                var plncRes = $http.send({
                    url:     plncUrl,
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

        // ── Onbekende actie ───────────────────────────────────────────────
        return e.json(400, {
            success: false,
            message: "Onbekende actie '" + body.action + "'. Ondersteund: PING, REQUEST, SYNC_PLNC."
        });

    } catch (fatalErr) {
        console.error("[MKG Proxy] Fatale fout: " + String(fatalErr));
        return e.json(200, { success: false, message: "Proxy interne fout: " + String(fatalErr) });
    }
});

console.log("[MKG Proxy] v6.0 — Klaar. Luistert op POST /api/mkg-proxy");
