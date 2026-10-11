# Requirements: Mini-Fleet Monitor

Source: "Full-Stack Testaufgabe (3–5 Tage), Mini-Fleet Monitor für virtuelle Roboter",
Security Robotics Development & Solutions GmbH. German wording kept as in the original, IDs added so
that `TODO.md`, commits and reviews can reference a single requirement.

Legend: **MUST** = Muss-Kriterium / Minimale Anforderung, **OPT** = Optionale Erweiterung,
**BONUS** = Bonuspunkte.

---

## Ziel

Eine kleine, funktionsfähige Web-Anwendung, die:

| ID | Requirement | Level |
|---|---|---|
| G1 | eine Liste virtueller Roboter verwaltet | MUST |
| G2 | ihre Positionen auf einer Karte anzeigt (OpenLayers) | MUST |
| G3 | Live-Positionsupdates vom Server empfängt | MUST |
| G4 | Benutzer über Login/Token absichert | MUST |

## Technischer Rahmen: Backend

| ID | Requirement | Level |
|---|---|---|
| B1 | Node.js + Express | MUST |
| B2 | PostgreSQL als persistente Datenbank | MUST |
| B3 | Redis als Cache + (optional) Pub/Sub für Live-Updates | MUST (Cache), Pub/Sub optional |
| B4 | Auth mit JWT (Login + geschützte Routen) | MUST |
| B5 | HTTPS oder HTTP mit CORS (keine self-signed Pflicht) | MUST |
| B6 | REST + WebSocket für Server-Client-Kommunikation | MUST |
| B7 | Docker Compose mit Postgres + Redis | MUST |

## Technischer Rahmen: Frontend

| ID | Requirement | Level |
|---|---|---|
| F1 | React (JS) mit HTML/CSS | MUST |
| F2 | Anzeige einer OpenLayers-Karte | MUST |
| F3 | Login-Maske und geschützte Dashboard-Seite | MUST |
| F4 | Anzeige von Robotern als Marker, Live-Update der Positionen | MUST |

## Datenmodell (einfach)

| ID | Table | Columns | Level |
|---|---|---|---|
| D1 | `users` | id, email, password_hash, created_at | MUST |
| D2 | `robots` | id, name, status (`idle` \| `moving`), lat, lon, updated_at | MUST |
| D3 | `robot_positions` | Positionshistorie | BONUS |

## Backend-Endpunkte

| ID | Methode | Pfad | Beschreibung | Level |
|---|---|---|---|---|
| E1 | POST | `/auth/login` | Login mit Email/Passwort → JWT | MUST |
| E2 | GET | `/robots` | Liefert alle Roboter (auth-geschützt) | MUST |
| E3 | POST | `/robots/:id/move` | Simuliert neue Position (zufällig). **Muss automatisch ausgeführt werden** | MUST |
| E4 | — | WebSocket | Roboter-Position muss über WebSocket an UI übertragen werden | MUST |
| E5 | POST | `/robots` | Hinzufügen eines Roboters | OPT |
| E6 | — | Redis-Cache | Redis-Cache für `GET /robots` Ergebnisse (TTL 10 s) | OPT |

## Authentifizierung

| ID | Requirement | Level |
|---|---|---|
| A1 | JWT-basierter Login | MUST |
| A2 | Token im Frontend speichern (Memory oder LocalStorage) | MUST |
| A3 | Geschützte API-Routen → Middleware prüft JWT | MUST |
| A4 | Kein Refresh-Token nötig (Access Token reicht) | note |

## Simulation (Server)

| ID | Requirement | Level |
|---|---|---|
| S1 | Script oder Timer, der **alle 2 Sekunden** zufällige neue Positionen für Roboter generiert | MUST |
| S2 | … und sie in der DB aktualisiert | MUST |
| S3 | … und per Redis oder direktem Broadcast an Clients sendet | MUST |

## Frontend-Funktionalität

| ID | Page | Requirement | Level |
|---|---|---|---|
| U1 | Login | Eingabefelder: Email, Passwort | MUST |
| U2 | Login | Erfolgreicher Login → speichert Token → leitet zum Dashboard weiter | MUST |
| U3 | Dashboard | OpenLayers-Karte mit Robotern als Marker | MUST |
| U4 | Dashboard | WebSocket- oder SSE-Verbindung empfängt Live-Positionsupdates → Markerpositionen werden aktualisiert | MUST |
| U5 | Dashboard | Liste der Roboter neben der Karte (Name, Status, letzte Position) | MUST |

## Setup & Abgabe

| ID | Requirement | Level |
|---|---|---|
| X1 | `docker-compose up` startet: api (Node.js), db (Postgres), redis, optional frontend | MUST (frontend optional) |
| X2 | Beispielnutzer `admin@test.com` / `test123` | MUST |
| X3 | README mit Setup-Schritten | MUST |
| X4 | README mit kurzer Erklärung der Architektur (1 Absatz) | MUST |
| X5 | README mit Beispiel-Screenshots (Login, Karte mit Robotern) | MUST |

## Bonuspunkte (optional, falls Zeit)

| ID | Requirement | Level |
|---|---|---|
| P1 | Redis Pub/Sub statt In-Memory-Broadcast | BONUS |
| P2 | Positionshistorie speichern (`robot_positions`) | BONUS |
| P3 | Steuer-Buttons im Frontend („Start/Stop Simulation") | BONUS |
| P4 | Deployment-fähig mit Dockerfile + docker-compose | BONUS |

## Process (from the job page)

- Scope 3–5 days, time split is up to the candidate.
- Solve before the interview, present the program in the interview and explain the decisions.
- "Uns interessiert, **wie** du arbeitest und wie du deine Entscheidungen begründest. Perfekt muss
  dabei nichts sein."

---

## Interpretation notes (our decisions, not part of the original)

- **E3 + S1:** the timer calls the same service function as `POST /robots/:id/move`, so the endpoint
  is "executed automatically" and still callable by hand.
- **E6 + S1:** a 10 s cache against 2 s updates serves stale positions unless the move invalidates it.
  We invalidate on every move.
- **D2 status:** not every robot moves on every tick, otherwise `idle` never appears.
- **E3 "zufällig":** ground patrol robots walk the real roads and paths within 450 m of Mühlweg 44
  (OpenStreetMap). Each step is a random 10–50 m; at every junction the next road is chosen at random
  (no U-turn except at a dead end). Random, but robots never cross buildings or leave the site.
- **F1:** frontend is plain JavaScript as the brief says "React (JS)"; the backend follows for one
  language across the repo.
- **E4 + A3:** the WebSocket handshake is authenticated with the same JWT.
