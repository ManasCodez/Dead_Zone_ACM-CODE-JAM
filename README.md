# DEAD ZONE: LAST STAND

A third-person zombie survival adventure built with Three.js, vanilla JavaScript, Vite, and Web Audio. Push north through an abandoned city, loot enterable buildings, unlock weapons, and activate extraction. Characters, city geometry, effects, grenades, and music are procedural. No backend, API keys, or paid assets are required. Desktop keyboard and mouse required.

## Tech stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Rendering | Three.js 0.180 / WebGL | 3D world, procedural models, lighting, particles, animation, and raycasting |
| Game logic | Vanilla JavaScript (ES modules) | Player controls, combat, zombie AI, missions, pathfinding, inventory, and extraction |
| Interface | HTML5 and CSS3 | Menus, HUD, compass, maps, prompts, and cinematic overlays |
| Audio and video | Web Audio API and HTML5 Video | Procedural music/SFX plus `intro.mp4` and `extraction.mp4` playback |
| Tooling | Vite 7 and npm | Local development server, asset bundling, and production builds |
| Testing | Node.js test runner and Playwright | Logic regression tests and browser-based gameplay checks |
| Storage | `localStorage` | Saves the local personal-best score only |

The game is entirely client-side: it has no server, database, authentication, analytics, or third-party gameplay API. Models, materials, textures, effects, and music are generated locally in code. Google Fonts are an optional visual enhancement; system fonts keep the game usable offline.

## Requirements and setup

Use Node.js 20.19+ or 22.12+ and a modern desktop browser with WebGL 2 support:

```sh
npm install
npm run dev
```

Open the Local URL Vite prints, normally http://127.0.0.1:5173, and click **ENTER THE DEAD ZONE**. The root `intro.mp4` plays full-screen first, fades to black during its final second, and transitions into gameplay. Click the game after the cinematic to capture the mouse. **Skip Intro** / Esc skips through the same fade. Restarting a run starts gameplay directly. The video is bundled automatically by Vite for static deployment; replace `intro.mp4` to change it.

```sh
npm test              # Run gameplay regression tests
npm run build         # Create the production build in dist/
npm run preview       # Preview the production build locally
npx playwright test   # Run browser tests (with npm run dev running separately)
```

Browser tests use the installed Brave browser on macOS. Set `BROWSER_PATH` to another Chromium executable if needed. Dev-only game inspection is available through `window.__DEAD_ZONE__`; production builds omit it.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move relative to the camera |
| Mouse | Aim / rotate the camera |
| Hold left mouse | Fire |
| Hold right mouse | Zoom to aim with the centered crosshair; release to restore normal view |
| Mouse wheel | Next / previous collected weapon |
| 1–4 / Q | Select weapon / cycle collected weapons |
| Shift | Sprint |
| Space | Jump |
| R | Reload |
| E | Search the current objective cache or collect a nearby gun |
| Hold G | Preview grenade trajectory; mouse changes throw direction and elevation |
| Release G | Throw the grenade |
| M / music button | Toggle background music |
| Tab / map button | Open or close full tactical map (pauses the simulation) |
| Esc / pause button | Pause |

Right-click aiming smoothly narrows the field of view, brings the shoulder camera closer, and lowers mouse sensitivity. The reticle stays at the center used for hit detection. Releasing right mouse restores the normal view. Pause, death, victory, and restart clear the zoom. If pointer capture is unavailable, hold right mouse to aim. Losing focus or capture pauses gameplay and cancels an unthrown grenade without spending it.

## Northbound route

Follow the enlarged gold objective arrow at the top of the screen. Navigation routes around obstacles and guides you to the street-facing entrance first, then to the supply chest inside. The HUD map is 280 pixels wide on desktop, labels all enterable buildings, and draws your current route. Press **Tab** for the full city map with named objectives, entrance dots, chest symbols, weapon diamonds, enemies, and your heading. Tab or Esc closes it; gameplay pauses while it is open. Road and floor arrows are disabled. Each chapter requires both searching its cache with **E** and eliminating the specified number of infected. Supplies can be secured before finishing the fight. New destinations receive an ambush. You can keep moving while fighting; waves continue during the journey.

1. **Ash Street Clinic** at (-28, -23): enter through the opening facing the street. Search the central cache, eliminate two infected, and collect the VX–9 SMG under the gold beacon.
2. **North Block Armory** at (22, -69): search the cache, eliminate three infected, and unlock the BREACH–12 shotgun.
3. **Relay Safehouse** at (-22, -114): recover the codes, eliminate three infected, and collect the M–60 LMG.
4. **North Extraction** at (0, -172): activate the beacon with E to begin the final wave. Clear every live infected and every pending spawn, then follow the objective arrow to the rescue helicopter at (12, -173). Approach its open side door and press **E** to board. Victory appears after the evacuation sequence.

All three supply buildings have open, four-unit doorways, solid walls, furnished interiors, supplies, and overhead shelter. Look for **numbered ENTER signs** above their roofs and illuminated entrance frames (gold for the current objective, mint for other enterable buildings). The clinic has a rooftop medical cross, the armory has reinforced brick cladding and equipment crates, and the safehouse has a rooftop antenna and satellite dish. Their facades use different colors, canopies, and corner reinforcements. Weapon caches have tall **gold light columns**, glowing rings, and lights. Guns unlock when collected with E and remain available in the inventory. The starter rifle has a spare cache near the starting area. Each gun keeps its own magazine and reserve when switching; switching cancels its reload.

The objective chest is a large strapped case with a glowing latch, gold ground ring, and a floating **SUPPLY CHEST [E]** label while inside the active building. Press E near it to open the hinged lid and collect supplies; the opened case stays open, its marker clears, and the objective changes to clearing remaining hostiles. All chest lids and markers reset on restart.

Searching an objective grants 25 HP, 90 reserve rounds, and two grenades (subject to caps). Kills award 25 XP; completed intermediate chapters award 75 XP. Every 150 XP increases survivor level and restores 15 HP. The HUD shows XP, level, objective distance, task completion, and kills still needed.

## Helicopter evacuation and cutscene

The rescue helicopter is parked beside the northern beacon on a marked helipad. It has a modeled cockpit/cabin, sliding side door, skids, tail boom, fins, spinning main/tail rotors, navigation lights, and cabin seats. Its fuselage blocks walking and bullets as part of the environment. The map labels it **HELI**.

The final beacon starts an 18-enemy mixed final wave; existing survivors of earlier waves must also be eliminated. Distant enemies are repositioned near the landing zone so the final fight can finish locally. Boarding stays locked until the final queue and all living enemies are cleared. Normal waves stop at the final chapter. The door opens and rotors spool up when evacuation becomes ready; the compass and interaction prompt direct you to the boarding point.

If neither supported movie is present, or playback fails, pressing E plays an approximately ten-second in-engine cutscene: the survivor walks up the step into the cabin, the door closes, rotors accelerate, and the helicopter rises and flies away. Gameplay input, enemy attacks, survival time and spawning are suspended during the sequence. Esc or the cutscene skip button completes evacuation early. Restart restores the parked helicopter, visible player, closed door, and locked boarding state.

**The supplied `extraction.mp4` is connected as the evacuation movie.** Replace it in the project root, then restart Vite or rebuild. The alternate name `escape.mp4` is also supported when `extraction.mp4` is absent. The game automatically uses the selected file for the evacuation cinematic after boarding; the video is bundled by Vite just like `intro.mp4`. It fades out into the victory screen when playback ends. If decoding fails, the procedural sequence remains available as a fallback. No missing-video request is made when the file is absent.

## Production deployment

`npm run build` creates a self-contained static build in `dist/`. The Vite configuration uses relative asset paths, so that directory can be deployed beneath a subpath on any static host. Keep `intro.mp4` and `extraction.mp4` in the project root before building; Vite fingerprints and copies both files into the output automatically. Do not open `dist/index.html` directly with a `file://` URL—serve it over HTTP with `npm run preview` or a static host.

## Combat and supplies

| Weapon | Magazine | Damage | Shots/sec | Reload |
| --- | --- | --- | --- | --- |
| AR–25 rifle | 30 | 25 | 5 | 2 s |
| VX–9 SMG | 40 | 15 | 11.8 | 1.6 s |
| BREACH–12 shotgun | 8 | 13 × 8 pellets | 1.25 | 2.7 s |
| M–60 LMG | 60 | 32 | 6.9 | 3.5 s |

The shotgun has a 32-unit range and pellet spread; automatic weapons have different range, spread, and recoil. Bullets originate at the visible barrel, and cover blocks them. The weapon is enlarged and held forward on the right side of the body. Both hands follow the gun using a two-bone pose while it aims. Gun, body, and camera recoil recover smoothly. Movement uses acceleration and deceleration, articulated knees and hips, alternating recovery strides, shoulder sway, gentle body bob, a responsive weapon carry, and camera smoothing. Walking remains 4.8 units/second. Holding Shift while moving increases speed by **20%**, to **5.76 units/second**, with a smoothly blended running pose.

Every wave includes all five zombie types, including wave 1: shambler (75 HP), runner (50 HP), armored tank (225 HP), crawler (40 HP), and bloater (150 HP). Waves now have 50% more infected: 8, 12, and 18 for the opening waves, then 24, 30, and six more per subsequent wave. Fractional counts are rounded up. Spawns occur away from the survivor in clear spaces. Local obstacle steering and separation keep AI lightweight; complex corners can delay enemies.

Walk near health kits (+30 HP), ammo (+60 reserve), adrenaline (+50% speed for 12 seconds), or grenade bundles (+2 grenades). Supplies also drop from defeated infected. Full health/ammo/grenade pickups remain until useful. Maximum reserve ammunition is 360 per gun; maximum grenades is six.

## Grenades

Start with two grenades. **Hold G** to show a gold ballistic arc and landing/detonation marker. Aim with the mouse and move to change the release point. **Release G** to throw; a grenade is spent only on release. Grenades have a **1.6-second fuse** after release. The render loop catches up short frame stalls in bounded physics steps so low frame rates do not unnecessarily stretch gameplay timers. The thrown grenade and its battlefield pickup share a segmented metal shell, safety lever, pull ring, and fuse collar. They stop at the ground or solid geometry and explode within a seven-unit radius, dealing distance-scaled damage to zombies. Cover blocks blast damage. The preview and thrown projectile use the same gravity and collision routine. Preview stops at first impact or fuse expiry. Grenades do not cause player self-damage. Pausing freezes thrown grenades and cancels the preview. Explosions layer a white-hot flash, expanding fire puffs, drifting smoke, sparks, flying fragments, a ground shockwave, a short light pulse, and distance-scaled camera shake. Smoke clears after roughly 2.35 seconds; restart disposes every projectile and effect.

## Safe zone

Red lights and ground markings indicate the safe corridor. Leaving x = -38…38, z = -184…26 causes **10 HP damage every second**, after a one-second grace period. The warning tells you to return; damage stops on reentry. A larger outer collision boundary prevents leaving the generated ground. The northbound route extends beyond the original square arena.

## Audio

An original 144 BPM industrial score layers drums, bass, minor arpeggios, and chords; later waves add intensity. Web Audio schedules notes on its own clock. Music starts after interaction, fades on pause and game over/victory, and restarts with a new run. M toggles music separately from sound effects. No audio files are downloaded.

## Files

```text
index.html / style.css  Menus, objective HUD, controls, victory screen
Intro.js                Opening video, end fade, playback fallback, game transition
intro.mp4               User-supplied opening cinematic
main.js                 Lifecycle, input, waves, pickups, rendering
Player.js               Smooth movement, camera, weapon aiming, recoil
Models.js               Higher-poly characters, geometry detail levels, hand placement
Geometry.js             Rounded shapes, sculpted detail batching, fabric/skin maps
Architecture.js         Beveled facades, instanced window frames, roof/interior fittings
Weapons.js              Weapon specs, gun models, resource disposal
Zombie.js               Enemy variants and AI
World.js                City, detailed buildings, animated chests, collision, supplies
Surfaces.js             Reusable procedural brick, concrete, asphalt, wood textures
Navigation.js           Obstacle-aware pathfinding and entrance goals
MapRenderer.js          Labeled local and full city maps
Mission.js              Objectives, XP/levels, hazard damage, final-wave boarding gate
Helicopter.js           Rescue aircraft, helipad, cabin door and rotor animation
Extraction.js           Boarding/takeoff sequence and optional extraction.mp4 playback
Grenades.js             Preview, ballistic flight, collision, 1.6-second fuse
GrenadeModel.js         Segmented shell, safety spoon, collar and pull ring
BlastEffect.js          Fire, flash, smoke, sparks, fragments, shockwave, cleanup
Combat.js               Raycast shooting, ammo, inventory, sound effects
Music.js                Procedural background score
UI.js                   HUD, radar, compass and notifications
rules.js                Wave rosters and sizes
vite.config.js          Relative asset paths for static deployment
tests/                  Gameplay and adventure regression tests
browser-tests/          Browser controls and full-route checks
```

The player uses approximately 60,000 triangles up close, including rounded armor, contoured limbs, modeled fingers, helmet trim, communication gear, straps, pouches, boot details, and a refined rifle. Zombies use roughly 43,000–56,000 triangles each up close, with smoother anatomy, sculpted faces, nails/teeth, and type-specific armor or growths. Mottled skin and woven fabric maps add surface detail. Their articulated arm and leg pivots, forward reach, and weapon grip placement are preserved.

Distant zombies switch to simplified geometry beyond 32 units and return to full detail within 26 units. Hidden cosmetic details are excluded from raycasts; both geometry levels still take damage. Buildings use beveled structural walls plus genuine window frames, mullions, sills, downpipes, flange rings, rooftop tanks and ventilators. Repeated window parts use instancing; rigid decorative geometry is batched by material. Facade accessories reduce beyond 75 units while the textured building shell remains visible. Supply rooms also have framed glass, shelving, radiator fins, light fittings, and clinic/armory/relay-specific equipment. Decorative props preserve the existing doorway and chest approach paths.

Building, road, and chest surfaces use locally generated 512-pixel tileable textures, with grain, mortar, cracks, staining, and bump detail. Tall buildings have facade trim, canopies and reinforced corners. These surfaces share cached materials and texture maps; no external texture downloads are needed.

Optional Google Fonts enhance typography when online; system fallback fonts work offline. Required game resources are bundled in dist. A fixed pool of eight nearby point lights preserves local lighting without recompiling every material when a gun pickup is collected. Device pixel ratio is capped at 1.6; shadows use one sun light that follows the survivor. Performance depends on hardware and active enemy count. Restart resets health, inventory, grenades, thrown objects, enemies, loot, XP, and route progression without refreshing.

## Manual testing checklist

- [ ] Enter the game; move, aim, sprint, jump, fire, and reload.
- [ ] Hold right mouse to zoom, aim and fire through the centered reticle; release to zoom out.
- [ ] Gun and hands are visible; bullet trails start at the barrel.
- [ ] Scrolling in both directions skips locked weapons and wraps inventory.
- [ ] Follow the large gold arrow at the top of the screen to the lit entrance.
- [ ] Tab opens a larger labeled city map, pauses the run, and resumes on close.
- [ ] Recognize the clinic cross, armory brick facade, and safehouse satellite dish.
- [ ] Find the labeled gold-ring chest; E opens its lid and removes its active marker.
- [ ] Follow the compass north; enter all three buildings through their doors.
- [ ] Gold weapon beams are visible and E unlocks the indicated gun.
- [ ] Search objective caches and satisfy combat quotas to advance chapters.
- [ ] Hold G: arc appears without spending a grenade; release G: throw follows the arc.
- [ ] Grenades hit walls/ground and damage nearby infected; cover blocks the blast.
- [ ] Grenade pickups refill inventory; G with zero grenades gives feedback.
- [ ] Leave the red safe boundary: warning and periodic HP loss; return to stop damage.
- [ ] All five enemy types appear from wave 1 and can attack the survivor.
- [ ] Pause freezes enemies/projectiles; releasing G during pause throws nothing.
- [ ] Activate the northern beacon: final wave begins, boarding stays locked.
- [ ] Clear all remaining infected: helicopter door opens and boarding prompt appears.
- [ ] Press E at the side door: boarding/takeoff plays, then victory appears.
- [ ] Skip and restart work; the aircraft returns to its helipad with boarding locked.
- [ ] Death, restart, music toggling, and compact window layouts work.

## Static deployment

```sh
npm ci
npm run build
```

Deploy the contents of `dist/` to GitHub Pages or another static host. Vite uses relative asset paths so repository subdirectories work. Use a Pages Actions workflow or your preferred static deployment tool. Serve over HTTP(S), not file://. No runtime backend or service is needed.
