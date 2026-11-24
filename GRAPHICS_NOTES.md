# Graphics update

## Night theme and weapon reloads

The current game uses a generated midnight-blue sky with a moon glow, cool moonlight, darker distance fog, warm practical lighting and static red warning beacons on selected streets and in enterable rooms. A small cool light anchored to the survivor lifts the character and weapon silhouette at normal third-person distance. The emergency and survivor lights feed the existing **eight active point-light pool**; they do not add unbounded active lights or shadows. Reduced Flash still suppresses the existing flashing light modulation. Loot columns, lit entrances, signs, top objective arrow and HTML HUD remain readable in the [night review gallery](./graphics-review/night/index.html).

All six guns use their existing visible models and separate moving reload parts: rifle/SMG/marksman magazine and bolt, LMG box magazine and feed cover, shotgun shell and pump, and revolver swing-out cylinder and speedloader. The support hand follows a gun-local grip point throughout each pose while the aiming direction and third-person camera remain active. The shotgun adds ammo one shell at a time at the corresponding insertion boundary; interrupted reloads keep inserted shells and conserve the remaining reserve. Other guns transfer ammo when their reload completes. Original reload durations and weapon statistics are unchanged.

The review script `scripts/reload-night-review.mjs` captures fourteen real-game 960×540 Balanced frames and writes `graphics-review/night/report.json`. Its representative whole-frame counts are 919 draws for the night street, 496 for the clinic interior and 2,029 for the twelve-infected lineup. These are **render draw counts**, not frame times or hardware FPS. Compared with the older matched daytime captures, the extra visible warning fixtures and details add only a small number of draws; the eight-light limit, shadow resolutions, pixel ceilings and postprocessing presets remain as documented below. The six browser reload poses reported support-hand positions equal to their moving gun-local grips, no WebGL errors, and ammo at 45% progress of 0 for magazine/cylinder guns and 3 for the shotgun. The Node suite includes tests for each gun's moving part, hand alignment while aiming and moving, exact ammo transfer timing and shotgun interruption.

The old image galleries below show the **previous daytime art direction**. They remain useful as a visual baseline; the new gallery shows the nighttime result. Night lighting has been checked in the clinic, armory, streets, infected lineup and extraction area. There is still no separate dynamic day/night cycle, flashlight battery system or real volumetric fog.

Validation for this update: **50 Node logic tests** and **27 Playwright browser cases** pass, including full campaign, weapon switching, grenade, video, settings, extraction and graphics regressions. The final production build and bundled-video smoke test pass. The browser review uses software WebGL; physical-GPU frame pacing for the new night scene has not been measured.

## Postprocessing integration

The current source uses [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) **6.39.6** with Three.js 0.180. The installed package accepts Three.js versions `>=0.168.0 <0.188.0`. Its code is Zlib licensed; Three.js is MIT licensed. No third-party image or model assets were added. `package.json` and the lockfile contain the new runtime dependency.

`Graphics.js` replaces the previous `FullScreenQuad` shader with one `EffectComposer`: a `RenderPass` for the city, an `EffectPass` for half-resolution SSAO, thresholded bloom, a small custom cold-shadow/low-health grade and vignette, then an `EffectPass` for ACES filmic tone mapping. The composer uses half-float color buffers and 2× MSAA in Balanced or 4× MSAA in High. The renderer uses `NoToneMapping` on this path and keeps sRGB output; tone mapping occurs in the final effect pass. The DOM HUD, crosshair, subtitles, map and objective arrow are not processed. Performance mode still uses direct scene rendering with Three.js ACES tone mapping. The direct path is also used when floating-point color targets are unavailable.

Bloom selects pixels above a linear-light 1.4 luminance threshold, so white plaster and most signs do not acquire a broad glow. AO runs at half resolution with six samples in Balanced or nine in High; it deepens building recesses and prop contact without adding another scene render. The vignette is intentionally light, and the custom grade cools shadows while keeping warm practical lights and gold beams readable. Low health adds desaturation and a red edge tint based on actual player health. Reduced Flash immediately sets bloom strength to zero, while the existing combat effects independently suppress flashes and light bursts. Reduced Motion continues to suppress drifting smoke and rotor dust; there is no motion blur or grain.

The composer is resized from the CSS viewport dimensions while honoring the existing drawing-buffer pixel ceilings. Preset changes dispose the old composer, passes, depth buffers and SSAO's nested generated noise texture. WebGL context loss pauses rendering and context restoration rebuilds the pipeline. The game retains the same collision, aiming, firing, grenade, mission, save and extraction logic.

### Matched review

[Postprocessing comparison viewer](./graphics-review/postprocessing.html) compares **28 current screenshots** (14 scenes × Performance and Balanced) against the prior custom composite where an earlier capture exists. Views cover panorama, player, aiming, reload, all twelve infected classes, clinic and armory exteriors/interiors, the industrial district, an optional building, grenade explosion, helicopter extraction and low health. The low-health view compares current Performance with Balanced because no earlier capture of that state exists. PNGs are in `graphics-review/postprocessing/`; raw measurements are in [postprocessing.json](./graphics-review/postprocessing.json). The camera, 960×540 viewport, seeded randomness and review method match the older `graphics-review/after/` captures. The older [52-image gallery](./graphics-review/index.html) documents the earlier art upgrade.

In this software-WebGL sample, Balanced whole-frame draw calls rose from 602 to 910 in the panorama, 648 to 980 at player distance, and 1,271 to 2,019 with all twelve infected visible. Color-scene geometry did not change. Median synchronous CPU render submission was about 1.4 → 3.1 ms for the panorama, 1.7 → 3.0 ms for the player and 3.4 → 5.2 ms for the infected lineup. These include `gl.finish()` but are **not GPU timing or hardware frame rates**. The compositor adds depth, AO, bloom and full-screen work; it is a visible quality/cost tradeoff. A crowded-wave hardware profile remains necessary before raising effect quality further.

The separate [frame-pacing profile](./graphics-review/postprocessing-frame-profile.json) holds a third-person camera on 5 and 24 visible enemies for four warmup frames and 24 measured `requestAnimationFrame` intervals. On Chromium/SwiftShader at 960×540, Performance median/P95 intervals were **667/1,217 ms** with five enemies and **1,450/1,633 ms** with 24. Balanced measured **883/1,267 ms** and **1,767/1,950 ms** respectively. The software renderer reports an available GPU timer extension, but this script does not issue timer queries; no GPU timings or hardware FPS are claimed. These scenes expose a high crowded-wave cost in this environment, so increasing SSAO or bloom quality further is not justified by these results.

The composer uses two full-resolution half-float color buffers with depth and multisample storage, a stable depth copy, one half-resolution AO target, a half-resolution depth/normal target and bounded bloom mip levels. At 960×540, a conservative two-buffer color allocation estimate is about 23.7 MiB for Balanced's 2× MSAA before depth, auxiliary targets and driver overhead. `renderer.info.memory.textures` in the 28 current captures ranged from 44 to 93; this is an object count affected by capture order, not measured VRAM. Repeated preset switching stabilized at 76 textures in High/Balanced and 56 in Performance after warmup. The prior graphics update's frame-profile and map-memory estimates below are historical and do not describe the new composer.

Optional outlines, shockwaves, grain and combat depth of field were left off: chests and guns already have clear world-space light markers, grenade blasts already have a ground shockwave, and extra full-screen effects would compete with enemy visibility and the software-WebGL budget. The low-health treatment is the only custom game-state shader. High quality increases SSAO samples and MSAA, but no separate night scene is available in the game's current daytime city. Additional physical-GPU testing remains useful.

### Current validation

All **47 Node logic tests** pass. In the first complete browser run, 20 of 22 cases passed; two gameplay cases failed while the shader was being edited under the live Vite server and both passed on a settled-source rerun. The final graphics suite passes preset rendering, repeated switching and stable texture counts, reduced effects, WebGL context loss/restoration, and all screenshot-gallery paths. The final production build passes; a built-game browser smoke check returns HTTP 200 for the page, HTTP 206 `video/mp4` range responses for both bundled movies, and reaches gameplay after skipping the intro. The production bundle does not expose the development game hook. The build reports a chunk-size warning for Three.js; it is a loading-size advisory, not a compilation failure.

## Previous art and renderer update

This update builds on the existing procedural Three.js game. It preserves collision footprints, mission routes, controls, inventory, upgrades, checkpoint formats, videos, wave rules, extraction, the 4.8-unit walking speed, the exact 20% Shift boost, and the 1.6-second grenade fuse.

## Implemented visual work

- **Art direction:** cool slate/blue city lighting, warm practical lights, less uniformly green masonry, quieter road texture, readable entrance colors, and gold weapon/objective markers. The existing top arrow remains; no road arrows were added.
- **Materials:** `MaterialLibrary.js` generates seven shared sets of 256px color, tangent-space normal and roughness maps. Color maps are sRGB; data maps are linear. `Surfaces.js` applies world-scale UVs, with brick/mortar density separate from road and concrete scale. Clothing, skin, weapons, grenades and helicopter paint use the same cached library. Skin and cloth are rougher than glass and bare metal.
- **Player:** a tapered torso, overlapping thigh/shoulder transitions, clothing folds, boot soles, pocket details, pack straps, buckles and a bedroll. Added ankle response, restrained backpack motion, headgear stabilization and visible magazine displacement during reload. Existing two-bone grips and muzzle-origin raycasts remain.
- **Infected:** rounder eye sockets, smaller eyes, tapered mutation spikes, anatomical collar/neck details, exposed arm bones, damaged clothing, shield trim, throat rings, class-specific muscle/sac details and Alpha phase coloration. Locomotion follows actual movement after collision resolution. Attack anticipation and follow-through use the existing damage timing. Corpses settle above the road instead of continuously sinking through it.
- **City and buildings:** shared PBR facades, reflective glazing, varied distant silhouettes, rooftop/service structures, cable spans, sidewalk drains, sparse vegetation and selective shallow wet patches. Rounded abandoned sedans now have shaped cabins, windows, pillars, wheels, hubs, mirrors, grilles, lamps and worn trim. Their original collider remains intact.
- **Rooms:** ceiling ribs, conduit, skirting, wall notices, medical storage, supply stacks and electrical equipment. Added props are against walls or overhead; entrances, chests and NPC paths retain their collision layout.
- **Lighting:** one directional shadow light, cool hemisphere illumination, locally generated sky and PMREM environment reflections. All practical, explosion and cabin lights use the existing eight-light pool. Instanced soft character contact shadows also work in Performance mode.
- **Earlier post-processing:** The previous Balanced/High renderer used one custom composite pass for small-radius depth contact shading, thresholded glow, desaturation and low-health treatment. It has since been replaced by the library pipeline documented above.
- **Atmosphere:** locally generated cloud sky, distance haze, player-relative dust, soft barrel flames, bounded drifting smoke and helicopter rotor dust. Motion reduction disables drifting smoke/rotor dust and airborne dust. Flash reduction disables bloom, suppresses muzzle flash and reduces explosion light/fire/sparks immediately, including the first frame.
- **Combat:** gun-specific flash dimensions, distinct concrete/wood/glass/metal impact colors and debris, modeled grenade material wear, scaled smoke density, a softer ground shockwave and bounded explosion lifetime. Trajectory, blast damage and cover rules remain unchanged.
- **Extraction:** reflective cockpit/cabin glazing, worn paint, rivets, engine vents, cabin instruments, pooled cabin light, ground dust and landing-zone dressing. Both supplied MP4s and the procedural boarding/takeoff fallback remain supported.

All visual assets in the earlier art update were generated locally by project code, with no paid assets, API keys, downloaded models or third-party texture files. That update added no runtime packages; the subsequent postprocessing integration above adds the one documented dependency.

## Presets and bounded resources

| Setting | Performance | Balanced | High |
| --- | --- | --- | --- |
| Pixel ratio ceiling | 1 | 1.3 | 1.6 |
| Drawing-buffer pixel ceiling | 1.8 million | 2.5 million | 3.7 million |
| Sun shadow | Off | 1024² | 2048² |
| Character detail distance | 20 | 30 | 42 |
| Particle multiplier | 0.45 | 0.75 | 1 |
| HDR post target | None | 2× MSAA | 4× MSAA |
| Composite | None | Restrained | Slightly richer |
| Drifting smoke/rotor dust | Off | On | On |

Pixel ratio is reduced further when needed to stay within the drawing-buffer pixel ceiling, including 4K/5K and ultrawide displays. HDR effects fall back to direct rendering when floating-point color targets are unavailable; MSAA is capped to the renderer’s supported sample count.

Buildings retain 75-unit accessory LOD. Fine window frames use inexpensive instanced boxes; their previous dense bevels were not visible at normal street distance. Detailed character geometry retains its existing LOD/raycast interface.

Fixed limits: eight active point lights, one shadow-casting directional light, 44 instanced contact shadows, 20 environmental smoke sprites, 12 rotor-dust sprites, six soft fire sprites, 350 dust points, 180 pooled combat particles, 48 tracers and six concurrent explosion effects. Each explosion has at most 14 smoke sprites, eight fire sprites, 72 sparks and ten fragments. Targets and shadow maps are disposed when graphics quality/resolution changes; restarts reuse the static world, sky and material maps.

## Comparisons and measurements

The [comparison viewer](./graphics-review/index.html) contains **52 PNG captures**: 13 views × two presets × before/after. Run `npm run dev`, then open `/graphics-review/`. Views include the menu panorama, player, aim, reload, all 12 classes, clinic/armory exterior and interior, industrial district, optional building, grenade blast and extraction zone.

The source capture script is `scripts/graphics-review.mjs`. It seeds randomness, disables automatic simulation, sets explicit camera coordinates, uses a 960×540 viewport, performs three warmup renders and samples seven synchronous render submissions per view. It captures canvas-only images to expose the underlying visuals. `before.json` and `after.json` preserve raw counters and restart samples.

Timings are **CPU render-submission measurements in Chromium/SwiftShader**, including a `gl.finish()` call. They are not GPU timer-query results, live gameplay frame rates, or hardware performance claims. Seven samples are too few for a robust tail-latency benchmark. Browser garbage collection and shader warmup can cause outliers. High is covered by browser rendering/resize/cleanup checks, but is not part of the fixed before/after image set.

### Measured comparison

The table compares **color-scene counters on both sides**. The updated whole-frame counters separately include shadow and composite work.

| View / preset | Color draws before → after | Color triangles before → after | CPU submission median before → after |
| --- | --- | --- | --- |
| Panorama / Performance | 487 → 531 | 1,205,542 → 298,972 | 1.7 → 1.2 ms |
| Player / Performance | 515 → 566 | 1,395,144 → 366,588 | 1.5 → 1.1 ms |
| Panorama / Balanced | 529 → 602 | 1,215,028 → 318,946 | 2.1 → 1.4 ms |
| Player / Balanced | 571 → 648 | 1,431,824 → 413,444 | 2.3 → 1.7 ms |
| All 12 classes / Balanced | 1,102 → 1,271 | 1,929,552 → 1,031,440 | 4.0 → 3.4 ms |

The panorama uses approximately **74–75% fewer color-pass triangles**. Draw calls increase by approximately 9–14% in the panorama to support the added vehicles, surfaces and environment detail. This is a triangle reduction with an intentional material/draw-call tradeoff, not a claim that every performance metric improved.

Provisional review budgets for these fixed views: **1,300 color draws, 2,100 whole-frame draws, 1.1 million color triangles and 1.6 million total triangles**. The captured maximum is 1,271 color draws, 2,006 whole-frame draws and 1,520,925 total triangles. These are review envelopes, not hard guarantees for a 42-enemy horde; existing active-enemy caps and LOD remain important.

### Frame pacing and estimated memory

`scripts/profile-graphics.mjs` records a separate fixed panorama with four warmup frames and 24 animation-frame intervals per preset. The raw result is [frame-profile.json](./graphics-review/frame-profile.json).

| Preset | Software frame median / P95 | Referenced textures estimate | HDR target estimate | Shadow target estimate |
| --- | --- | --- | --- | --- |
| Performance | 250 / 266.7 ms | 35.4 MiB | None | None |
| Balanced | 333.3 / 399.9 ms | 35.4 MiB | 17.8 MiB | 8 MiB |
| High | 350 / 350 ms | 35.4 MiB | 29.7 MiB | 32 MiB |

These slow frame intervals are measurements of **software WebGL on the QA browser**, not acceptable hardware targets or evidence of 60 FPS. CPU submission times above do not include all compositor/GPU execution and must not be converted into gameplay FPS. Physical-GPU profiling is still needed. The separate no-screenshot counter audit can queue enough software work to stall; its timings are retained in `after-counter-audit.json` for transparency, but are not substituted for the matched capture timings.

Texture memory is an estimate from referenced map dimensions/types/mip levels, with a provisional **40 MiB map budget**. It is not measured VRAM and excludes geometry, browser overhead and framebuffer allocations. At the preset pixel ceilings, conservative HDR/depth/MSAA allocation ceilings are approximately **86 MiB Balanced / 212 MiB High**, in addition to maps and shadows. Half-float color and depth resolve storage are included in those conservative estimates.

Seven restart samples retained exactly **1,035 renderer geometries and 78 textures** after every restart. The last three JavaScript heap samples were 145,805,937 / 145,871,957 / 145,878,993 bytes (about 73 KB variation); the initial warmup grew before leveling out. This short sample shows no continuing renderer-resource growth, but does not replace a long-session heap trace.

### Measurement caveat

Three.js resets its default render counters after the shadow pass. The new renderer also exposes whole-frame counters including shadows/compositing. Color-scene and whole-frame counters must be distinguished when comparing Balanced results; Performance has no shadow or composite passes. Texture counts include cached assets and depend on capture order. Renderer counts are not direct VRAM measurements.

## Validation and practical limits

`npm test` passes **47 logic tests**, including existing combat/movement/mission regressions and new checks for PBR data handling, grounded death poses and first-frame reduced explosion flashes. Browser coverage includes the existing campaign/video suite plus graphics rendering, nonblack output, preset cycling, target cleanup, resize handling and reduced-effects behavior. All 22 browser cases passed across the full suite and a targeted rerun: 20 passed in the first full run; the cache-diagnostic and resize-timing failures were fixed, and all four affected graphics/navigation/settings checks then passed. The production build passes. Its JavaScript/CSS return HTTP 200 and both bundled MP4s support HTTP 206 range responses with `video/mp4`. The production bundle contains no development game hook.

Characters remain articulated procedural models; this update does not introduce photoreal scanned characters, skeletal mocap, cloth simulation, full terrain foot IK, ragdolls or destructible buildings. Small-radius depth shading is an inexpensive contact approximation, not full normal-aware SSAO or global illumination. Bloom is a restrained local filter, not a large cinematic blur pyramid. Environment reflections are static; puddles/glass do not reflect moving enemies. There is no rain, volumetric fog, motion blur, chromatic aberration or combat depth-of-field effect. These were deliberately kept outside the browser rendering budget.

The comparison gallery covers fixed scenes, not every possible 42-enemy encounter. Long-duration hardware profiling and a larger gameplay frame-time sample remain useful before raising budgets. Existing large in-world labels intentionally remain readable and can cover some background geometry in review views. No deployment was performed; the public Vercel URL continues to show its currently deployed build until a new upload.
