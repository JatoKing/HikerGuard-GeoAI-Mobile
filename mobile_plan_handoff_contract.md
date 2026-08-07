# JEJAK Mobile Plan and Handoff Contract

Last updated: 2026-08-07

Target mobile repository: [JatoKing/HikerGuard-GeoAI-Mobile](https://github.com/JatoKing/HikerGuard-GeoAI-Mobile)

Reference mobile commit reviewed: `79e1706` (`style: rotate JEJAK footsteps wordmark icon 180 degrees`)

JEJAK reference documents:

- `docs/JEJAK_MVP_IDEA_2.md`
- `docs/CONNECTIVITY_MVP_IMPLEMENTATION_TRACKER.md`
- `docs/ARCHITECTURE.md`

## 0. Implementation status audit (2026-08-07)

This section is a status correction on top of the original handoff below. It reflects behaviour
verified by reading the current code and running `tsc --noEmit`, `expo lint`, and `jest`
(55/55 tests passing, 0 lint errors), not the presence of interfaces or placeholders alone.

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| WP0 Repository foundation | Partial | Starter screens replaced, banned language absent from `app`/`components`/`src` (verified by grep), `tsc`/`test`/`lint` all pass locally. No `.github/workflows` exists yet, so nothing runs these checks on PRs. No fixture/HTTP source toggle exists (see WP1). |
| WP1 Typed contracts and fixtures | Partial | `src/api/contracts.ts` has full Zod validation matching Section 8 (schema version, checksum shape, duplicate `segment_id`, non-contiguous `segment_order`, `[0,1]` bounds). Six fixture trail packs are now derived from real recorded GPX tracks (`assets/gpx/*.gpx` via `src/lib/gpx.ts` and `scripts/generate-trail-pack-from-gpx.js`) rather than synthetic geometry, with real distances/segment counts; imported segments are honestly marked `uncertain`/low-confidence (`gpx-import-unscored-v0`) since no model has scored them. `jalan-bukit-larut` was removed from the trail list (its fixture JSON remains only as generic contract-validation sample data). `FixtureTrailRepository` is still the only `TrailRepository` implementation — no `HttpTrailRepository` and no env-based source switch, so this is fixture-only. |
| WP2 Trail discovery, download, map | Partial | Trail list/detail/download screens work against fixtures with state-grouped browsing and a distance-derived difficulty label. `TrailMap.tsx` renders coloured polylines via `react-native-maps` (auto-fitted to the route's bounding box, gestures disabled since it sits inside a `ScrollView`), but its own header comment states it needs network tiles and does **not** satisfy offline reopen — no ADR/map spike exists yet. |
| WP3 Active hike and durable GPS | Partial | SQLite schema + migrations exist (`route_pack`, `hike_session`, `location_point`, `hike_event`). Start/pause/resume/end and session-restore-after-restart are implemented in `app/(tabs)/active-hike.tsx`, including restoring the walked-path polyline from `listLocationPointsForSession()` on resume. A live Strava-style map (`LiveHikeMap.tsx`: dashed planned route + solid walked path + camera-following position marker) renders during an active/paused session; the downloadable-pack list now refreshes on every tab focus (`useFocusEffect`) instead of only at mount, fixing a bug where a newly downloaded pack didn't appear until the app was fully restarted. Recording is **foreground-only** — `expo-task-manager` is not a dependency, so screen-locked/backgrounded recording (a WP3 DoD requirement) is not implemented, matches the file's own comments. |
| WP4 Gap warnings | Complete for the fixture-driven scope | `gap-warning-engine.ts` implements route matching, contiguous-gap grouping, advance-warning distance, and per-session acknowledgement dedup, with unit tests covering adjacent gaps, uncertain-only, off-route, and jitter per the Section 17 test matrix. |
| WP5 Offline queue and acknowledgement | Partial | Write-first queue, batching, idempotent `event_id`, partial-ack handling, and transient-vs-permanent error classification (`worker.ts`, `client.ts`) are implemented and unit tested. Retry triggers on network return, app foreground, and manual button all wired via `NetInfo`/`AppState` in `active-hike.tsx`. **Gap:** `computeBackoffMs` exists in `queue.ts` but nothing calls it — there is no `next_attempt_at` column or scheduling, so a failed sync is retried on the next trigger event with no backoff delay yet. |
| Network state observation | Not wired | `@react-native-community/netinfo` is used only to trigger a retry attempt. `observed_network_state` is hardcoded to `'unknown'` at every `insertLocationPoint` call ([app/(tabs)/active-hike.tsx:122](app/(tabs)/active-hike.tsx#L122)) — it is not populated from actual `NetInfo` state. |
| Battery level | Not implemented | `expo-battery` is not in `package.json`. `battery_level` is hardcoded to `null` at every recorded point; it is not read at `gap_warning_shown`, pre-gap sync, or connectivity transitions. |
| CI workflow | Not implemented | No `.github/workflows` directory exists in the repository. |
| Offline map ADR | Not implemented | No ADR/spike document exists. `TrailMap.tsx`'s own comment documents this as an open decision. |
| Background GPS | Not implemented | No `expo-task-manager` dependency; recording stops when the app is backgrounded or the screen locks. Requires an Expo development build and physical-device testing that cannot be done in this environment. |
| Component/integration tests (RNTL) | Not implemented | `@testing-library/react-native` is not in `devDependencies`. All 55 passing tests are domain/unit-level (`src/**/__tests__`); no screen-interaction tests exist yet. |
| WP6 Integration and field test | Blocked (unchanged) | No application backend exists beyond the mock/HTTP sync client scaffolding; blocked as originally scoped. |

Agreed next sequence (unchanged from prior handoff discussion): wire backoff scheduling + NetInfo/battery
observation, then CI + `HttpTrailRepository`, then the offline-map ADR and spike, then background GPS,
then component/integration tests, then physical-device validation, then backend integration.

## 1. Purpose

This document is the implementation handoff for the developer working on the HikerGuard mobile
repository. It defines what the phone application owns, how it consumes JEJAK connectivity
predictions, which features belong in the first mobile MVP, and the acceptance criteria for each
delivery slice.

The mobile MVP is a phone-only hiking-safety workflow:

```text
Prepare route and offline pack
-> warn before a predicted connectivity gap
-> record GPS locally while online or offline
-> queue location and event records
-> synchronise them when connectivity returns
-> show the last server-acknowledged location
```

The mobile application is not responsible for training a model, calculating GeoAI features, or
deciding the production model version.

## 2. Current mobile repository baseline

> This section described the pre-implementation baseline at the original handoff commit
> (`a4fd0d3`). It is kept for history. See [Section 0](#0-implementation-status-audit-2026-08-07)
> for the current, code-verified status.

At the reviewed commit, the repository provided:

- Expo SDK 54, React Native 0.81.5, React 19.1, and TypeScript.
- Expo Router navigation, animated landing/login screens, an app-info flow, reusable visual
  components, haptics, and Lottie/Reanimated assets.
- UI copy describing trail downloads, connectivity prediction, offline GPS, synchronisation, and
  SOS concepts.

The following were not implemented at that commit:

- A real map or trail geometry renderer.
- Location permission handling or foreground/background GPS recording.
- Local database, offline route pack, or durable event queue.
- Network-state observation or automatic retry synchronisation.
- JEJAK/API client, response validation, or prediction caching.
- Real authentication; current email and social login actions only navigate to the starter tabs.
- Automated tests for the safety-critical workflows.

At that commit, `app/(tabs)` screens were still Expo starter content and `/app-info/map` was a
feature carousel, not an operational hiking map.

As of this audit, WP0-WP5 work has landed on top of that baseline (typed contracts, SQLite
persistence, foreground GPS recording, gap warnings, and an offline sync queue all exist and are
unit tested) — see Section 0 for exactly what is done, partial, or still missing within each of
those work packages. Real authentication is still unimplemented, and there is no automated
component/integration test coverage yet (Section 17).

## 3. Non-negotiable product language

Public datasets and the MVP model do not prove that a location has zero cellular service. All
user-facing mobile copy must use the following prediction classes exactly:

- `likely_covered`
- `uncertain`
- `predicted_gap`

Apply these language rules:

| Avoid | Use instead |
| --- | --- |
| confirmed dead zone / no signal | predicted connectivity gap |
| guaranteed coverage | likely covered |
| exact coverage | planning prediction |
| phone is being tracked live | phone is recording locally / last location successfully synced |
| SOS sent, before server acknowledgement | SOS queued / sending / acknowledged |

The mobile UI must never infer `predicted_gap` merely because an Ookla observation is absent.
It must render the `risk_class` supplied by the approved prediction contract.

Remove LoRa gateway placement, signal-booster placement, and statements that hikers know
"exactly" where signal will drop from the MVP screens. LoRa and repeater deployment are deferred.
SAR may be described as a later use of collected evidence, not as a trained or operational feature
in this MVP.

## 4. System ownership boundary

```text
Mobile application
    -> application backend
        -> JEJAK ML prediction API
```

### Mobile application owns

- User consent and phone permissions.
- Trail selection and offline-pack lifecycle.
- Rendering ordered trail segments and their prediction classes.
- Proximity warnings and recommended phone actions.
- Foreground/background GPS collection during an active hike.
- Durable local storage of locations and events.
- Retry-safe synchronisation and acknowledgement state.
- Display of the last successfully synchronised location.
- Clear offline, stale-data, permission, battery, and queue status.

### Application backend owns

- User identity, emergency contacts, trip plans, and server-side hike sessions.
- Mobile-facing trail-pack delivery and versioning.
- Idempotent ingestion and acknowledgement of location/event batches.
- Authorisation, retention, privacy, and operational alert workflows.
- Calling JEJAK through its stable production contract where required.

### JEJAK service owns

- Dataset ingestion, feature engineering, training, spatial evaluation, explainability, and model
  registry.
- Serving only an explicitly promoted `Champion` model in production.
- Stable segment prediction fields: `segment_id`, `risk_score`, `risk_class`, `confidence`,
  `model_version`, and `top_factors`.
- Prediction provenance and cautious classification logic.

The phone should consume the application backend rather than reading JEJAK datasets, artifacts,
Parquet files, or the model registry directly.

## 5. Delivery priorities

### P0: required vertical slice

1. Correct product copy and replace starter screens.
2. Introduce typed domain contracts and fixture-backed repositories.
3. Browse a trail and download a versioned offline trail pack.
4. Render trail geometry and the three connectivity classes.
5. Start/end a hike and record GPS locally.
6. Warn before entering a `predicted_gap` segment.
7. Queue records while offline and synchronise them when online.
8. Show the last server-acknowledged location and pending queue count.

### P1: add after the P0 workflow is reliable

- Connectivity timeline by upcoming distance.
- Prediction explanation sheet using `top_factors`.
- Battery-aware preparation prompt.
- User-recorded connectivity observations for later validation.
- Trip-plan and expected-return-time handoff to the application backend.
- Acknowledgement-safe SOS request if an operational backend contract exists.

### Deferred

- Fall detection.
- Trained lost-hiker/SAR scoring.
- Dynamic weather and terrain safety scoring.
- Alternative route optimisation.
- Live server tracking inside cellular gaps.
- LoRa, Bluetooth-to-LoRa, gateway planning, or cellular repeaters.

## 6. Recommended repository structure

The developer may adapt names to established conventions, but concerns should remain separated:

```text
app/
  (tabs)/
    trails.tsx
    active-hike.tsx
    downloads.tsx
  trails/[trailId].tsx
  hike/[sessionId].tsx

src/
  api/
    client.ts
    contracts.ts
  domain/
    connectivity.ts
    trail.ts
    hike.ts
    sync.ts
  repositories/
    trail-repository.ts
    hike-repository.ts
    sync-repository.ts
    fixture-trail-repository.ts
    http-trail-repository.ts
  storage/
    database.ts
    migrations/
    route-pack-store.ts
  location/
    permissions.ts
    recorder.ts
    background-task.ts
  sync/
    queue.ts
    worker.ts
  warnings/
    gap-warning-engine.ts
  components/
    ConnectivityLegend.tsx
    PredictionExplanation.tsx
    SyncStatus.tsx
    OfflinePackStatus.tsx
```

Do not put network calls, SQLite writes, prediction rules, or background-location logic directly
inside route components.

## 7. Mobile dependencies and technical spike

Before feature implementation, create a short architecture decision record for the map and
offline-pack approach.

Expected capability additions include:

- `expo-location` and `expo-task-manager` for location collection.
- `expo-sqlite` for durable structured local state.
- `expo-file-system` for downloaded route-pack assets.
- `@react-native-community/netinfo` for network reachability hints.
- A native-capable map library that can render GeoJSON polylines and support the chosen offline
  basemap strategy.
- Runtime schema validation for API payloads, for example Zod.
- A unit/component test runner compatible with Expo and React Native Testing Library.

Background location and some native map capabilities require an Expo development build; Expo Go
must not be treated as the final validation environment.

The map spike is complete only when one Android and one iOS development build can:

1. Render a local GeoJSON trail.
2. Style individual segments by `risk_class`.
3. Display the current GPS position.
4. Reopen the downloaded trail without a network connection.
5. Document offline basemap licensing, storage size, and platform limitations.

## 8. Mobile-facing trail-pack contract

JEJAK Milestone 9 and the application backend are not complete at the time of this handoff. The
mobile developer must therefore implement a repository interface with two interchangeable
sources:

- A checked-in fixture for current development and automated tests.
- An HTTP implementation enabled once the application backend contract is available.

The fixture must not invent a production model. Label it clearly:

```text
model_version: fixture-connectivity-v0
validation_level: fixture
intended_use: development_only
field_validated: false
```

### Proposed trail summary

```json
{
  "trail_id": "jalan-bukit-larut",
  "name": "Jalan Bukit Larut",
  "distance_m": 13250.0,
  "pack_version": "2026-08-06T00:00:00Z",
  "prediction_available": true
}
```

### Proposed downloaded trail pack

```json
{
  "schema_version": "trail-pack-v1",
  "trail_id": "jalan-bukit-larut",
  "name": "Jalan Bukit Larut",
  "pack_version": "2026-08-06T00:00:00Z",
  "generated_at": "2026-08-06T00:00:00Z",
  "model": {
    "model_version": "connectivity-proxy-v0.1.0",
    "validation_level": "proxy",
    "intended_use": "planning_only",
    "field_validated": false,
    "label_source": "FAO Mobile Broadband Coverage",
    "label_release": "2024",
    "label_resolution_m": 1000,
    "prediction_support_m": 1000
  },
  "segments": [
    {
      "segment_id": "jalan-bukit-larut-0001",
      "segment_order": 1,
      "segment_length_m": 250.0,
      "geometry": {
        "type": "LineString",
        "coordinates": [[100.0, 4.0], [100.001, 4.001]]
      },
      "risk_score": 0.82,
      "risk_class": "predicted_gap",
      "confidence": 0.71,
      "model_version": "connectivity-proxy-v0.1.0",
      "top_factors": [
        {
          "feature": "terrain_obstruction",
          "contribution": 0.31,
          "direction": "increases_risk"
        }
      ]
    }
  ],
  "integrity": {
    "algorithm": "sha256",
    "checksum": "replace-with-server-generated-checksum"
  }
}
```

Coordinates follow GeoJSON order: longitude, then latitude.

The mobile client must reject unsupported `schema_version`, invalid checksums, duplicate
`segment_id` values, non-contiguous `segment_order`, invalid coordinates, or prediction values
outside `[0, 1]`. A rejected new pack must not delete the last valid offline pack.

## 9. Local persistence contract

Use a migrated local database rather than in-memory state or unstructured AsyncStorage for
safety-relevant records.

Minimum entities:

### `route_pack`

- `trail_id`
- `pack_version`
- `schema_version`
- `model_version`
- `downloaded_at`
- `checksum`
- `file_path` or normalised segment reference
- `status`: `downloading | ready | failed | stale`

### `hike_session`

- `local_session_id`: UUID generated before any network request
- `server_session_id`: nullable until acknowledged
- `trail_id`
- `pack_version`
- `started_at`
- `ended_at`: nullable
- `state`: `prepared | active | paused | completed | sync_pending | synced`

### `location_point`

- `event_id`: UUID used as the idempotency key
- `local_session_id`
- `recorded_at`
- `latitude`
- `longitude`
- `horizontal_accuracy_m`
- `altitude_m`: nullable
- `battery_level`: nullable
- `segment_id`: nullable
- `observed_network_state`: `online | offline | unknown`
- `sync_state`: `pending | in_flight | acknowledged | failed`
- `attempt_count`

### `hike_event`

- `event_id`
- `local_session_id`
- `recorded_at`
- `type`: one of `hike_started`, `gap_warning_shown`, `connectivity_lost`,
  `connectivity_returned`, `checkpoint`, `sos_requested`, or `hike_ended`
- `payload_json`
- `sync_state`
- `attempt_count`

Every database migration must be versioned and tested against an existing database fixture.

## 10. GPS recording contract

GPS collection must continue without network access. Network state is observation metadata, not a
condition for recording.

Required behaviour:

- Request foreground permission in context, before hike start.
- Request background permission only when the user enables active-hike background recording.
- Explain the safety value and battery impact before the platform permission dialog.
- Prevent hike start if required foreground permission is denied; provide a settings recovery
  path.
- Record UTC timestamps generated on the phone and preserve horizontal accuracy.
- Do not silently discard inaccurate points. Store them with accuracy and allow filtering during
  display or server processing.
- Use a configurable interval and distance threshold. Start with approximately 20-30 seconds and
  tune through field testing.
- Stop the background task when the hike ends.
- Recover an active session after application or phone-process restart.
- Make a prominent persistent indicator available while recording is active.

The application must not claim that the server can see a locally recorded point until that exact
event has been acknowledged.

## 11. Gap-warning contract

Warnings operate on the downloaded ordered segment predictions. The phone must not run or
reimplement the GeoAI model.

Initial configurable rule:

```text
If an active hiker is on the planned route
and the next predicted_gap begins within warning_distance_m
and the warning has not already been acknowledged for that gap in this session
then show the preparation warning and store gap_warning_shown locally.
```

Use `warning_distance_m = 600` as a fixture/configuration default, not a hardcoded product fact.

The warning should include:

- Approximate distance to the predicted gap.
- Estimated gap length when contiguous predicted-gap segments are available.
- Prediction confidence.
- Distance to the next `likely_covered` segment when available.
- Recommended actions: sync current location, check offline map, check battery, notify a contact,
  and stay with the group.
- A visible statement that this is a planning prediction, not confirmed zero coverage.

Before entering the gap, the app should attempt a sync. Display these states distinctly:

- `Syncing current position...`
- `Current position acknowledged at <time>`
- `Could not confirm sync; position remains queued on this phone`

Do not repeatedly interrupt the user for the same contiguous gap. Persist warning acknowledgement
per hike session and gap group.

## 12. Synchronisation contract

Network reachability is only a trigger to try; a successful HTTP acknowledgement is the source of
truth.

Required queue behaviour:

- Write locally before attempting upload.
- Batch pending events in recorded order.
- Send a stable `event_id` for idempotency.
- Mark records `acknowledged` only when the server explicitly returns their IDs.
- Use bounded exponential backoff with jitter for transient failures.
- Do not retry permanent validation/authentication failures forever.
- Resume after app restart, network return, and manual retry.
- Keep pending records when a partial batch is acknowledged.
- Show pending count, last attempt, and last successful acknowledgement time.

### Proposed batch request

```json
{
  "device_id": "app-generated-installation-id",
  "local_session_id": "uuid",
  "events": [
    {
      "event_id": "uuid",
      "type": "location_point",
      "recorded_at": "2026-08-06T02:30:00Z",
      "payload": {
        "latitude": 4.0,
        "longitude": 100.0,
        "horizontal_accuracy_m": 8.2,
        "segment_id": "jalan-bukit-larut-0001"
      }
    }
  ]
}
```

### Proposed batch acknowledgement

```json
{
  "server_session_id": "uuid",
  "acknowledged_event_ids": ["uuid"],
  "rejected_events": [],
  "server_received_at": "2026-08-06T02:30:04Z"
}
```

`last successfully synchronised location` means the newest location by `recorded_at` whose
`event_id` appears in `acknowledged_event_ids`. It does not mean the phone's current GPS location,
the newest queued point, or the timestamp of the last network check.

## 13. Connectivity observation contract

The app may collect actual phone connectivity behaviour as a P1 evidence stream. It must be kept
separate from predicted classes.

Possible observations:

- Reachability transition time and coordinates.
- Connection type reported by the operating system.
- Whether a JEJAK/backend acknowledgement succeeded.
- Optional carrier/radio information only when available with appropriate permission and platform
  support.

Do not equate `NetInfo.isConnected = false`, a failed request, or missing carrier metadata with
field-confirmed zero coverage. Record the observation and its source accurately.

## 14. SOS boundary

SOS is P1 and requires an operational application-backend owner, escalation policy, recipient,
retention policy, and acknowledgement contract before release.

If implemented:

- `SOS queued` means stored only on the phone.
- `SOS sending` means a request is in progress.
- `SOS acknowledged` means the responsible server explicitly acknowledged it.
- The UI must state that queued SOS cannot reach responders while the phone has no usable
  connection.
- Retrying an SOS must be idempotent and must not create duplicate incidents.

The P0 app may provide an emergency-preparation panel and native emergency-number action without
claiming that JEJAK operates an emergency-dispatch service.

## 15. Work packages and definitions of done

### WP0 - Repository foundation and scope correction

Tasks:

- Replace the starter tab screens with Trails, Active Hike, and Downloads placeholders.
- Correct the app-info copy according to Section 3.
- Move shared domain code under `src/` and configure aliases consistently.
- Add environment configuration for fixture and HTTP data sources.
- Add TypeScript type-check, test, and formatting scripts to CI in addition to lint.
- Document development-build setup for Android and iOS.

**Status: partial.** `npm run lint`, `tsc --noEmit`, and `npm test` all pass locally (0 lint
errors, 55/55 tests). Starter screens are replaced and a grep for the Section 3 banned phrases
across `app/`, `components/`, and `src/` returns no matches. Not done: no `.github/workflows` runs
these checks on pull requests, no environment configuration switches between fixture and HTTP data
sources (there is only `FixtureTrailRepository`), and there is no documented development-build
setup guide.

Definition of done:

- No user-facing MVP screen claims confirmed dead zones, exact coverage, LoRa deployment, signal
  boosters, operational SAR scoring, or live tracking in a gap.
- `npm run lint`, type-check, and the initial test suite pass.

### WP1 - Typed trail contracts and fixtures

Tasks:

- Implement runtime-validated TypeScript contracts for trail summaries and `trail-pack-v1`.
- Implement fixture and HTTP repository interfaces.
- Add fixture packs that exercise all three risk classes, malformed data, stale versions, and
  failed checksums.
- Add download state and last-known-good rollback behaviour.

**Status: partial (fixture complete / HTTP integration pending).** `src/api/contracts.ts`
implements full runtime validation for `trail-pack-v1` (schema version, checksum shape, duplicate
`segment_id`, non-contiguous `segment_order`, `[0,1]` bounds) with a dedicated
`TrailPackValidationError`. Six valid fixture packs, generated from real GPX recordings of the six
listed trails via `src/lib/gpx.ts`/`scripts/generate-trail-pack-from-gpx.js`, and five invalid
fixtures (bad checksum, wrong schema, duplicate ID, invalid coordinate, non-contiguous order) exist
under `src/repositories/fixtures/`, and `route-pack-update.test.ts` covers last-known-good
rollback. Not done: `HttpTrailRepository` does not exist — only `FixtureTrailRepository`
implements `TrailRepository`.

Definition of done:

- Screens do not import fixture JSON directly.
- Invalid packs are rejected with an actionable error while the previous valid pack remains
  usable.

### WP2 - Trail discovery, download, and map

Tasks:

- Build trail list and trail-detail screens.
- Build the offline-pack download/remove/update flow.
- Render ordered segment geometry using the canonical class colours and legend.
- Display pack age, model version, proxy/planning status, and field-validation status.
- Verify the selected map and downloaded route reopen in airplane mode.

**Status: partial.** Trail list, trail-detail, and download/remove flows work against fixtures,
grouped by state with a distance-derived difficulty label; segments render with canonical class
colours via `ConnectivityLegend`/`TrailMap`, auto-fitted to the route's bounding box with pan/zoom
gestures disabled (the map sits inside a `ScrollView`). Not done: `TrailMap.tsx` uses
`react-native-maps`' default network-tiled basemap — its own header comment states this does not
satisfy offline reopen. No offline-basemap ADR/spike exists, so airplane-mode map reopening is
unverified and, per the map's own admission, not currently supported.

Definition of done:

- A user can download one fixture trail online, restart in airplane mode, open it, and distinguish
  `likely_covered`, `uncertain`, and `predicted_gap` segments.

### WP3 - Active hike and durable GPS

Tasks:

- Add permission education and recovery flows.
- Implement the local schema and migrations.
- Implement start, resume, pause if supported, and end hike actions.
- Implement foreground and background location recording.
- Restore an active hike after process termination.

**Status: partial.** Permission education/recovery flow, SQLite schema with versioned/tested
migrations (`001-initial`, `002-sync-meta`), start/pause/resume/end actions, and resumable-session
restore after restart (including restoring the walked-path polyline via
`listLocationPointsForSession()`) are implemented in `app/(tabs)/active-hike.tsx` and
`src/repositories/hike-repository.ts`. A live map (`LiveHikeMap.tsx`) shows the planned route,
walked-so-far path, and a camera-following position marker during an active/paused session. Not
done: recording is foreground-only — `expo-task-manager` is not installed, so it stops when the
screen locks or the app backgrounds, which is the core WP3 definition-of-done gap. No
physical-device test evidence exists yet.

Definition of done:

- A physical-device test records points while offline and while the screen is locked.
- Ending the hike stops background recording.
- No collected point is labelled successfully synchronised before acknowledgement.

### WP4 - Proximity and gap warnings

Tasks:

- Match the current location to the planned ordered route with an explicit off-route tolerance.
- Group contiguous predicted-gap segments.
- Implement the configurable advance-warning rule and deduplication.
- Add recommended actions and sync-attempt status.
- Add unit tests for route start/end, adjacent gaps, uncertain segments, off-route locations, and
  GPS jitter.

**Status: complete, for the fixture-driven scope defined here.** `src/warnings/gap-warning-engine.ts`
implements off-route tolerance matching, contiguous-gap grouping, the configurable
`warning_distance_m` rule, per-session-per-gap-group acknowledgement dedup, recommended actions,
and pre-gap sync-attempt status (`syncing` / `acknowledged` / `queued`), wired into
`active-hike.tsx`. `gap-warning-engine.test.ts` covers the required cases. This has not been
validated against a real GPS track on a physical device, only fixtures and the in-app dev-only
"Simulate GPS near gap" button.

Definition of done:

- A simulated route produces one warning before the configured gap, does not warn from an
  `uncertain` class alone, and does not spam repeated alerts.

### WP5 - Offline queue and acknowledgement

Tasks:

- Implement write-first queueing, batching, idempotency, partial acknowledgement, and retry.
- Trigger retry on network return, app foreground, and user request.
- Add sync status and last acknowledged location UI.
- Test duplicate requests, app restart, timeout, HTTP 4xx/5xx, and partial success.

**Status: partial.** Write-first queueing, batching, idempotent `event_id`s, partial-acknowledgement
handling, and transient (`TransientSyncError`: network/timeout/5xx) vs permanent
(`PermanentSyncError`: 4xx) classification are implemented in `src/sync/worker.ts` and
`src/api/client.ts`, with retry triggered on network return, app foreground, and a manual button.
`queue.test.ts` covers this. Not done: `computeBackoffMs` (also in `queue.ts`) is never called —
there is no `next_attempt_at` persistence, so a failed batch is retried immediately on the next
trigger rather than after a bounded exponential backoff, and this has not been tested against app
restart mid-backoff.

Definition of done:

- A hike recorded in airplane mode synchronises after connectivity returns.
- Replaying the same batch does not duplicate server events.
- The displayed last-synced marker corresponds to an acknowledged location event.

### WP6 - Integration and field test

Tasks:

- Replace the fixture repository with the mobile-facing backend in a non-production environment.
- Verify schema/version failure behaviour and graceful fallback to a downloaded pack.
- Run one scripted walking test with planned online/offline transitions.
- Capture battery usage, GPS accuracy, queue size, sync latency, and warning timing.
- Produce an integration report with device/OS/build and known limitations.

**Status: blocked**, as originally scoped — no application backend exists yet beyond
`MockSyncApiClient` and the `HttpSyncApiClient` scaffolding in `src/api/client.ts`. No
physical-device or field test has been run.

Definition of done:

- The complete prepare -> warn -> offline record -> reconnect -> acknowledge flow passes on at
  least one supported Android device and one supported iOS device.
- Fixture mode remains available for deterministic automated tests, but is visibly marked and
  cannot be enabled accidentally in production.

## 16. Recommended pull-request sequence

Keep pull requests independently reviewable:

1. `mobile/01-scope-copy-and-foundation`
2. `mobile/02-trail-contracts-and-fixtures`
3. `mobile/03-offline-trail-map`
4. `mobile/04-hike-session-and-location`
5. `mobile/05-gap-warning-engine`
6. `mobile/06-sync-queue-and-acknowledgement`
7. `mobile/07-backend-integration-and-field-test`

Each PR should include:

- Scope and screenshots or recording where UI changes.
- Contract or migration changes.
- Automated test evidence.
- Physical-device checks when native behaviour changes.
- Known limitations and follow-up issues.

## 17. Test matrix

Minimum automated and manual cases:

| Area | Required cases |
| --- | --- |
| Pack validation | valid, bad checksum, wrong schema, duplicate ID, invalid coordinate, stale update |
| Prediction rendering | all three classes, missing factors, low confidence, proxy banner |
| Permissions | granted, denied, denied permanently, background unavailable |
| GPS | online, airplane mode, poor accuracy, process restart, screen locked, hike ended |
| Warnings | before gap, uncertain only, contiguous gap, duplicate suppression, off route |
| Queue | write-first, restart, timeout, 401/403, 422, 500, partial ack, duplicate retry |
| Last synced | no ack, one ack, queued newer point, out-of-order ack, session completion |
| Offline UX | cold start offline, downloaded pack available, no downloaded pack, stale pack |

Safety-critical domain logic must be unit tested independently from React components. Network and
storage boundaries should use integration tests. Background GPS and offline recovery require
physical-device evidence.

## 18. Integration dependencies and blockers

The mobile developer can complete WP0-WP4 against fixtures immediately.

WP5 can implement and test the client protocol against a mock server, but final acceptance needs
an application backend with idempotent batch acknowledgement.

Production prediction integration is blocked until JEJAK Milestone 9 produces the trail prediction
artifact/contract and an eligible model is explicitly promoted. The current JEJAK API exposes only
`GET /health`; the mobile developer must not assume that a production prediction endpoint already
exists.

The following cross-team decisions should be recorded before WP6:

- Mobile-facing base URL and authentication scheme.
- Trail list and trail-pack endpoints.
- Batch upload limits and acknowledgement semantics.
- Data retention and privacy policy for GPS records.
- Supported Android/iOS versions.
- Offline basemap provider, licence, and storage limits.
- Whether guest hikes may sync and how a device installation is identified.
- Ownership and operational policy for any SOS workflow.

## 19. Final mobile MVP acceptance scenario

The release candidate is acceptable when this scenario succeeds:

1. The user opens the app and selects a supported trail.
2. The user downloads a versioned trail pack and can inspect its prediction limitations.
3. The user enters airplane mode and can still open the route and prediction layer.
4. The user starts a hike and the phone records GPS points locally.
5. The app warns once before a fixture or approved `predicted_gap`, shows preparation actions, and
   does not describe the prediction as confirmed no coverage.
6. New points continue to be stored while offline and are shown as pending.
7. Connectivity returns and the queue is uploaded using stable event IDs.
8. Only acknowledged records are marked synced.
9. The map identifies the last successfully synchronised location separately from the current and
   latest queued locations.
10. The user ends the hike, background recording stops, and any remaining queue is retained until
    acknowledged.

Completion of this scenario demonstrates the JEJAK phone workflow. It does not demonstrate field-
validated cellular coverage, real-time tracking inside a gap, or an operational SAR dispatch
system.
