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
            limit: null, admiNum: null, artiCode: null, codesStr: null,
            rowKey: null, fields: null, prdhNum: null, memoText: null
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
                if (parsed.artiCode    != null) body.artiCode    = String(parsed.artiCode);
                if (parsed.codesStr    != null) body.codesStr    = String(parsed.codesStr);
                if (parsed.rowKey      != null) body.rowKey      = String(parsed.rowKey);
                if (parsed.fields      != null) body.fields      = parsed.fields;
                if (parsed.prdhNum     != null) body.prdhNum     = String(parsed.prdhNum);
                if (parsed.memoText    != null) body.memoText    = String(parsed.memoText);
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
                    "plnb_dat_start","plnb_dat_eind","plnb_dat_gestart",
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
                // Filter: datum-gebaseerd om oude records uit te sluiten
                // Haal alleen orders op waarvan de einddatum niet ouder is dan 90 dagen
                var plnbFilter = [];
                if (body.rsrcNum) plnbFilter.push("rsrc_num = " + body.rsrcNum);

                // Datumfilter: plnb_dat_eind >= 90 dagen geleden
                // Dit voorkomt dat duizenden oude orders uit 2023/2024 worden opgehaald
                var cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - 90);
                var cutoffStr = cutoffDate.toISOString().split("T")[0]; // "2026-03-03"
                plnbFilter.push("plnb_dat_eind >= " + cutoffStr);

                var filterStr = plnbFilter.join(" AND ");

                // ── Paginatie: MKG limiteert tot ~1000 rijen per request ──
                var pageSize = 1000;
                var maxPages = 20;   // veiligheid: max 20.000 records
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

                // ── Artikelgegevens ophalen voor unieke arti_codes ──
                var artiMap = {};
                try {
                    // Verzamel unieke arti_codes uit plnb records
                    var uniqueCodes = {};
                    for (var ri = 0; ri < allRecords.length; ri++) {
                        var code = allRecords[ri].arti_code;
                        if (code && code !== "") uniqueCodes[code] = true;
                    }
                    var codeKeys = [];
                    for (var k in uniqueCodes) codeKeys.push(k);
                    
                    if (codeKeys.length > 0) {
                        console.log("[MKG Proxy] Ophalen artikeldata voor " + codeKeys.length + " unieke codes...");
                        
                        var artiFields = "arti_code,arti_oms_1,arti_oms_2,arti_tekening";
                        var codeFilters = [];
                        for (var aci = 0; aci < codeKeys.length; aci++) {
                            codeFilters.push('arti_code = "' + codeKeys[aci] + '"');
                        }
                        var artiFilter = codeFilters.join(" OR ");
                        
                        var artiParams = "?FieldList=" + encodeURIComponent(artiFields)
                                       + "&Filter="    + encodeURIComponent(artiFilter)
                                       + "&NumRows="   + codeKeys.length;
                        
                        var artiUrl = cfg.url + MKG_API_BASE + "/Documents/arti/" + artiParams;
                        var artiRes = $http.send({
                            url:     artiUrl,
                            method:  "GET",
                            headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                            timeout: 30
                        });
                        
                        var artiData = extractMkgData(artiRes.json, "arti");
                        console.log("[MKG Proxy] Artikeldata: " + artiData.length + " artikelen opgehaald.");
                        
                        // Bouw lookup map
                        for (var ai = 0; ai < artiData.length; ai++) {
                            var a = artiData[ai];
                            artiMap[a.arti_code] = {
                                arti_oms_1:   a.arti_oms_1 || "",
                                arti_oms_2:   a.arti_oms_2 || "",
                                arti_tekening: a.arti_tekening || ""
                            };
                        }
                    }
                } catch (artiErr) {
                    console.warn("[MKG Proxy] Artikeldata ophalen mislukt (niet fataal): " + String(artiErr));
                }

                return e.json(200, {
                    success:     true,
                    statusCode:  200,
                    message:     "plnb opgehaald: " + allRecords.length + " records (" + (page + 1) + " pagina's)",
                    data:        allRecords,
                    artiMap:     artiMap,
                    pages:       page + 1
                });
            } catch (plnbErr) {
                console.error("[MKG Proxy] SYNC_PLNB fout: " + String(plnbErr));
                return e.json(200, { success: false, message: "plnb ophalen mislukt: " + String(plnbErr) });
            }
        }
        // ── UPDATE_PLNB ───────────────────────────────────────────────────
        // Werk een plnb record bij in MKG (gereedmelden / starten)
        // body.rowKey = MKG RowKey (hex)
        // body.fields = { plnb_gereed: true, plnb_aantal_grd: 10, ... }
        if (body.action === "UPDATE_PLNB") {
            console.log("[MKG Proxy] UPDATE_PLNB aanvraag");

            var rowKey = body.rowKey || "";
            var updateFields = body.fields || {};

            if (!rowKey) {
                return e.json(200, { success: false, message: "rowKey is verplicht voor UPDATE_PLNB." });
            }
            if (Object.keys(updateFields).length === 0) {
                return e.json(200, { success: false, message: "fields mag niet leeg zijn." });
            }

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            try {
                // MKG REST API: PUT /Documents/plnb/{RowKey}
                // MKG verwacht velden gewrapped in het tabelnaam-object
                // en booleans als integer (1/0)
                var updateUrl = cfg.url + MKG_API_BASE + "/Documents/plnb/" + encodeURIComponent(rowKey);

                // Converteer booleans naar integers (MKG verwacht 1/0, geen true/false)
                var mkgFields = {};
                var fieldKeys = Object.keys(updateFields);
                for (var fi = 0; fi < fieldKeys.length; fi++) {
                    var fk = fieldKeys[fi];
                    var fv = updateFields[fk];
                    if (typeof fv === "boolean") {
                        mkgFields[fk] = fv ? 1 : 0;
                    } else {
                        mkgFields[fk] = fv;
                    }
                }

                // Probeer eerst met wrapper (MKG v3 formaat)
                var wrappedBody = { "plnb": [mkgFields] };

                console.log("[MKG Proxy] UPDATE_PLNB PUT URL: " + updateUrl);
                console.log("[MKG Proxy] UPDATE_PLNB body (wrapped): " + JSON.stringify(wrappedBody));

                var updateRes = $http.send({
                    url:     updateUrl,
                    method:  "PUT",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    body:    JSON.stringify(wrappedBody),
                    timeout: 15
                });

                console.log("[MKG Proxy] UPDATE_PLNB response status: " + updateRes.statusCode);

                var updateRaw = "";
                try { updateRaw = toString(updateRes.body); } catch(x) {}
                console.log("[MKG Proxy] UPDATE_PLNB response: " + (updateRaw || "").substring(0, 500));

                if (updateRes.statusCode >= 200 && updateRes.statusCode < 300) {
                    return e.json(200, {
                        success: true,
                        message: "Bewerking succesvol bijgewerkt in MKG.",
                        rowKey: rowKey,
                        updatedFields: updateFields,
                        rawResponse: updateRaw ? JSON.parse(updateRaw) : null
                    });
                } else {
                    return e.json(200, {
                        success: false,
                        message: "MKG update mislukt (HTTP " + updateRes.statusCode + "): " + (updateRaw || "").substring(0, 300),
                        rowKey: rowKey
                    });
                }
            } catch (updateErr) {
                console.error("[MKG Proxy] UPDATE_PLNB fout: " + String(updateErr));
                return e.json(200, { success: false, message: "Update mislukt: " + String(updateErr) });
            }
        }

        // ── APPEND_PRDH_MEMO ──────────────────────────────────────────────
        // Voeg tekst toe aan prdh_memo_intern van een productieorder.
        // body.prdhNum = productieordernummer
        // body.memoText = toe te voegen tekst
        if (body.action === "APPEND_PRDH_MEMO") {
            console.log("[MKG Proxy] APPEND_PRDH_MEMO voor order: " + body.prdhNum);

            if (!body.prdhNum || !body.memoText) {
                return e.json(200, { success: false, message: "prdhNum en memoText zijn verplicht." });
            }

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            try {
                // 1. Zoek prdh record op basis van prdh_num
                var searchUrl = cfg.url + MKG_API_BASE + "/Documents/prdh/"
                    + "?FieldList=prdh_num,prdh_memo_intern"
                    + "&Filter=prdh_num eq '" + body.prdhNum + "'";

                console.log("[MKG Proxy] PRDH zoek URL: " + searchUrl);

                var searchRes = $http.send({
                    url:     searchUrl,
                    method:  "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 15
                });

                var searchRaw = "";
                try { searchRaw = toString(searchRes.body); } catch(x) {}

                if (searchRes.statusCode < 200 || searchRes.statusCode >= 300) {
                    return e.json(200, { success: false, message: "Kan prdh niet ophalen (HTTP " + searchRes.statusCode + ")" });
                }

                var searchJson = JSON.parse(searchRaw);
                var prdhRecords = extractMkgData(searchJson, "prdh");

                if (!prdhRecords || !Array.isArray(prdhRecords) || prdhRecords.length === 0) {
                    return e.json(200, { success: false, message: "Productieorder '" + body.prdhNum + "' niet gevonden in MKG." });
                }

                var prdhRecord = prdhRecords[0];
                var prdhRowKey = prdhRecord.RowKey || "";

                if (!prdhRowKey) {
                    return e.json(200, { success: false, message: "Geen RowKey gevonden voor prdh '" + body.prdhNum + "'." });
                }

                // 2. Bestaande memo ophalen en aanvullen
                var existingMemo = String(prdhRecord.prdh_memo_intern || "");
                var separator = existingMemo.length > 0 ? "\n" : "";
                var newMemo = existingMemo + separator + body.memoText;

                // Begrens op 2500 tekens
                if (newMemo.length > 2500) {
                    newMemo = newMemo.substring(newMemo.length - 2500);
                }

                console.log("[MKG Proxy] PRDH memo update: RowKey=" + prdhRowKey + ", lengte=" + newMemo.length);

                // 3. PUT update
                var memoUpdateUrl = cfg.url + MKG_API_BASE + "/Documents/prdh/" + encodeURIComponent(prdhRowKey);
                var memoUpdateRes = $http.send({
                    url:     memoUpdateUrl,
                    method:  "PUT",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    body:    JSON.stringify({ prdh_memo_intern: newMemo }),
                    timeout: 15
                });

                console.log("[MKG Proxy] PRDH memo update status: " + memoUpdateRes.statusCode);

                if (memoUpdateRes.statusCode >= 200 && memoUpdateRes.statusCode < 300) {
                    return e.json(200, { success: true, message: "Memo intern bijgewerkt voor order " + body.prdhNum + "." });
                } else {
                    var memoErrRaw = "";
                    try { memoErrRaw = toString(memoUpdateRes.body); } catch(x) {}
                    return e.json(200, { success: false, message: "Memo update mislukt (HTTP " + memoUpdateRes.statusCode + "): " + (memoErrRaw || "").substring(0, 300) });
                }
            } catch (memoErr) {
                console.error("[MKG Proxy] APPEND_PRDH_MEMO fout: " + String(memoErr));
                return e.json(200, { success: false, message: "Memo update mislukt: " + String(memoErr) });
            }
        }

        // ── FETCH_ARTI ────────────────────────────────────────────────────
        // Haal artikelgegevens op voor een lijst van arti_codes (komma-gescheiden string)
        if (body.action === "FETCH_ARTI") {
            console.log("[MKG Proxy] FETCH_ARTI aanvraag, codesStr: " + (body.codesStr ? body.codesStr.substring(0, 100) : "LEEG"));

            // PocketBase body parser geeft geen arrays door — gebruik komma-gescheiden string
            var codesList = [];
            if (body.codesStr && typeof body.codesStr === "string") {
                var parts = body.codesStr.split(",");
                for (var ci = 0; ci < parts.length; ci++) {
                    var trimmed = parts[ci].trim();
                    if (trimmed) codesList.push(trimmed);
                }
            }

            if (codesList.length === 0) {
                return e.json(200, { success: false, message: "Geen codes meegegeven. codesStr: " + typeof body.codesStr });
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

        // ── FETCH_BOM ─────────────────────────────────────────────────────
        // Haal complete stuklijst op voor een artikel
        if (body.action === "FETCH_BOM") {
            console.log("[MKG Proxy] FETCH_BOM voor artikel: " + body.artiCode);

            if (!body.artiCode) {
                return e.json(200, { success: false, message: "Geen artiCode meegegeven." });
            }

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            try {
                // ── Stap 1: Haal artikel op om stlh_num te vinden ──
                var artiFields = "arti_code,arti_oms_1,arti_oms_2,arti_tekening,arti_stlh_num";
                var artiFilter = 'arti_code = "' + body.artiCode + '"';
                var artiUrl = cfg.url + MKG_API_BASE + "/Documents/arti/"
                    + "?FieldList=" + encodeURIComponent(artiFields)
                    + "&Filter="    + encodeURIComponent(artiFilter)
                    + "&NumRows=1";

                console.log("[MKG Proxy] FETCH_BOM stap 1: artikel ophalen");
                var artiRes = $http.send({
                    url:     artiUrl,
                    method:  "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 30
                });

                var artiData = extractMkgData(artiRes.json, "arti");
                if (artiData.length === 0) {
                    return e.json(200, { success: false, message: "Artikel '" + body.artiCode + "' niet gevonden in MKG." });
                }

                var artikel = artiData[0];
                var stlhNum = artikel.arti_stlh_num;
                console.log("[MKG Proxy] Artikel gevonden: " + artikel.arti_code + ", stlh_num=" + stlhNum);

                if (!stlhNum || stlhNum === "" || stlhNum === "0") {
                    return e.json(200, {
                        success: true,
                        article: artikel,
                        stlrData: [],
                        message: "Artikel gevonden maar heeft geen stuklijst."
                    });
                }

                // ── Stap 2: Haal alle stuklijstregels op ──
                var stlrFields = "stlh_num,stlr_num,arti_code,stlr_oms_1,stlr_oms_2,stlr_oms_3,stlr_parent,stlr_pos,stlr_aantal,stlr_tekening,stlr_revisie,stlr_volgorde,eenh_code";
                var stlrFilter = 'stlh_num = "' + stlhNum + '"';
                var stlrUrl = cfg.url + MKG_API_BASE + "/Documents/stlr/"
                    + "?FieldList=" + encodeURIComponent(stlrFields)
                    + "&Filter="    + encodeURIComponent(stlrFilter)
                    + "&NumRows=200";

                console.log("[MKG Proxy] FETCH_BOM stap 2: stuklijstregels ophalen");
                var stlrRes = $http.send({
                    url:     stlrUrl,
                    method:  "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 30
                });

                var stlrData = extractMkgData(stlrRes.json, "stlr");
                console.log("[MKG Proxy] " + stlrData.length + " stuklijstregels gevonden.");

                // ── Stap 3: Per stlr → bewerkingen (stlb) ophalen ──
                var stlbFields = "stlb_num,stlb_oms,stlb_volgorde,rsrc_num,bwrk_num,stlb_instel_tijd,stlb_tijd_per_stuk,stlb_tijd_mach,stlb_tijd_man,stlb_uitbesteden,stlb_onbemand,stlb_man_per_machine";
                var admiNum = artikel.admi_num || cfg.admiNum || "1";

                for (var si = 0; si < stlrData.length; si++) {
                    var stlr = stlrData[si];
                    try {
                        // Bewerkingen via verzameling: stlr/{key}/stlr_stlb
                        var stlbUrl = cfg.url + MKG_API_BASE + "/Documents/stlr/"
                            + admiNum + "+" + stlhNum + "+" + stlr.stlr_num
                            + "/stlr_stlb"
                            + "?FieldList=" + encodeURIComponent(stlbFields)
                            + "&NumRows=50";

                        var stlbRes = $http.send({
                            url:     stlbUrl,
                            method:  "GET",
                            headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                            timeout: 15
                        });

                        stlr.bewerkingen = extractMkgData(stlbRes.json, "stlb");
                    } catch (stlbErr) {
                        console.warn("[MKG Proxy] stlb ophalen voor stlr " + stlr.stlr_num + " mislukt: " + String(stlbErr));
                        stlr.bewerkingen = [];
                    }

                    try {
                        // Materialen via verzameling: stlr/{key}/stlr_stlm
                        var stlmFields = "stlm_num,arti_code,stlm_oms_1,stlm_oms_2,stlm_aantal,stlm_eenh";
                        var stlmUrl = cfg.url + MKG_API_BASE + "/Documents/stlr/"
                            + admiNum + "+" + stlhNum + "+" + stlr.stlr_num
                            + "/stlr_stlm"
                            + "?FieldList=" + encodeURIComponent(stlmFields)
                            + "&NumRows=50";

                        var stlmRes = $http.send({
                            url:     stlmUrl,
                            method:  "GET",
                            headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                            timeout: 15
                        });

                        stlr.materialen = extractMkgData(stlmRes.json, "stlm");
                    } catch (stlmErr) {
                        console.warn("[MKG Proxy] stlm ophalen voor stlr " + stlr.stlr_num + " mislukt: " + String(stlmErr));
                        stlr.materialen = [];
                    }
                }

                // Tel bewerkingen
                var totalBwrk = 0;
                for (var ti = 0; ti < stlrData.length; ti++) {
                    totalBwrk += (stlrData[ti].bewerkingen || []).length;
                }
                console.log("[MKG Proxy] FETCH_BOM klaar: " + stlrData.length + " regels, " + totalBwrk + " bewerkingen.");

                return e.json(200, {
                    success:   true,
                    article:   artikel,
                    stlrData:  stlrData,
                    message:   stlrData.length + " stuklijstregels, " + totalBwrk + " bewerkingen."
                });
            } catch (bomErr) {
                console.error("[MKG Proxy] FETCH_BOM fout: " + String(bomErr));
                return e.json(200, { success: false, message: "BOM ophalen mislukt: " + String(bomErr) });
            }
        }

        // ── DISCOVER_DOCS ─────────────────────────────────────────────────
        // Eenmalige discovery: probeert meerdere methodes om documenten te vinden
        if (body.action === "DISCOVER_DOCS") {
            if (!body.artiCode) {
                return e.json(400, { success: false, message: "artiCode is vereist voor DISCOVER_DOCS." });
            }

            console.log("[MKG Proxy] DISCOVER_DOCS voor artikel: " + body.artiCode);

            var loginResult = mkgLogin(cfg);
            if (!loginResult.success) {
                return e.json(200, { success: false, message: loginResult.error });
            }

            var admiNum = body.admiNum || "1";
            var results = {
                artiCode: body.artiCode,
                tests: []
            };

            // ── Test 1: Haal artikel op om stlh_num te vinden ──
            var stlhNum = "";
            try {
                var artiUrl = cfg.url + MKG_API_BASE
                    + "/Documents/arti/"
                    + "?FieldList=" + encodeURIComponent("arti_code,arti_oms_1,arti_tekening,arti_stlh_num")
                    + "&Filter=" + encodeURIComponent("arti_code eq '" + body.artiCode + "'")
                    + "&NumRows=1";

                var artiRes = $http.send({
                    url: artiUrl, method: "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 15
                });

                var artiData = extractMkgData(artiRes.json, "arti");
                if (Array.isArray(artiData) && artiData.length > 0) {
                    stlhNum = String(artiData[0].arti_stlh_num || "");
                    results.artikel = artiData[0];
                    results.stlhNum = stlhNum;
                    results.tests.push({ test: "FETCH_ARTI", success: true, message: "Artikel gevonden, stlh_num=" + stlhNum });
                } else {
                    results.tests.push({ test: "FETCH_ARTI", success: false, message: "Artikel niet gevonden" });
                }
            } catch (artiErr) {
                results.tests.push({ test: "FETCH_ARTI", success: false, message: String(artiErr) });
            }

            // ── Test 2: Haal stlr regels op ──
            var stlrData = [];
            if (stlhNum) {
                try {
                    var stlrUrl = cfg.url + MKG_API_BASE
                        + "/Documents/stlr/"
                        + "?FieldList=" + encodeURIComponent("stlr_num,arti_code,stlr_oms_1,stlr_tekening")
                        + "&Filter=" + encodeURIComponent("stlh_num eq '" + stlhNum + "'")
                        + "&NumRows=50";

                    var stlrRes = $http.send({
                        url: stlrUrl, method: "GET",
                        headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                        timeout: 15
                    });

                    stlrData = extractMkgData(stlrRes.json, "stlr") || [];
                    results.stlrCount = stlrData.length;
                    results.tests.push({ test: "FETCH_STLR", success: true, message: stlrData.length + " stuklijstregels gevonden" });
                } catch (stlrErr) {
                    results.tests.push({ test: "FETCH_STLR", success: false, message: String(stlrErr) });
                }
            }

            // ── Test 3: Probeer stlr_files sub-collectie ──
            if (stlrData.length > 0 && stlhNum) {
                var firstStlr = stlrData[0];
                var stlrKey = admiNum + "+" + stlhNum + "+" + firstStlr.stlr_num;

                // Test 3a: stlr_files
                try {
                    var filesUrl = cfg.url + MKG_API_BASE
                        + "/Documents/stlr/" + stlrKey + "/stlr_files"
                        + "?NumRows=10";

                    console.log("[MKG Proxy] Discovery test stlr_files: " + filesUrl);
                    var filesRes = $http.send({
                        url: filesUrl, method: "GET",
                        headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                        timeout: 15
                    });

                    results.tests.push({
                        test: "stlr_files",
                        success: (filesRes.statusCode >= 200 && filesRes.statusCode < 300),
                        statusCode: filesRes.statusCode,
                        data: filesRes.json || null,
                        message: "stlr/" + stlrKey + "/stlr_files → HTTP " + filesRes.statusCode
                    });
                } catch (filesErr) {
                    results.tests.push({ test: "stlr_files", success: false, message: String(filesErr) });
                }

                // Test 3b: stlr_docs
                try {
                    var docsUrl = cfg.url + MKG_API_BASE
                        + "/Documents/stlr/" + stlrKey + "/stlr_docs"
                        + "?NumRows=10";

                    console.log("[MKG Proxy] Discovery test stlr_docs: " + docsUrl);
                    var docsRes = $http.send({
                        url: docsUrl, method: "GET",
                        headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                        timeout: 15
                    });

                    results.tests.push({
                        test: "stlr_docs",
                        success: (docsRes.statusCode >= 200 && docsRes.statusCode < 300),
                        statusCode: docsRes.statusCode,
                        data: docsRes.json || null,
                        message: "stlr/" + stlrKey + "/stlr_docs → HTTP " + docsRes.statusCode
                    });
                } catch (docsErr) {
                    results.tests.push({ test: "stlr_docs", success: false, message: String(docsErr) });
                }
            }

            // ── Test 4: docs tabel ZONDER FieldList (alle velden zichtbaar) ──
            try {
                var sampleUrl = cfg.url + MKG_API_BASE
                    + "/Documents/docs/"
                    + "?NumRows=3";

                console.log("[MKG Proxy] Discovery test docs (alle velden): " + sampleUrl);
                var sampleRes = $http.send({
                    url: sampleUrl, method: "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 15
                });

                var sampleData = extractMkgData(sampleRes.json, "docs");
                // Toon alle veldnamen van eerste record
                var fieldNames = [];
                if (Array.isArray(sampleData) && sampleData.length > 0) {
                    for (var k in sampleData[0]) {
                        if (sampleData[0].hasOwnProperty(k)) fieldNames.push(k);
                    }
                }
                results.tests.push({
                    test: "docs_all_fields",
                    success: (sampleRes.statusCode >= 200 && sampleRes.statusCode < 300),
                    statusCode: sampleRes.statusCode,
                    recordCount: Array.isArray(sampleData) ? sampleData.length : 0,
                    availableFields: fieldNames,
                    data: sampleData || null,
                    message: "docs/ (alle velden, eerste 3) → HTTP " + sampleRes.statusCode
                });
            } catch (sampleErr) {
                results.tests.push({ test: "docs_all_fields", success: false, message: String(sampleErr) });
            }

            // ── Test 5: docs filteren op docs_key met stlh_num ──
            if (stlhNum) {
                try {
                    var keyFilterUrl = cfg.url + MKG_API_BASE
                        + "/Documents/docs/"
                        + "?Filter=" + encodeURIComponent("docs_key eq '" + stlhNum + "'")
                        + "&NumRows=10";

                    var keyFilterRes = $http.send({
                        url: keyFilterUrl, method: "GET",
                        headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                        timeout: 15
                    });

                    var keyFilterData = extractMkgData(keyFilterRes.json, "docs");
                    results.tests.push({
                        test: "docs_by_stlhNum",
                        success: (keyFilterRes.statusCode >= 200 && keyFilterRes.statusCode < 300),
                        statusCode: keyFilterRes.statusCode,
                        recordCount: Array.isArray(keyFilterData) ? keyFilterData.length : 0,
                        data: keyFilterData || null,
                        message: "docs/?Filter=docs_key eq '" + stlhNum + "' → HTTP " + keyFilterRes.statusCode
                    });
                } catch (keyFilterErr) {
                    results.tests.push({ test: "docs_by_stlhNum", success: false, message: String(keyFilterErr) });
                }
            }

            // ── Test 6: docs tabel — zoek op bestandsnaam met artikelcode patroon ──
            try {
                // Probeer te filteren op het tekening-nummer van het artikel
                var tekeningNum = (results.artikel && results.artikel.arti_tekening) ? results.artikel.arti_tekening : "";
                var artiCodeClean = body.artiCode.replace(/\s+/g, "");

                // Probeer contains filter op docs_bestand
                var searchUrl = cfg.url + MKG_API_BASE
                    + "/Documents/docs/"
                    + "?Filter=" + encodeURIComponent("docs_bestand contains '" + (tekeningNum || artiCodeClean) + "'")
                    + "&NumRows=10";

                var searchRes = $http.send({
                    url: searchUrl, method: "GET",
                    headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                    timeout: 15
                });

                var searchData = extractMkgData(searchRes.json, "docs");
                results.tests.push({
                    test: "docs_by_filename",
                    success: (searchRes.statusCode >= 200 && searchRes.statusCode < 300),
                    statusCode: searchRes.statusCode,
                    recordCount: Array.isArray(searchData) ? searchData.length : 0,
                    searchTerm: tekeningNum || artiCodeClean,
                    data: searchData || null,
                    message: "docs/?Filter=docs_bestand contains '" + (tekeningNum || artiCodeClean) + "' → HTTP " + searchRes.statusCode
                });
            } catch (searchErr) {
                results.tests.push({ test: "docs_by_filename", success: false, message: String(searchErr) });
            }

            // ── Test 7: Tekeningen (dcat_num=1) met ALLE velden incl. docs_fysiek_bestand ──
            if (results.artikel && results.artikel.arti_tekening) {
                var tekNum = results.artikel.arti_tekening;

                // 7a: Tekeningen (dcat_num=1)
                try {
                    var tekUrl = cfg.url + MKG_API_BASE
                        + "/Documents/docs/"
                        + "?FieldList=" + encodeURIComponent("docs_key,docs_oms,docs_bestand,docs_fysiek_bestand,docs_submap,docs_proces,docs_type,docs_default_printen,dcat_num,docf_key,rela_num,admi_num")
                        + "&Filter=" + encodeURIComponent("docs_bestand contains '" + tekNum + "' and dcat_num eq '1'")
                        + "&NumRows=5";

                    var tekRes = $http.send({
                        url: tekUrl, method: "GET",
                        headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                        timeout: 15
                    });

                    var tekData = extractMkgData(tekRes.json, "docs");
                    results.tests.push({
                        test: "tekeningen_dcat1",
                        success: (tekRes.statusCode >= 200 && tekRes.statusCode < 300),
                        statusCode: tekRes.statusCode,
                        recordCount: Array.isArray(tekData) ? tekData.length : 0,
                        data: tekData || null,
                        message: "Tekeningen (dcat_num=1, bestand contains '" + tekNum + "') → HTTP " + tekRes.statusCode
                    });
                } catch (tekErr) {
                    results.tests.push({ test: "tekeningen_dcat1", success: false, message: String(tekErr) });
                }

                // 7b: Stepfiles (dcat_num=6)
                try {
                    var stepUrl = cfg.url + MKG_API_BASE
                        + "/Documents/docs/"
                        + "?FieldList=" + encodeURIComponent("docs_key,docs_oms,docs_bestand,docs_fysiek_bestand,docs_submap,docs_proces,docs_type,docs_default_printen,dcat_num,docf_key,rela_num,admi_num")
                        + "&Filter=" + encodeURIComponent("docs_bestand contains '" + tekNum + "' and dcat_num eq '6'")
                        + "&NumRows=5";

                    var stepRes = $http.send({
                        url: stepUrl, method: "GET",
                        headers: mkgApiHeaders(loginResult.sessionCookie, cfg.apiKey),
                        timeout: 15
                    });

                    var stepData = extractMkgData(stepRes.json, "docs");
                    results.tests.push({
                        test: "stepfiles_dcat6",
                        success: (stepRes.statusCode >= 200 && stepRes.statusCode < 300),
                        statusCode: stepRes.statusCode,
                        recordCount: Array.isArray(stepData) ? stepData.length : 0,
                        data: stepData || null,
                        message: "Stepfiles (dcat_num=6, bestand contains '" + tekNum + "') → HTTP " + stepRes.statusCode
                    });
                } catch (stepErr) {
                    results.tests.push({ test: "stepfiles_dcat6", success: false, message: String(stepErr) });
                }
            }

            console.log("[MKG Proxy] DISCOVER_DOCS klaar: " + results.tests.length + " tests uitgevoerd.");
            return e.json(200, { success: true, discovery: results });
        }

        // ── Onbekende actie ───────────────────────────────────────────────
        return e.json(400, {
            success: false,
            message: "Onbekende actie '" + body.action + "'. Ondersteund: PING, REQUEST, SYNC_PLNC, SYNC_PLNB, UPDATE_PLNB, APPEND_PRDH_MEMO, FETCH_ARTI, FETCH_BOM, DISCOVER_DOCS."
        });

    } catch (fatalErr) {
        console.error("[MKG Proxy] Fatale fout: " + String(fatalErr));
        return e.json(200, { success: false, message: "Proxy interne fout: " + String(fatalErr) });
    }
});

console.log("[MKG Proxy] v6.0 — Klaar. Luistert op POST /api/mkg-proxy");
