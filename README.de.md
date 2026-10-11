# Mini-Fleet Monitor

[English](README.md) · **Deutsch**

Eine kleine Full-Stack-Webanwendung zur Überwachung einer Flotte virtueller Patrouillenroboter: Eine
Simulation bewegt sie alle zwei Sekunden, die Positionen werden in PostgreSQL gespeichert, über
Redis veröffentlicht und per WebSocket an den Browser übertragen, wo sie live auf einer
OpenLayers-Karte erscheinen.

![Dashboard, Tag-Theme](docs/screenshots/dashboard-day.png)

## Schnellstart

Voraussetzung: Docker mit Docker Compose.

```bash
docker compose up --build
```

Danach **http://localhost:8080** öffnen und mit **`admin@test.com` / `test123`** anmelden.

| Dienst | URL / Port | Hinweis |
|---|---|---|
| Web (React, nginx) | http://localhost:8080 | die Anwendung |
| API (Express, WebSocket) | http://localhost:4000 | REST + `ws://localhost:4000/ws` |
| PostgreSQL | `localhost:5433` | Benutzer / Passwort / Datenbank: `fleet` |
| Redis | `localhost:6379` | Cache für `GET /robots` und Pub/Sub für Live-Updates |

Alle Ports sind an `127.0.0.1` gebunden. Schema und Demodaten (ein Benutzer, acht Roboter) werden
beim ersten Start automatisch angelegt. `docker compose down -v` setzt alles zurück.

`JWT_SECRET` fällt auf einen ausdrücklich als **nur für die Demo** gekennzeichneten Wert zurück,
damit der Stack direkt nach dem Klonen startet. Für alles über eine lokale Demo hinaus ein eigenes
Secret in einer `.env`-Datei setzen (siehe [`.env.example`](.env.example)).

### Lokale Entwicklung ohne Docker für API und Web

```bash
docker compose up -d db redis     # nur die Datenbanken
cp .env.example .env              # JWT_SECRET auf eine zufällige Zeichenkette mit 32+ Zeichen setzen

# Terminal 1 — API auf http://localhost:4000, lädt bei Änderungen neu
cd api && npm install && npm run dev

# Terminal 2 — Web auf http://localhost:5173
cd web && cp .env.example .env && npm install && npm run dev
```

Die API im Docker-Container und die lokale API nutzen beide Port 4000, also jeweils nur eine davon
starten (`docker compose stop api web`).

## Architektur

Ein Simulations-Timer in der API bewegt alle zwei Sekunden etwa die Hälfte der Roboter über dieselbe
Service-Funktion, die auch `POST /robots/:id/move` nutzt; Roboter, die sich nicht bewegt haben,
werden `idle`. Jede Bewegung ist eine einzige atomare SQL-Anweisung, die den Roboter aktualisiert
und seine Positionshistorie ergänzt; danach veröffentlicht der Service ein `robot.updated`-Ereignis
über Redis Pub/Sub. Ein eigener Redis-Subscriber in der API leitet jedes Ereignis an alle
authentifizierten WebSocket-Clients weiter, sodass sich mehrere API-Instanzen einen Kanal teilen
könnten. Das React-Frontend lädt einen Snapshot mit `GET /robots`, wendet die Live-Ereignisse darauf
an (das neuere `updated_at` gewinnt) und verschiebt die OpenLayers-Features mit einer kurzen
Animation an Ort und Stelle, statt den Layer neu aufzubauen.

```
 Simulation (alle 2 s) ──┐
 POST /robots/:id/move ──┴─▶ robotService ──▶ PostgreSQL (robots, robot_positions)
                                   │
                                   └─▶ Redis PUBLISH robots:updates
                                              │
                          Redis-Subscriber ◀──┘
                                   │
                          WebSocket /ws ──▶ React: Liste + OpenLayers-Karte
                                                ▲
                          GET /robots (JWT) ────┘  Snapshot beim Start und nach Reconnect
```

## Screenshots

| Login | Dashboard, Nachtschicht |
|---|---|
| ![Login](docs/screenshots/login.png) | ![Dashboard, Nachtschicht](docs/screenshots/dashboard-night.png) |

Fahrende Roboter sind gelbe Pfeile in Fahrtrichtung mit einer verblassenden Spur, stehende Roboter
stahlgraue Kreise. Die Liste zeigt denselben Zustand als Text: Rufname, Status, letzte Position und
Alter der Meldung.

## API

| Methode | Pfad | Auth | Beschreibung |
|---|---|---|---|
| `POST` | `/auth/login` | — | `{ email, password }` → `{ token, user }` (JWT, 1 h) |
| `GET` | `/robots` | Bearer | alle Roboter |
| `POST` | `/robots/:id/move` | Bearer | bewegt den Roboter 10–50 m in eine zufällige Richtung |
| `GET` | `/health` | — | 200, wenn PostgreSQL und Redis antworten, sonst 503 |
| `WS` | `/ws?token=<jwt>` | JWT im Query-String | sendet `{"type":"robot.updated","robot":{…}}` |

Die WebSocket-API des Browsers kann keinen `Authorization`-Header senden, daher steht das Token im
Query-String und wird beim HTTP-Upgrade geprüft (ungültiges Token → `401`, bevor der Socket öffnet).

## Stack

- **API:** Node.js 24, Express 5, `pg` (reines SQL, kein ORM), `redis`, `ws`, `jsonwebtoken`, `bcryptjs`
- **Web:** React 19 (JavaScript), Vite, React Router, OpenLayers, reines CSS
- **Infrastruktur:** PostgreSQL 16, Redis 7, Docker Compose, nginx

## Entscheidungen und Kompromisse

- **JavaScript statt TypeScript** — die Aufgabe verlangt „React (JS)“; die API folgt, damit das
  Repository eine Sprache hat.
- **Atomare Bewegungen.** Eine Bewegung ist eine einzige datenverändernde CTE (`UPDATE … RETURNING`
  + `INSERT` in die Historie), sodass gleichzeitige Bewegungen desselben Roboters kein Update
  verlieren.
- **Redis Pub/Sub statt In-Memory-Broadcast** — Ereignisse erreichen die Clients jeder API-Instanz.
- **Cache für `GET /robots`** (Cache-Aside, TTL 10 s, `X-Cache: HIT` / `MISS`). Jede Änderung an
  einem Roboter löscht den Schlüssel. Eine Leseanfrage, die kurz vor einer Bewegung begonnen hat, kann
  ihr älteres Ergebnis trotzdem nach dem Löschen schreiben (das übliche Cache-Aside-Race); dieser
  Eintrag lebt bis zur nächsten Bewegung oder bis zur TTL, die die Veralterung auch dann begrenzt,
  wenn ein Löschen verloren geht, während Redis nicht erreichbar ist. Ist Redis ausgefallen, gehen die
  Anfragen an PostgreSQL. Live-Positionen kommen ohnehin über den WebSocket, der Cache liefert nur den
  Anfangs-Snapshot. Da die Simulation alle 2 s Roboter bewegt, wird der
  Schlüssel etwa einmal pro Takt gelöscht; die TTL greift vor allem, wenn die Simulation ruht.
- **Reihenfolge.** Ereignisse und Snapshots werden über `updated_at` zusammengeführt; eine ältere
  Meldung überschreibt nie eine neuere Position.
- **Robustheit.** Die API bricht beim Start ohne PostgreSQL oder Redis sofort ab, verbindet sich im
  Betrieb neu mit Redis, simuliert weiter, während Redis ausfällt, und fährt bei `SIGTERM` sauber
  herunter. Die Web-App verbindet sich mit Backoff neu und synchronisiert nach jedem Reconnect über
  `GET /robots`.
- **Sicherheit.** Parametrisiertes SQL, bcrypt mit zeitlich gleichem Login-Pfad (unbekannte E-Mail
  und falsches Passwort dauern gleich lang), JWT fest auf HS256, dieselbe Token-Prüfung für REST und
  WebSocket.
- **Schriften liegen im Projekt** (SIL OFL, Lizenzen in `web/public/fonts`) — keine Besucher-IP geht
  an Google (DSGVO).
- **Barrierefreiheit.** Der Status wird über Form, Farbe und Text gezeigt; die Karte ist per Tastatur
  bedienbar; `prefers-reduced-motion` schaltet die Marker-Animation ab.
- **Token im `localStorage`** (laut Aufgabe erlaubt). Jedes Skript auf der Seite kann es lesen; in
  Produktion käme ein httpOnly-Cookie zum Einsatz.
- **Demo-Standardwerte.** Das Postgres-Passwort `fleet` und der Standard-`JWT_SECRET` sind nur für
  lokale Demos gedacht.

## Wie das Projekt entstanden ist

Ich habe Claude Code als Pair-Programming-Partner genutzt; den Einsatz von KI-Werkzeugen hat das Team
mir freigestellt. Der Ablauf:

- Die Aufgabe wurde in nummerierte Anforderungen ([REQUIREMENTS.md](REQUIREMENTS.md)) und kleine
  Schritte zerlegt, die jeweils einzeln fertiggestellt, geprüft und committet wurden.
- Vor jedem Commit liefen zwei Review-Agenten: einer für Lint, Build, Docker und Smoke-Tests, einer
  für ein Review des Diffs (Fehler, Sicherheit, Lücken zu den Anforderungen). Frontend-Änderungen
  wurden zusätzlich gegen die Web Interface Guidelines von Vercel geprüft.
- Jeder Schritt wurde gegen echte Fehlerfälle getestet, nicht nur gegen den Normalfall: Ausfall von
  Datenbank und Redis, gefälschte und abgelaufene Tokens, gleichzeitige Bewegungen eines Roboters,
  ein Kaltstart bei laufender Seite ohne API sowie der Browser mit Tastatur und
  `prefers-reduced-motion`.

So wurden echte Fehler gefunden, bevor sie im Repository landeten, zum Beispiel eine fehlerhafte
WebSocket-Upgrade-Anfrage, die die API noch vor jeder Authentifizierung zum Absturz bringen konnte, und ein endloser
Neustart der API in Docker, wenn `.env.example` unverändert kopiert wurde. Jeden Teil des Codes kann
ich erklären.

## Erfüllung der Anforderungen

| Anforderung | Status |
|---|---|
| Node.js + Express, PostgreSQL, Redis (Cache + Pub/Sub), JWT, CORS, REST + WebSocket, Docker Compose | ✅ |
| Redis-Cache für `GET /robots` (TTL 10 s) | ✅ |
| React (JS), OpenLayers-Karte, Login-Seite, geschütztes Dashboard, Live-Marker | ✅ |
| Datenmodell `users`, `robots` (`idle` / `moving`) | ✅ |
| `POST /auth/login`, `GET /robots`, `POST /robots/:id/move` (auch automatisch ausgeführt) | ✅ |
| Simulation alle 2 s: Datenbank-Update + Broadcast | ✅ |
| Liste neben der Karte (Name, Status, letzte Position) | ✅ |
| `docker compose up` startet api, db, redis und das Frontend; Beispielnutzer `admin@test.com` | ✅ |
| Bonus: Redis Pub/Sub statt In-Memory-Broadcast | ✅ |
| Bonus: Positionshistorie (`robot_positions`) | ✅ |
| Bonus: deploymentfähig mit Dockerfile + docker-compose | ✅ |
| Bonus: Steuer-Buttons „Start/Stop Simulation“ | noch offen |
| Optional: `POST /robots` | noch offen |
