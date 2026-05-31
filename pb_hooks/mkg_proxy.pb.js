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
        // MKG docs: POST {{authUrl}}/j_spring_security_check?j_username=...&j_password=...
        // Credentials gaan als query parameters, NIET als form body
        var loginUrl = cfg.url + MKG_AUTH_PATH
            + "?j_username=" + encodeURIComponent(cfg.username)
            + "&j_password=" + encodeURIComponent(cfg.password);
        try {
            console.log("[MKG Proxy] Login URL: " + cfg.url + MKG_AUTH_PATH + "?j_username=" + cfg.username + "&j_password=***");

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
                var filterParts = [];
                if (body.rsrcNum)  filterParts.push("rsrc_num = " + body.rsrcNum);
                if (body.weekFrom) filterParts.push("plnc_week >= " + body.weekFrom);

                var queryParams = "?FieldList=" + encodeURIComponent(fieldList)
                                + "&NumRows="   + (body.limit || 500);

                // Voeg Filter alleen toe als er filteronderdelen zijn
                if (filterParts.length > 0) {
                    queryParams += "&Filter=" + encodeURIComponent(filterParts.join(" AND "));
                }

                var plncUrl = cfg.url + MKG_API_BASE + "/Documents/plnc/" + queryParams;
                console.log("[MKG Proxy] SYNC_PLNC URL: " + plncUrl);

                var plncRes = $http.send({
                    url:     plncUrl,
                    method:  "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 30
                });

                console.log("[MKG Proxy] SYNC_PLNC response: " + plncRes.statusCode);

                var plncJson = plncRes.json || null;

                // Debug: log de ruwe response structuur
                var rawStr = "";
                try { rawStr = JSON.stringify(plncJson).substring(0, 500); } catch(x) {}
                console.log("[MKG Proxy] SYNC_PLNC raw: " + rawStr);

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

        // ── SYNC_PLNB ─────────────────────────────────────────────────────
        if (body.action === "SYNC_PLNB") {
            console.log("[MKG Proxy] SYNC_PLNB aanvraag (met paginatie)");

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            try {
                var plnbFields = [
                    "admi_num","prdh_num","prdr_num","rsrc_num","bwrk_num",
                    "plnb_num","plnb_oms",
                    "plnb_dat_start","plnb_dat_eind",
                    "plnb_wk_start","plnb_wk_eind",
                    "plnb_tijd_start","plnb_tijd_eind",
                    "plnb_duur","plnb_instel_tijd",
                    "plnb_tijd_per_stuk","plnb_plan_tijd_per_stuk",
                    "plnb_aantal","plnb_aantal_grd","plnb_start_aantal",
                    "plnb_gestart","plnb_gereed",
                    "plnb_forecast","plnb_onbemand","plnb_vast",
                    "plnb_uitbesteden","cred_num",
                    "plnb_tijd_besteed","plnb_prod_fase","plnb_memo","plnb_volgorde",
                    "arti_code","arti_oms1","arti_tek_num"
                ].join(",");
                // Filter: geen plnb_gereed filter — MKG boolean syntax onbekend (ja/nee vs true/false)
                // Client-side filteren we op gereed status
                var plnbFilter = [];
                if (body.rsrcNum) plnbFilter.push("rsrc_num = " + body.rsrcNum);
                var filterStr = plnbFilter.join(" AND ");

                // ── Paginatie: MKG limiteert tot ~1000 rijen per request ──
                var pageSize = 1000;
                var maxPages = 50;   // veiligheid: max 50.000 records
                var allRecords = [];

                for (var page = 0; page < maxPages; page++) {
                    var startRow = page * pageSize;

                    var plnbParams = "?FieldList=" + encodeURIComponent(plnbFields)
                                   + "&NumRows="   + pageSize
                                   + "&StartRow="  + startRow;

                    // Voeg Filter alleen toe als er filteronderdelen zijn
                    if (filterStr) {
                        plnbParams += "&Filter=" + encodeURIComponent(filterStr);
                    }

                    var plnbUrl = cfg.url + MKG_API_BASE + "/Documents/plnb/" + plnbParams;
                    console.log("[MKG Proxy] SYNC_PLNB page " + (page + 1) + " StartRow=" + startRow + " URL: " + plnbUrl);

                    var plnbRes = $http.send({
                        url:     plnbUrl,
                        method:  "GET",
                        headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                        timeout: 30
                    });

                    console.log("[MKG Proxy] SYNC_PLNB page " + (page + 1) + " response: " + plnbRes.statusCode);

                    var plnbJson = plnbRes.json || null;

                    // Debug: log de eerste pagina
                    if (page === 0) {
                        var plnbRaw = "";
                        try { plnbRaw = JSON.stringify(plnbJson).substring(0, 500); } catch(x) {}
                        console.log("[MKG Proxy] SYNC_PLNB raw page 1: " + plnbRaw);
                    }

                    var pageData = extractMkgData(plnbJson, "plnb");

                    if (!Array.isArray(pageData) || pageData.length === 0) {
                        console.log("[MKG Proxy] SYNC_PLNB page " + (page + 1) + ": geen data meer, stoppen.");
                        break;
                    }

                    // Voeg pagina records toe aan totaal
                    for (var i = 0; i < pageData.length; i++) {
                        allRecords.push(pageData[i]);
                    }

                    console.log("[MKG Proxy] SYNC_PLNB page " + (page + 1) + ": " + pageData.length + " records (totaal nu: " + allRecords.length + ")");

                    // Als we minder dan pageSize kregen, zijn er geen volgende pagina's
                    if (pageData.length < pageSize) {
                        console.log("[MKG Proxy] SYNC_PLNB klaar — laatste pagina berikt.");
                        break;
                    }
                }

                console.log("[MKG Proxy] SYNC_PLNB totaal: " + allRecords.length + " records in " + (page + 1) + " pagina's.");

                return e.json(200, {
                    success:     true,
                    statusCode:  200,
                    message:     "plnb opgehaald: " + allRecords.length + " records (" + (page + 1) + " pagina's)",
                    data:        allRecords,
                    pages:       page + 1
                });
            } catch (plnbErr) {
                console.error("[MKG Proxy] SYNC_PLNB fout: " + String(plnbErr));
                return e.json(200, { success: false, message: "plnb ophalen mislukt: " + String(plnbErr) });
            }
        }

        // ── FETCH_ARTI ────────────────────────────────────────────────────
        // Haal artikelgegevens op voor een lijst van arti_codes
        if (body.action === "FETCH_ARTI") {
            console.log("[MKG Proxy] FETCH_ARTI aanvraag, body.codes type: " + typeof body.codes + ", value: " + JSON.stringify(body.codes));

            // Goja (PocketBase JS) kent Array.isArray niet altijd, gebruik duck-typing
            var codesList = [];
            if (body.codes && body.codes.length > 0) {
                for (var ci = 0; ci < body.codes.length; ci++) {
                    codesList.push(String(body.codes[ci]));
                }
            }

            if (codesList.length === 0) {
                return e.json(200, { success: false, message: "Geen 'codes' array meegegeven of leeg. Type: " + typeof body.codes });
            }

            console.log("[MKG Proxy] FETCH_ARTI: " + codesList.length + " codes ontvangen.");

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            try {
                var artiFields = "arti_code,arti_oms_1,arti_oms_2,arti_tekening";

                // Bouw filter: arti_code = "X" OR arti_code = "Y" ...
                var codeFilters = [];
                for (var ci = 0; ci < codesList.length; ci++) {
                    codeFilters.push('arti_code = "' + codesList[ci] + '"');
                }
                var artiFilter = codeFilters.join(" OR ");

                var artiParams = "?FieldList=" + encodeURIComponent(artiFields)
                               + "&Filter="    + encodeURIComponent(artiFilter)
                               + "&NumRows="   + codesList.length;

                var artiUrl = cfg.url + MKG_API_BASE + "/Documents/arti/" + artiParams;
                console.log("[MKG Proxy] FETCH_ARTI URL: " + artiUrl);

                var artiRes = $http.send({
                    url:     artiUrl,
                    method:  "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 30
                });

                console.log("[MKG Proxy] FETCH_ARTI response: " + artiRes.statusCode);

                var artiJson = artiRes.json || null;
                var artiRaw = "";
                try { artiRaw = JSON.stringify(artiJson).substring(0, 500); } catch(x) {}
                console.log("[MKG Proxy] FETCH_ARTI raw: " + artiRaw);

                var artiData = extractMkgData(artiJson, "arti");

                return e.json(200, {
                    success:     (artiRes.statusCode >= 200 && artiRes.statusCode < 300),
                    statusCode:  artiRes.statusCode,
                    data:        artiData,
                    message:     artiData.length + " artikelen opgehaald."
                });
            } catch (artiErr) {
                console.error("[MKG Proxy] FETCH_ARTI fout: " + String(artiErr));
                return e.json(200, { success: false, message: "arti ophalen mislukt: " + String(artiErr) });
            }
        }

        // ── Onbekende actie ───────────────────────────────────────────────
        return e.json(400, {
            success: false,
            message: "Onbekende actie '" + body.action + "'. Ondersteund: PING, REQUEST, SYNC_PLNC, SYNC_PLNB, FETCH_ARTI."
        });

    } catch (fatalErr) {
        console.error("[MKG Proxy] Fatale fout: " + String(fatalErr));
        return e.json(200, { success: false, message: "Proxy interne fout: " + String(fatalErr) });
    }
});

console.log("[MKG Proxy] v6.0 — Klaar. Luistert op POST /api/mkg-proxy");
