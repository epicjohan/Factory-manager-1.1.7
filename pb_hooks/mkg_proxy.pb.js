/**
 * Factory Manager — MKG API Proxy v2.0
 * ======================================
 *
 * Registreert een POST-endpoint: /api/mkg-proxy
 *
 * v2.0 wijziging: Credentials worden NIET meer meegestuurd vanuit de browser.
 * De proxy leest ze rechtstreeks uit de system_config tabel in PocketBase.
 * Dit betekent:
 *   - 1x invoeren in de instellingen → gesynchroniseerd naar alle devices
 *   - Credentials verlaten PocketBase nooit via de browser
 *   - Veiliger: browser stuurt alleen de gewenste actie/endpoint mee
 *
 * Ondersteunde acties:
 *   PING    — Test de verbinding: login bij MKG en controleer de sessie.
 *   REQUEST — Voer een willekeurige MKG API-aanroep uit (GET/POST/PATCH).
 *
 * Request body (JSON):
 * {
 *   "action":      "PING" | "REQUEST",
 *   "endpoint":    "Artikel" (alleen bij REQUEST),
 *   "method":      "GET" | "POST" | "PATCH" (alleen bij REQUEST),
 *   "requestBody": { ... } (optioneel, alleen bij POST/PATCH)
 * }
 *
 * Response (JSON):
 * {
 *   "success":    true | false,
 *   "message":    "...",
 *   "data":       { ... } (alleen bij REQUEST bij succes)
 * }
 */

console.log("[MKG Proxy] v2.0 — Registering /api/mkg-proxy ...");

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
 * Bouw een URL-encoded form string voor Spring Security login.
 */
function buildLoginForm(username, password, apiKey) {
    return "j_username=" + encodeURIComponent(username)
         + "&j_password=" + encodeURIComponent(password)
         + (apiKey ? "&apikey=" + encodeURIComponent(apiKey) : "");
}

/**
 * Log in bij MKG via Spring Security.
 * Geeft een object terug: { success, sessionCookie, statusCode, error }
 */
function mkgLogin(cfg) {
    var loginUrl = cfg.url + "/j_spring_security_check";
    try {
        var res = $http.send({
            url:     loginUrl,
            method:  "POST",
            body:    buildLoginForm(cfg.username, cfg.password, cfg.apiKey),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15
        });

        console.log("[MKG Proxy] Login response status: " + res.statusCode);

        // Spring Security geeft na login een JSESSIONID sessie-cookie terug.
        var sessionCookie = "";
        if (res.cookies && res.cookies["JSESSIONID"]) {
            var cookieObj = res.cookies["JSESSIONID"];
            sessionCookie = "JSESSIONID=" + (cookieObj.value || cookieObj);
        }

        if (sessionCookie) {
            return { success: true, sessionCookie: sessionCookie, statusCode: res.statusCode };
        }

        return {
            success:    false,
            statusCode: res.statusCode,
            error:      "Geen JSESSIONID ontvangen van MKG. Controleer gebruikersnaam, wachtwoord en API-sleutel."
        };

    } catch (err) {
        console.error("[MKG Proxy] Login fout: " + String(err));
        return {
            success:    false,
            statusCode: 0,
            error:      "Kan MKG server niet bereiken op '" + cfg.url + "': " + String(err)
        };
    }
}

// ─── PROXY ENDPOINT ────────────────────────────────────────────────────────────

routerAdd("POST", "/api/mkg-proxy", function(e) {

    // 1. Lees de request body (alleen actie + endpoint, GEEN credentials)
    var body = {
        action:      "",
        endpoint:    "",
        method:      "GET",
        requestBody: null
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
            message: "MKG is nog niet geconfigureerd. Ga naar Instellingen → Connectiviteit → MKG ERP Koppeling en vul de gegevens in."
        });
    }

    // ── PING: Test verbinding ──────────────────────────────────────────────────
    if (body.action === "PING") {
        console.log("[MKG Proxy] PING aanvraag voor: " + cfg.url);

        var loginResult = mkgLogin(cfg);

        if (loginResult.success) {
            // Bevestig dat de API zelf ook bereikbaar is
            try {
                var pingRes = $http.send({
                    url:     cfg.url + "/api/v3",
                    method:  "GET",
                    headers: { "Cookie": loginResult.sessionCookie },
                    timeout: 10
                });
                console.log("[MKG Proxy] API root status: " + pingRes.statusCode);
                return e.json(200, {
                    success: true,
                    message: "MKG verbinding geslaagd (HTTP " + pingRes.statusCode + "). Sessie actief.",
                    statusCode: pingRes.statusCode
                });
            } catch (apiErr) {
                return e.json(200, {
                    success: true,
                    message: "MKG login geslaagd, maar API root niet bereikbaar: " + String(apiErr)
                });
            }
        }

        return e.json(200, {
            success: false,
            message: loginResult.error || ("Login mislukt: HTTP " + loginResult.statusCode)
        });
    }

    // ── REQUEST: Geef een API-aanroep door ────────────────────────────────────
    if (body.action === "REQUEST") {
        if (!body.endpoint) {
            return e.json(400, { success: false, message: "endpoint is vereist voor een REQUEST actie." });
        }

        var reqMethod = (body.method || "GET").toUpperCase();
        console.log("[MKG Proxy] REQUEST: " + reqMethod + " /api/v3/" + body.endpoint);

        // Stap 1: Inloggen
        var loginResult = mkgLogin(cfg);
        if (!loginResult.success) {
            return e.json(200, {
                success: false,
                message: "MKG login mislukt: " + (loginResult.error || "HTTP " + loginResult.statusCode)
            });
        }

        // Stap 2: Voer de API-aanroep uit
        try {
            var apiUrl = cfg.url + "/api/v3/" + body.endpoint;
            var requestConfig = {
                url:     apiUrl,
                method:  reqMethod,
                headers: {
                    "Cookie":       loginResult.sessionCookie,
                    "Content-Type": "application/json",
                    "Accept":       "application/json"
                },
                timeout: 30
            };

            if (body.requestBody && (reqMethod === "POST" || reqMethod === "PATCH" || reqMethod === "PUT")) {
                requestConfig.body = JSON.stringify(body.requestBody);
            }

            var apiRes = $http.send(requestConfig);
            console.log("[MKG Proxy] API response: " + apiRes.statusCode + " voor " + body.endpoint);

            return e.json(200, {
                success:    (apiRes.statusCode >= 200 && apiRes.statusCode < 300),
                statusCode: apiRes.statusCode,
                message:    "MKG API response: HTTP " + apiRes.statusCode,
                data:       apiRes.json || apiRes.raw || null
            });

        } catch (apiErr) {
            console.error("[MKG Proxy] API aanroep fout: " + String(apiErr));
            return e.json(200, {
                success: false,
                message: "MKG API aanroep mislukt: " + String(apiErr)
            });
        }
    }

    // ── SYNC_PLNC: Haal geplande capaciteit op ────────────────────────────────
    if (body.action === "SYNC_PLNC") {
        console.log("[MKG Proxy] SYNC_PLNC aanvraag");

        // Stap 1: Inloggen
        var loginResult = mkgLogin(cfg);
        if (!loginResult.success) {
            return e.json(200, {
                success: false,
                message: "MKG login mislukt voor SYNC_PLNC: " + (loginResult.error || "HTTP " + loginResult.statusCode)
            });
        }

        // Stap 2: Haal plnc op — optioneel gefilterd op resource en/of week
        try {
            var queryParams = "";
            if (body.rsrcNum) {
                queryParams += (queryParams ? "&" : "?") + "rsrc_num=" + body.rsrcNum;
            }
            if (body.weekFrom) {
                queryParams += (queryParams ? "&" : "?") + "plnc_week=" + body.weekFrom;
            }
            if (body.limit) {
                queryParams += (queryParams ? "&" : "?") + "_limit=" + body.limit;
            } else {
                queryParams += (queryParams ? "&" : "?") + "_limit=500";
            }

            var plncRes = $http.send({
                url:     cfg.url + "/api/v3/plnc" + queryParams,
                method:  "GET",
                headers: {
                    "Cookie": loginResult.sessionCookie,
                    "Accept": "application/json"
                },
                timeout: 30
            });

            console.log("[MKG Proxy] plnc response: " + plncRes.statusCode);

            return e.json(200, {
                success:    (plncRes.statusCode >= 200 && plncRes.statusCode < 300),
                statusCode: plncRes.statusCode,
                message:    "plnc opgehaald: HTTP " + plncRes.statusCode,
                data:       plncRes.json || plncRes.raw || null
            });

        } catch (plncErr) {
            console.error("[MKG Proxy] plnc fetch fout: " + String(plncErr));
            return e.json(200, {
                success: false,
                message: "plnc ophalen mislukt: " + String(plncErr)
            });
        }
    }

    // ── Onbekende actie ────────────────────────────────────────────────────────
    return e.json(400, {
        success: false,
        message: "Onbekende actie '" + body.action + "'. Ondersteund: PING, REQUEST, SYNC_PLNC."
    });
});

console.log("[MKG Proxy] v2.0 — Klaar. Luistert op POST /api/mkg-proxy");
