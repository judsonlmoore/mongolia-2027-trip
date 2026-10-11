# Mongolia · August 2027

An interactive, independently planned trip for four friends, with flights and travel inside **5–22 August 2027**. All bookings and flight connections remain to be confirmed.

## Use the site

- Select a stop or driving stage to see its photo, dates, overnight plan, estimated drive time, and road-access notes.
- Open **Edit plan** to change dates, people, budgets, nights, notes, or accommodation. Move or remove intermediate stops, add another existing destination, or add a custom place with a verified latitude/longitude.
- The dates update automatically. If the nights do not fit the return-flight window, a warning stays visible; the return date is never silently changed.
- **Copy this plan’s link** creates a snapshot link. Anyone opening it sees that exact itinerary, even if their device has a different saved plan.
- **Export plan** saves a JSON file; **Import a plan** loads one. **Restore original plan** returns to the published default.
- **Print itinerary** includes every day, even if a day filter is selected.

Changes save on the current device. This static site has no accounts, server database, or simultaneous group editing. A copied link or exported file is how to share a revision. Do not expect one person’s browser edits to change everyone’s starting plan.

## Update the shared starting plan

1. Edit the plan on the site and export it.
2. Replace `data/trip.json` with the exported file.
3. Run the checks below and push the change to the publishing branch after the applicable Git review/integration policy is satisfied.

The repository is bootstrapped from a minimal `staging` baseline, with the site on **`feature/trip-planner`**. GitHub Pages publishes that feature branch’s root. This publishes the requested website without merging into protected integration branches. No `main` branch is used. Future integration into `staging` requires the owner’s explicit approval under the standing Git policy.

To add or refresh researched destination information, edit `data/destinations.json`. Pin coordinates, their sources, and driving traces live in `data/route-geometry.json`. Custom places in an exported plan need no source-code edit to appear.

## Road geometry

The initial map contains ten simplified **OSRM / OpenStreetMap** road traces, approximately 1,711 km in total. Driving times are the itinerary’s rural-condition planning ranges, not optimistic router durations. Orkhon → Tsenkher deliberately returns via Kharkhorin and the highway-side Tsenkher town. Lake travel goes via Tsetserleg.

Changing the order reuses an existing road trace only when the same endpoint pair is known (reversing it where appropriate). **New endpoint pairs appear as dashed, unrouted connections** with no invented road distance or driving time. A manual time override can be entered in the stop editor, but the line remains labelled unrouted.

To replace a dashed connection with a researched route, add a segment keyed by endpoint IDs to `data/route-geometry.json`. Ulaanbaatar’s segment alias is `ub`. Use:

```json
{
  "geometryKind": "road",
  "coordinates": [[47.0, 102.0], [47.1, 102.1]],
  "geometrySource": "https://source-of-the-actual-road-trace.example",
  "routedKm": 100,
  "notes": "Explain the source, waypoints, and any unverified access."
}
```

The coordinates above illustrate the format only. Do not use them as a route. Store an actual sourced road polyline and retain the OpenStreetMap attribution. For new destinations in the shared catalogue, add a source-backed pin and content; for custom exported places, route keys use the `custom-…` ID.

These traces **are not navigation or access approval**. The route source snaps roughly 0.9 km from the waterfall landmark and 0.3 km from the spring source. Pins mark destinations, not confirmed camps. Ask hosts for arrival pins and confirm surfaces, fords, weather, park access, rental permission, and recovery coverage before travel.

## Photos and licences

Nine geographically checked photographs are stored locally, resized to 1400px and converted to WebP. Credits, source links, licences, and modification notices are in `assets/photos/manifest.json` and displayed in the site’s credits dialog. The hero reuses the Great White Lake photo. Tsenkher’s photo shows Shiveet Mankhan’s gers rather than the pools.

Each photo retains its own CC0, CC BY-SA 2.0, or CC BY-SA 4.0 licence. Keep author, source, licence, and modification attribution when changing or redistributing images. The website code is MIT-licensed; photograph licences are separate. Leaflet 1.9.4 is vendored with its licence. Map and road data are © OpenStreetMap contributors, ODbL.

## Cultural scheduling

The Nomads World Cultural Festival took place on **21–23 August 2026 near Nalaikh**. A confirmed official 2027 schedule was not found as of **11 October 2026**. It is an optional event, not a fixed booking. Keep the final accommodation flexible and update the page when the official programme is published.

- [Official 2026 Nomads Festival programme](https://www.gov.mn/news/n/84ee)
- [Orkhon Valley UNESCO description](https://whc.unesco.org/en/list/1081)
- [Mongolia travel guidance](https://www.auswaertiges-amt.de/de/reiseundsicherheit/mongoleisicherheit-222842)

## Local preview and checks

No installation or build step is required. Use Node 20+ for the checks:

```sh
npm test
npm run check
python3 -m http.server 8789 --bind 127.0.0.1
```

Open `http://127.0.0.1:8789/`. Opening `index.html` directly as a file will not load the JSON data in most browsers. All internal assets use relative paths and work under a GitHub Pages repository subpath.

The test suite covers the fixed flight window, date arithmetic, changed-night overruns, malformed imports, safe rendering of text, Unicode sharing, custom destinations, unknown road connections, and the deliberate Orkhon detour. A validation workflow runs on feature-branch pushes and staging PRs.

## Hosting

GitHub Pages is configured to deploy from `feature/trip-planner`, folder `/` (root), with `.nojekyll`. The site needs no secret keys, billing service, analytics, or backend. Map tiles load from OpenStreetMap when online; the itinerary, photos, and stored road geometry are served with the site. The tile layer is not an offline navigation map.
