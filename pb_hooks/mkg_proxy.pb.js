/**
 * Factory Manager — MKG API Proxy v1.0
 * ======================================
 *
 * Registreert een POST-endpoint: /api/mkg-proxy
 *
 * Doel: Browser-calls naar de on-premise MKG API zijn CORS-geblokkeerd.
 * Deze hook draait server-side in PocketBase en stuurt de calls door
 * naar MKG via $http.send (server-to-server, geen CORS-beperking).
 *
 * Ondersteunde acties:
 *   PING    — Test de verbinding: login bij MKG en controleer de sessie.
 *   REQUEST — Voer een willekeurige MKG API-aanroep uit (GET/POST/PATCH).
 *
 * Request body (JSON):
 * {
 *   "action":      "PING" | "REQUEST",
 *   "mkgUrl":      "http://192.168.1.100:8080/mkg",
 *   "apiKey":      "abc123",
 *   "username":    "gebruiker",
 *   "password":    "wachtwoord",
 *   "endpoint":    "ProductieOrder" (alleen bij REQUEST),
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

console.log("[MKG Proxy] v1.0 — Registering /api/mkg-proxy ...");

// ─── HULPFUNCTIES ──────────────────────────────────────────────────────────────

/**
 * Bouw een URL-encoded form string voor Spring Security login.
 * j_username, j_password en apikey zijn verplichte velden.
 */
function buildLoginForm(username, password, apiKey) {
    return "j_username=" + encodeURIComponent(username)
         + "&j_password=" + encodeURIComponent(password)
         + "&apikey="     + encodeURIComponent(apiKey);
}

/**
 * Log in bij MKG via Spring Security.
 * Geeft een object terug: { success, sessionCookie, statusCode, error }
 */
function mkgLogin(mkgUrl, username, password, apiKey) {
    var loginUrl = mkgUrl + "/j_spring_security_check";
    try {
        var res = $http.send({
            url:     loginUrl,
            method:  "POST",
            body:    buildLoginForm(username, password, apiKey),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15
        });

        console.log("[MKG Proxy] Login response status: " + res.statusCode);

        // Spring Security geeft 302 (redirect) bij success, of 200 bij mislukking
        // Na automatische redirect-follow kan statusCode ook 200 zijn.
        // We controleren op aanwezigheid van JSESSIONID cookie.
        var sessionCookie = "";
        if (res.cookies && res.cookies["JSESSIONID"]) {
            var cookieObj = res.cookies["JSESSIONID"];
            sessionCookie = "JSESSIONID=" + (cookieObj.value || cookieObj);
        }

        if (sessionCookie) {
            return { success: true, sessionCookie: sessionCookie, statusCode: res.statusCode };
        }

        // Geen sessie-cookie: login mislukt (verkeerde credentials of apikey)
        return {
            success:    false,
            statusCode: res.statusCode,
            error:      "Geen JSESSIONID ontvangen van MKG. Controleer gebruikersnaam, wachtwoord en API-sleutel."
        };

    } catch (err) {
        console.error("[MKG Proxy] Login fout: " + String(err));
        return {
            success: false,
            statusCode: 0,
            error: "Kan MKG server niet bereiken op '" + mkgUrl + "': " + String(err)
        };
    }
}

// ─── PROXY ENDPOINT ────────────────────────────────────────────────────────────

routerAdd("POST", "/api/mkg-proxy", function(e) {

    // 1. Lees de request body
    var body = {
        action:      "",
        mkgUrl:      "",
        apiKey:      "",
        username:    "",
        password:    "",
        endpoint:    "",
        method:      "GET",
        requestBody: null
    };

    try {
        e.bindBody(body);
    } catch (err) {
        return e.json(400, { success: false, message: "Ongeldige JSON body: " + String(err) });
    }

    // 2. Valideer verplichte velden
    if (!body.mkgUrl || !body.username || !body.password) {
        return e.json(400, {
            success: false,
            message: "Verplichte velden ontbreken: mkgUrl, username en password zijn vereist."
        });
    }

    // Verwijder trailing slash van de URL
    var baseUrl = body.mkgUrl.replace(/\/$/, "");

    // ── PING: Test verbinding ──────────────────────────────────────────────────
    if (body.action === "PING") {
        console.log("[MKG Proxy] PING aanvraag voor: " + baseUrl);

        var loginResult = mkgLogin(baseUrl, body.username, body.password, body.apiKey || "");

        if (loginResult.success) {
            // Extra check: haal de root op om te bevestigen dat de API bereikbaar is
            try {
                var pingRes = $http.send({
                    url:     baseUrl + "/api/v3",
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
                // Login werkte, maar API root niet bereikbaar (ongebruikelijk)
                return e.json(200, {
                    success: true,
                    message: "MKG login geslaagd, maar API root niet bereikbaar: " + String(apiErr)
                });
            }
        }

        return e.json(200, {
            success:    false,
            message:    loginResult.error || ("Login mislukt: HTTP " + loginResult.statusCode)
        });
    }

    // ── REQUEST: Geef een API-aanroep door ────────────────────────────────────
    if (body.action === "REQUEST") {
        if (!body.endpoint) {
            return e.json(400, { success: false, message: "endpoint is vereist voor een REQUEST actie." });
        }

        console.log("[MKG Proxy] REQUEST: " + (body.method || "GET") + " " + body.endpoint);

        // Stap 1: Inloggen
        var loginResult = mkgLogin(baseUrl, body.username, body.password, body.apiKey || "");
        if (!loginResult.success) {
            return e.json(200, {
                success: false,
                message: "MKG login mislukt voor REQUEST: " + (loginResult.error || "HTTP " + loginResult.statusCode)
            });
        }

        // Stap 2: Voer de API-aanroep uit
        try {
            var apiUrl = baseUrl + "/api/v3/" + body.endpoint;
            var requestConfig = {
                url:     apiUrl,
                method:  (body.method || "GET").toUpperCase(),
                headers: {
                    "Cookie":       loginResult.sessionCookie,
                    "Content-Type": "application/json",
                    "Accept":       "application/json"
                },
                timeout: 30
            };

            // Voeg body toe bij POST/PATCH/PUT
            if (body.requestBody && (requestConfig.method === "POST" || requestConfig.method === "PATCH" || requestConfig.method === "PUT")) {
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

    // ── Onbekende actie ────────────────────────────────────────────────────────
    return e.json(400, {
        success: false,
        message: "Onbekende actie '" + body.action + "'. Ondersteund: PING, REQUEST."
    });
});

console.log("[MKG Proxy] v1.0 — Klaar. Luistert op POST /api/mkg-proxy");
