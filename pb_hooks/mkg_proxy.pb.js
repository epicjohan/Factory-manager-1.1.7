/**
 * Factory Manager — MKG API Proxy v4.0
 * ======================================
 *
 * Registreert een POST-endpoint: /api/mkg-proxy
 *
 * v4.0 correcties (op basis van MKG Postman collection):
 *   1. Login via POST j_spring_security_check (Spring Security, form-encoded)
 *      → geeft JSESSIONID cookie terug
 *   2. Alle vervolgaanroepen: JSESSIONID cookie + X-customerID header (API-sleutel)
 *   3. Response-structuur: response.ResultData[0].<tabel>[]
 *
 * Credentials worden gelezen uit PocketBase system_config (server-side).
 * Browser stuurt NOOIT credentials — alleen de gewenste actie/endpoint.
 *
 * Ondersteunde acties:
 *   PING      — Test de verbinding (login + root API check).
 *   REQUEST   — Willekeurige MKG API-aanroep (GET/POST/PATCH).
 *   SYNC_PLNC — Haal geplande capaciteit (tabel: plnc) op.
 */

console.log("[MKG Proxy] v4.0 — Registering /api/mkg-proxy ...");

// ─── HULPFUNCTIES ──────────────────────────────────────────────────────────────

/**
 * Lees de MKG-instellingen uit de system_config tabel van PocketBase.
 */
function readMkgConfig() {
    try {
        var record = $app.findFirstRecordByFilter("system_config", "id != ''");
        if (!record) return null;

        var mkgUrl      = record.getString("mkgServerUrl") || "";
        var mkgUsername = record.getString("mkgUsername")  || "";
        var mkgPassword = record.getString("mkgPassword")  || "";
        var mkgApiKey   = record.getString("mkgApiKey")    || "";

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
 *
 * MKG verwacht form-encoded body: j_username + j_password
 * Response: 200 OK + Set-Cookie: JSESSIONID=...
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
        var sessionCookie = "";
        if (res.cookies && res.cookies["JSESSIONID"]) {
            var c = res.cookies["JSESSIONID"];
            sessionCookie = "JSESSIONID=" + (c.value !== undefined ? c.value : c);
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
 * Bouw headers voor een MKG API-aanroep:
 *   - Cookie: JSESSIONID (uit de login)
 *   - X-customerID: API-sleutel (conform MKG Postman collection)
 *   - Content-Type + Accept: application/json
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
 * Extraheer de data-array uit de MKG response-structuur:
 *   response.ResultData[0].<tabelNaam>[]
 *
 * Als de structuur niet herkend wordt, geef de raw data terug.
 */
function extractMkgData(json, tableName) {
    if (!json) return null;
    try {
        // Standaard MKG structuur: { response: { ResultData: [{ <tabel>: [...] }] } }
        var resultData = json.response && json.response.ResultData;
        if (Array.isArray(resultData) && resultData.length > 0) {
            var first = resultData[0];
            if (tableName && Array.isArray(first[tableName])) {
                return first[tableName];
            }
            // Geen specifieke tabel: geef het eerste object terug
            return first;
        }
        // Fallback: directe array of object
        return json;
    } catch (e) {
        return json;
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

    // 2. Lees MKG-credentials uit system_config
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

        var loginResult = mkgLogin(cfg);
        if (!loginResult.success) {
            return e.json(200, { success: false, message: loginResult.error });
        }

        // Bevestig dat de API bereikbaar is
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
            // Login werkte, API root niet bereikbaar — toch als success rapporteren
            return e.json(200, {
                success: true,
                message: "MKG login geslaagd. API root: " + String(apiErr)
            });
        }
    }

    // ── REQUEST: Willekeurige API-aanroep ──────────────────────────────────────
    if (body.action === "REQUEST") {
        if (!body.endpoint) {
            return e.json(400, { success: false, message: "endpoint is vereist." });
        }

        var reqMethod = (body.method || "GET").toUpperCase();
        console.log("[MKG Proxy] REQUEST: " + reqMethod + " /api/v3/" + body.endpoint);

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
            var rawJson = apiRes.json || null;

            return e.json(200, {
                success:    (apiRes.statusCode >= 200 && apiRes.statusCode < 300),
                statusCode: apiRes.statusCode,
                message:    "HTTP " + apiRes.statusCode,
                data:       rawJson,
                raw:        rawJson ? null : (apiRes.raw || null)
            });

        } catch (apiErr) {
            return e.json(200, { success: false, message: "API aanroep mislukt: " + String(apiErr) });
        }
    }

    // ── SYNC_PLNC: Haal geplande capaciteit op (tabel: plnc) ─────────────────
    if (body.action === "SYNC_PLNC") {
        console.log("[MKG Proxy] SYNC_PLNC aanvraag");

        var loginResult = mkgLogin(cfg);
        if (!loginResult.success) {
            return e.json(200, { success: false, message: loginResult.error });
        }

        try {
            // Bouw query params conform MKG Documents-endpoint patroon
            var queryParams = "?FieldList=admi_num,plnc_datum,plnc_week,plnc_maand,plnc_tijd,plnc_tijd_bemand,plnc_forecast,rsrc_num,prdh_num,prdr_num";

            // Filter op resource als opgegeven, anders alle niet-historische records
            var filterParts = ["plnc_historisch = false"];
            if (body.rsrcNum)  filterParts.push("rsrc_num = " + body.rsrcNum);
            if (body.weekFrom) filterParts.push("plnc_week >= " + body.weekFrom);
            queryParams += "&Filter=" + encodeURIComponent(filterParts.join(" AND "));

            var limitVal = body.limit || 500;
            queryParams += "&limit=" + limitVal;

            var plncRes = $http.send({
                url:     cfg.url + "/api/v3/Documents/plnc" + queryParams,
                method:  "GET",
                headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                timeout: 30
            });

            console.log("[MKG Proxy] SYNC_PLNC response: " + plncRes.statusCode);

            var plncJson  = plncRes.json || null;
            // Extraheer de plnc-records uit response.ResultData[0].plnc
            var plncData  = extractMkgData(plncJson, "plnc");

            return e.json(200, {
                success:    (plncRes.statusCode >= 200 && plncRes.statusCode < 300),
                statusCode: plncRes.statusCode,
                message:    "plnc opgehaald: HTTP " + plncRes.statusCode,
                data:       plncData,
                rawResponse: plncJson  // ook de volledige response voor debugging
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

console.log("[MKG Proxy] v4.0 — Klaar. Luistert op POST /api/mkg-proxy");
