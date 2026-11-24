# Campaign upgrade implementation record

The source remains a local Vite/Three.js project. The existing Vercel URL is a reference deployment; local edits require a fresh deployment to appear there.

## Milestone 1 — Audit

- Initial baseline: 29 logic tests passed.
- Existing architecture, controls, audio, procedural assets, navigation, video transitions, and extraction were inspected before implementation.
- A representative Chromium menu render initially reported 1,607 draw calls, 1,229,811 triangles, 1,624 geometries, and 22 textures. These are renderer counters, not hardware FPS benchmarks.
- Main gaps: ray-only camera collision, direct-chase crowds, no settings/checkpoint/upgrade systems, frequent disposable combat effects, and a short linear route.

## Milestone 2 — Movement, camera, and combat

- Added camera-volume clipping, collision-safe smoothing, shoulder switching, interior camera distance, configurable look/aim sensitivity and FOV.
- Preserved 4.8 walking speed and exactly 5.76 Shift speed; added landing response, reload motion and grenade throw motion.
- Added headshots, hit/critical/armor/kill feedback, frontal armor, range falloff, delayed auto reload, semi-automatic weapons, reusable shells/tracers/impact particles, and voice-limited sound effects.
- Grenade preview and flight share deterministic fixed steps, wall/floor bounces, damping, and a 1.6-second fuse.
- Primary files: Player.js, CameraRig.js, Models.js, Combat.js, CombatEffects.js, Grenades.js, GrenadePhysics.js, Weapons.js, BlastEffect.js.

## Milestone 3 — Infected and crowd behavior

- Added Screamer, Brute, Spitter, Stalker, Riot, Exploder and Alpha silhouettes and behavior.
- Added perception/noise alerts, attack windups, stagger, flanking, shared crowd navigation, spatial separation, reduced distant update frequency and a live-spawn cap.
- Alpha phases add toxic projectiles, reinforcements and increased movement pressure.
- Primary files: Zombie.js, Models.js, EnemyNavigation.js, SpatialHash.js, EnemyHazards.js, rules.js.

## Milestone 4 — City and objectives

- Extended the northbound route and safe corridor to the northern landing zone near z = -260.
- Added six named districts, cross streets, four optional blue-lit interiors, generator defense, keycard recovery, destructible growths, survivor escort, radio text and discovery-based map markers.
- Existing gold main-objective guidance and weapon beacons remain; road arrows remain disabled.
- Batched static city geometry into spatial/material groups. The final representative menu view reported 491 draw calls and 596 renderer geometries, versus 1,607 and 1,624 initially. Draw calls fell by roughly 69%. These views are representative counters rather than a controlled hardware FPS benchmark; results depend on camera, preset and active enemies.
- Primary files: World.js, Districts.js, Mission.js, Navigation.js, MapRenderer.js, Helicopter.js.

## Milestone 5 — Progression and saves

- Added three-choice upgrades, point/rank limits, exact bonuses, safe checkpoint continuation, validated/versioned storage, difficulty and challenge modifiers.
- Added marksman rifle and heavy revolver caches as optional-mission rewards.
- Campaign completion unlocks endless survival; run scores remain browser-local.
- Primary files: Campaign.js, Storage.js, Statistics.js, Difficulty.js, Weapons.js, main.js.

## Milestone 6 — Settings, HUD, and accessibility

- Added graphics presets, separate volume controls, sensitivity, FOV, crosshair appearance, reduced motion/flashes, subtitles, keyboard-focus handling and persistent mute.
- Added a short controls tutorial, specialist/boss feedback, directional damage, loading feedback and optional F3 renderer statistics.
- Checked UI at 1280×720, 1920×1080 and 2560×1440 in Chromium.
- Primary files: Settings.js, UI.js, style.css, index.html, Music.js, Combat.js, Intro.js, Extraction.js.

## Milestone 7 — Extraction and end-of-run flow

- Relocated the helicopter with the enlarged route; the final 18-enemy queue includes specialists and the Alpha.
- Boarding still requires all queued and living infected to be cleared.
- Preserved the supplied extraction video and procedural fallback; added detailed victory statistics and completion unlocks.
- Restart clears temporary effects, enemies, upgrades, quest state, hazards, inventory, helicopter and mission state while preserving user settings and checkpoint data.

## Milestone 8 — Verification

- Dependency installation from the npm cache succeeded.
- All 43 logic tests pass, including camera, grenade, storage-denied fallback, upgrades, crowd routing, specialist behavior, headshots, semi-auto, reduced flashes and effect-pool tests.
- All 20 Chromium test cases passed across split validation runs: eight legacy checks, five campaign-upgrade checks after the focus fixes, and the seven remaining legacy checks. The added cases cover settings persistence/layout, upgrade spending and Escape behavior, checkpoint restoration, corrupt score recovery, optional rewards, all twelve final-wave classes, restart resource bounds, Endless boundary damage and challenge modifiers.
- QA caught and fixed a repeated-key performance-toggle issue and keyboard focus lost during upgrade-choice rebuilding. Hidden modal key handlers now stop intercepting gameplay keys.
- Production-browser checks passed shooting, aiming and grenades with online fonts blocked and no page errors. Required HTML/CSS/JS returned HTTP 200; both MP4 assets returned HTTP 206 with video/mp4 MIME types. The production bundle omits the development inspection global.
- Production build succeeds. The existing Three.js vendor chunk still produces Vite’s advisory size warning; its compressed size is about 129 KB.

| Representative menu counter | Initial | Final |
| --- | ---: | ---: |
| Draw calls | 1,607 | 491 |
| Rendered triangles | 1,229,811 | 1,226,926 |
| Renderer geometry allocations | 1,624 | 596 |
| Renderer textures | 22 | 31 |

The texture increase includes the new district, quest and interface labels. The grenade/tracer pools and repeated-restart checks bound temporary renderer allocations; full JavaScript heap profiling on physical target hardware remains useful.

## Practical limits

- FPS targets on integrated and discrete GPUs need physical hardware profiling; software WebGL tests verify behavior and render/resource counters.
- Models and animations remain procedural. The movement adds gait, recoil, landing and reload improvements; it does not claim motion-captured animation or a terrain-adaptive full-body IK solver.
- The city includes seven enterable mission/optional interiors and six named districts. Rooftop traversal, a separate tunnel level, a paid-asset pipeline and multiplayer are outside this implementation.
- Audio is synthesized locally; radio dialogue is subtitled rather than voice acted.
- Static hosting still needs the generated dist/ directory and both bundled cinematic MP4 files.
