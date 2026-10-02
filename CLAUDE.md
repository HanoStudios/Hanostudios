# CLAUDE.md — hano.studios

Context for Claude Code working in this repo.

## What this is

Marketing site for Hano Studios, a creative agency working in Web3 / trading / fintech.
Static site: plain HTML, CSS and JS. **No build step, no package.json, no framework.**
Open `index.html` directly, or serve with `python3 -m http.server`.

Do not introduce a bundler, framework or dependency manager unless explicitly asked.

## Files

```
index.html                 landing page, all sections
work/bybit.html            case study (Figma frame 181) — the pattern for the rest
robots.txt sitemap.xml     search + AI crawler directives
llms.txt                   structured summary for AI answer engines
css/styles.css             all styles; tokens in :root at the top
js/main.js                 menu, reveals, counters, galleries, GSAP scroll sequences
assets/logo/               real brand logos (final, do not replace)
assets/img/                ALL PLACEHOLDER — see below
tools/make-placeholders.py regenerates the placeholder set
tools/make-favicons.py     regenerates the favicon set from the logomark
favicon.ico                root — browsers request this path implicitly
apple-touch-icon.png       root — iOS requests this path implicitly
assets/favicon/            the linked PNG sizes
```

## Brand tokens — do not invent new colours

From the official brand guidelines. Defined in `:root`.

| Token | Hex | Name |
|---|---|---|
| `--void` | `#0A0A0A` | Void Black |
| `--frost` | `#FFFFFF` | Frost White |
| `--nebula` | `#47127C` | Royal Nebula |
| `--aurora` | `#8B32F7` | Aurora Purple |

Type: **Instrument Sans** display + body (letter-spacing -2% to -4.5% on large sizes),
**Aleo** italic used exactly once, on "dominate markets" in the hero. The guidelines call
for restraint on the serif — keep it that way.

Heading pattern throughout is two-tone: `<h2 class="h-split"><strong>Bold lead</strong> light remainder</h2>`.

## Page sections in order

hero (pinned: title rises to centre, divides, square grows to cover) → statement
(pinned: lines reveal one per scroll, then floats and sticks) + clients → works
(horizontal pin ≥701px, plain vertical stack below — gsap.matchMedia tears the
tween down and CSS lays out the stack) → showcase carousel (video, auto-advance) →
circle wipe → services (light) → team (grows out of the white on scroll) → FAQ →
CTA → footer (Aurora purple, frame 173; the deep Nebula stays on the menu overlay)

There is no separate split section any more. The hero title itself is the element
that divides — `.ht-a` / `.ht-b` are the two words and `.hero-square` is the
transition square. Removing the hero pin means rebuilding that sequence.
The hero pin uses `pinSpacing:false` (the square covers the screen at the end, so
reserved spacing was only ever a black void) and the statement pin box is sized by
padding, not 100svh — both were the causes of the recurring "huge gap" reports.

**Frames 217-220 moved the hero nav to a top bar.** `.hero-top` is absolutely
positioned — the mark on the left, the links, then CONTACT US pushed right —
so it cannot disturb `.hero`'s space-between distribution. The tagline moved
down inside `.hero-bottom`, directly above the wordmark, which left
`.hero-bottom` as the only in-flow child and is why it carries `margin-top:auto`.
There is no `.hero-nav` at the foot any more.

The bar does **not** fade with the pin timeline: 218 and 220 both still draw it
while the words divide. Instead the desktop bar hands its corner to the menu
button, which fades in at 60svh and lands exactly on top of CONTACT US while the
hero is still pinned. That handover is a `.nav-armed` class on `<html>` toggled
beside `.menu-btn.is-visible` — **a sibling selector cannot work here**, because
ScrollTrigger wraps `.hero` in a `.pin-spacer` and `.menu-btn` is no longer its
sibling. It is scoped to `min-width:601px`; on a phone the button shows from the
first frame and the bar holds only the mark, which 220 keeps.

Phone (<=600px) drops the inline links and CONTACT US entirely and closes the
hero on `.hero-cta-bar`, a full-bleed white action bar whose negative margins
undo `.hero`'s padding. `.menu-btn` is forced visible there since it is the only
route to the nav. Figma also lists PROCESS in the bar; left out, because that
link was removed from the nav on request — restore it here and in the menu
overlay together.

Footer copyright reads "© 2026 Hano **Animations**" (frame 173 — the legal
entity); the wordmark and the menu overlay say Hano **Studios** (frame 183).
This is deliberate, not a typo.

## Every image in assets/img/ is a placeholder

Generated gradients at final dimensions with final filenames. **To swap in real work,
overwrite the file at the same path. No code changes needed.**

| Path | Count | Dimensions |
|---|---|---|
| `assets/img/works/` | 5 | 4 real posters (`.jpg`) + 1 placeholder (`.svg`) — see below |
| `assets/img/showcase/` | 5 | posters, real frames of the clips |
| `assets/img/services/` | 6 | 800×800 (1:1) — currently unreferenced, see below |
| `assets/img/team/` | 3 | 13:10 landscape — **real photos, not placeholder** |
| `assets/img/og-image.jpg` | 1 | 1200×630 |

**Smardex, Ben & Jerry's and Trayler are appended after the original five
cards**, with stills cut from Figma exports
(`assets/img/works/{smardex,ben-jerrys,trayler}.jpg`). Smardex links to
`work/smardex.html` and plays `assets/video/works/smardex.mp4` (from
`SMARDEX Showcase 8s.mp4`, usual settings, `-an` — the master has no audio
stream); its still is the launch visual from the Figma card, not a clip frame.
Ben & Jerry's and Trayler have no clip and no case study yet, so no
`<a class="work-link">`. Their title marks are the white
`clients/grid/` versions, the only artwork supplied for them. The Figma's
works frames (228-229) carry older copy, order and text titles; on request the
five existing cards were left exactly as they were.

**Four of the five work cards play their mockup clip, not a still.** Bybit,
Kalshi, Hano Crypto and Maxy each hold a `<video class="work-video" data-src="...">`
inside `.work-img`, on both `index.html` and `work/index.html`. Encoded from
`Bybit mockup.mp4`, `Kalshi Mochup Video.mp4`, `Hano Crypto Mock Up.mp4` and
`Maxy Render Video.mp4` in the repo root (gitignored) — all genuinely 16:9, no
rotation trap on any of them — at the usual CRF 27 / long edge 960, but `-an`:
they are ambient card visuals and carry no audio. Only Levels Socials keeps its
placeholder `.svg`, because no clip was supplied for it.

Maxy's card has no `<a class="work-link">` wrapper — its case study does not
exist yet — so the `<video>` nests straight inside `.work-img`. The controller
selects on `.work-video[data-src]`, not on the link, so this works unchanged;
don't add a wrapper to "match" the others until the page is built.

The still stays as the `.work-img` background and is never replaced: it is the
poster, painted before a byte of video is fetched and left in place if the clip
fails, if the visitor has reduced motion, or if the card is never reached. The
clip fades in only on the `playing` event, so a stalled video never shows a
black rectangle. `assets/img/works/{bybit,kalshi,hano-crypto,maxy}.jpg` are frames
grabbed from those clips at `-ss 1`; the `.svg` versions they replaced are gone.

The controller lives in main.js **outside the GSAP block** — these have to work
under `.no-gsap`, where the Works strip degrades to a plain `overflow-x:auto`
container. Testing that path means scrolling the section into view vertically
*first* and then panning the container sideways; panning while it is still
off-screen gives the IntersectionObserver nothing to fire on and looks like a
bug in working code. On the landing page proper, `scrollIntoView` on a card is
also the wrong move: the strip is pinned and travels horizontally with *page*
scroll, so a card's own scroll position never brings it into view.

**`assets/img/team/` is real, not placeholder.** Frame 239 puts three cards
across the full width with the stats as one row beneath, and draws each photo in
a 772x594 box — hence `.member-photo{aspect-ratio:13/10}`. Johannes and Hannah are
cropped from the HD originals in `Team Photos/` (`JohannesHD.JPG`,
`HannahHD.JPG`) to 800x615, framed head-to-chest the way 239 draws them:
Johannes `crop=820:631:335:255`, Hannah `crop=960:738:0:390`. His original is
*landscape* 1280x961 with him small and off-centre right, so a plain resize
reintroduces the old "zoomed out" complaint — redo the framing by hand.
Tim (`tim.jpg`, surname not supplied — the card says just "Tim", as 239 does)
has no HD original: it is cut from the Figma export of frame 30 at
`crop=772:594:40:40`, i.e. exactly 239's photo box, and is only 772px wide.
Overwrite it if a proper original turns up.

**`assets/img/clients/` is real, not placeholder.** Every mark is the client's own
artwork, and the same files are reused as the works-card titles (`.work-logo`),
with a visually-hidden `<h3>` kept beside each so the cards still have headings. The eight PNGs are built from `Client Logos/` (repo root) by
`tools/make-client-logos.py` — re-run that after changing anything in there, don't
hand-edit the output. They are tightly cropped, *not* padded to a fixed canvas: the set
mixes wide wordmarks with square roundels, and the CSS caps both width and height so the
two kinds land at the same optical weight.

**The client wall uses its own white set, `assets/img/clients/grid/`.** Frame
226 draws all eighteen marks in plain white on `--ink-08` tiles (6x3, 2px gap,
246:85 tiles), but the colour files in `clients/` are also the work-card titles
and case-study logos, which keep brand colour. So the tool builds the grid set
separately (`GRID_JOBS` / `GRID_SVGS`) — don't point the wall back at the colour
files or the cards at the white ones. Each `<img>` carries `--w`, its width as a
% of the tile measured off the frame; the designer balanced long wordmarks
against tall badges by eye and no shared cap reproduces that. SWJ, PwC,
Unilever, Garmin, Black Bananas, SmarDex, Trayler and Ben & Jerry's were
exported from Figma already white and exist only in the grid set.

**Bybit and Maxy are `.svg` and are NOT rebuilt by the tool.** Both needed a fill edited
for a dark ground — Bybit's wordmark was `#15182A`, and Maxy's paths declared no `fill`
at all, which SVG renders as black. Maxy is filled `#F26B21` (client orange, set on its
`.cls-1` class). Editing either source means redoing that by hand.

The grid sits on Void Black, so polarity matters more than format. Adding a logo means
checking it against black, not assuming — the supplied set alone included pure-black
artwork (Algorand), a light mark inside a dark badge on a white page (Abstract), and a
wordmark on a near-black square (Levels Socials). The tool's modes are `keep` /
`whiten` / `dropbg`; its docstring explains which to reach for and why a luminance key
is the wrong tool for the Abstract case.

`Client Logos/` also holds a dozen further real client marks not currently on the site,
plus `Pudgy Penguins Wordmark.png` — an alternative to the roundel that is **not** used,
because its "PENGUINS" half is dark navy and disappears against Void Black.

## Case study pages (`work/`)

`work/bybit.html` (181), `work/kalshi.html` (207) and `work/hano-crypto.html`
(208) are built — copy any of them for Maxy and Levels Socials. **The Crypteum
case study was built (frame 209) and then deleted on request**, along with its
card, artwork, clips and every reference; don't resurrect it from git without
asking. They reuse `css/styles.css` and `js/main.js` wholesale; only the
CASE STUDY block in the CSS and the "Case-study galleries" block in main.js are
specific to them. Everything outside the `<article class="case">` is
byte-identical across all three, so keep it that way when adding a page.


Kalshi differs from Bybit in three ways the frame dictates: no `<h1>` (the lead
paragraph sits alone beside the logo), a single 9:16 clip on `.slide-tall`
rather than a multi-slide strip, and a `.case-ig` "View on Instagram" caption.

Hano Crypto is the longest frame and adds two more: `.case-post` +
`.case-metrics` for a viral-post title with its engagement line above its own
clip, and `.slide-board` for the wide 1340x712 mood board. **`.slide-board`
needs `.slide.slide-board` specificity** — as a single class it loses to the
later `.slide img{width:auto;height:100%}` and the slide collapses to 0 high.
It also has no "Why It Matters" section; don't add one.

**The mood board is now a live Milanote iframe, not the still.** `.case-board`
is a bordered panel on the same two-track grid as `.gallery` (minus the bleed —
it is a framed panel, not a strip that runs off the edge). Milanote publishes an
oEmbed for the board URL whose `html` is exactly that iframe, so framing is the
supported path; the only anti-framing headers `app.milanote.com` sends are the
deprecated `x-content-security-policy` / `x-webkit-csp` pair, which current
browsers ignore. **If Milanote ever ships a real `content-security-policy` the
frame goes blank** — `assets/img/work/hano-crypto/mood-board.jpg` is kept in the
repo (and still serves as the page's `og:image` and schema `image`) so the
`.slide-board` gallery can be restored in one step. `.slide.slide-board` stays in
the CSS for that reason; it is currently unused. `.case-board-mask` covers
Milanote's own badge along the foot, sized by `--board-mask-h` /
`--board-mask-inset` so it can be moved in one line. The board centres on the
page like a static gallery, capped at 980px so a 16/10 panel across the full
content width does not tower over the copy either side.

`.slide-board` needs `.slide.slide-board` specificity — see above; that trap
still applies if you put the still back.

Hano Crypto's mark is the client's own artwork at
`assets/img/clients/hano-crypto.png`, built from `Logowhite.PNG` in the repo
root — a purple roundel with black type. Two earlier attempts (a raster crop off
the mood board, then a hand-built vector) were both wrong and are gone. It is
circular, so it carries `.case-logo-round` on the case study and a taller
`.work-logo` cap on the cards: at the wordmark height a circle reads as a stray
dot next to Bybit's or Levels Socials' wide marks.
Paths are `../` throughout, and the menu's Work/Process/Team/FAQ links point at
`../index.html#…` so they work from a subdirectory.

**`work/smardex.html` (frame 2147223579)** opens on "Overview" inside the
header row (so `.case-intro h2` shares the `.case-sec h2` style) with an sr-only
`<h1>`. Copy is the frame's, verbatim, first person included. It adds
`.slide-square` for the four 388px product marks and `.case-figs` for the two
standalone full-width pieces (Second Halving, SDEX vs ENA table). Its logo is
`clients/smardex.png`, built by the tool's `tint:3CF8B0` mode from the white
export — the green is sampled off their own artwork. Page images are the 2x
Figma exports. Shell outside `<article>` is byte-identical to Kalshi's.

**The frame closes on a carousel of @every_thing posts on X; it was built and
then removed on request** — the page ends on "A long-term creative
collaboration". Don't re-add X embeds without asking (they would also need
consent gating and a privacy-policy mention).

**Phone galleries size stills to the image, not a fixed box.** At <=600px a
landscape still drawn at the 400px slide height was ~710px wide, and the slide's
`overflow:hidden` cut its right side off on every case study. `.slide:has(> img)`
now drops to `height:auto` with the img capped at 84vw / min(56vh,400px).
Videos keep the fixed box: `preload="none"` means no intrinsic size until loaded.

**Frame 181 indents the whole document; it is not a two-column grid.** The left
column is a margin holding only the client logo and the "Why It Matters" label —
section headings sit in the copy column, above their own paragraphs, *not* out
in the margin. Only those two rows are grids (`.case-row`); every ordinary
section is a `.case-sec` block pushed across by `--indent`. That variable has to
reproduce the grid's own maths: `.26fr` against `1fr` is **not** 26%, it is
`.26/1.26` of the width less the gap. Treating it as 26% puts every heading 70px
right of the galleries.

**`.case-brand` is absolutely positioned inside the header `.case-row`, and that
is load-bearing.** A grid row is as tall as its tallest cell, and in the header
that is usually the client mark — so `margin-bottom` was being measured from the
bottom of the *logo* rather than from the last line of copy, and the gap above
"Overview" tracked logo height instead of being consistent: 134px on Hano Crypto
(116px round badge beside one line of lead), 67px on Kalshi, 52px on Bybit.
`align-items:start` does **not** fix this — it changes how items stretch within
a row, not the row's height. Taking the column out of flow removes it from the
height calculation while it still paints in the left margin, and the grid still
reserves the track, so `--indent` is untouched. Two consequences to keep:
`.case-row > .case-brand + *{ grid-column:2 }`, because an out-of-flow child is
also out of auto-placement and the copy would otherwise land in column 1 at the
narrow logo track's width; and both rules are reverted at `max-width:760px`,
where the layout is single-column and an absolute brand would sit on top of the
intro text. Verified at 1470/1200/900/761/760/600/390 on all three pages: a
uniform gap, no overlap, heading left edge == copy left edge.

Galleries are `[data-gallery]`; main.js wires arrows, dots, swipe and per-slide
video play/pause for any number of them per page.

**A gallery whose slides all fit is centred, and main.js has to measure that.**
`measure()` sets `.is-static` when `scrollWidth <= clientWidth + 1`; the CSS then
drops the track's right-edge bleed, **collapses the two-track grid to one so the
slides centre on the page rather than inside the indented copy column** (centring
in column 2 alone lands them right of the page's centre line), hides the prev/next
buttons and dots (dead controls with nothing to scroll — hidden *by name*, since
the sound toggle shares `.gallery-arrows`), and centres the foot. It cannot be a
media query: it depends on how wide the slides resolve, and a pair that fits on a
desktop overflows on a phone. Slides are `width:auto` at a fixed height, so their
width is unknown until the media reports its aspect ratio — `preload="none"`
videos never do until loaded — so `measure()` re-runs on `load`,
`loadedmetadata` and `resize`. Without it, Kalshi's single clip and Bybit's pair
of socials sat hard against the text margin with the column empty beside them. **Slides are capped on both
axes** — a height cap alone makes 16:9 stills ~1.8x the phone's width, a width
cap alone lets the track grow to the tallest slide and strands the arrows
hundreds of px below a short one. `align-items:flex-start` stops flex equalising
their heights.

Videos use `preload="none"`, so nothing downloads for slides never reached — but
that also leaves the element at `readyState 0` with no source selected, and
`play()` on that rejects without ever fetching. main.js calls `load()` first the
one time a slide becomes active.

**Sound is opt-in, and `data-audio` is the switch.** main.js builds a
`.sound-btn` — the same markup, icons and CSS as the showcase carousel's
`#showSound` — into any gallery holding a `video[data-audio]`, and into no other,
so a gallery of stills never carries a dead control. Rules the implementation
keeps: only the *centred* slide is ever unmuted (several play at once, and
unmuting them all is just noise); only one gallery on the page may be audible
(they register mute callbacks in a shared `muteOthers` list); leaving the
viewport calls `setSound(false)` rather than just muting the elements, so the
button never reads "on" for a gallery nobody can hear; and `reduce` suppresses
*autoplay* but not a clip the visitor explicitly asked for, or the next `sync()`
would pause it a moment after the toggle started it.

Single-slide galleries (Kalshi, both Hano Crypto clips) draw no arrows and no
dots, so they have no `.gallery-foot` in the markup — main.js builds a minimal
one to hang the toggle on. **Only add `data-audio` after checking the file
actually has sound**, with
`ffmpeg -i clip.mp4 -map a:0 -af volumedetect -f null /dev/null`; five clips
carry it today (Bybit `social-1`/`social-2`, Kalshi `xrp-bank`, Hano Crypto
`war-against-china`/`trumps-planned-crash`).

**The four Bybit Card films carry no audio stream at all** — every audio track in
the supplied `~/Downloads/Bybit/Bybit Card/` masters is digital silence (-91dB,
and the one outlier peaks at -61.7dB), so they are encoded `-an` and get no
`data-audio` and no toggle. Don't "restore" their sound by lifting a track off a
sibling aspect variant; there is nothing on it. Real audio needs new masters from
the client. **Playwright's bundled Chromium has no
proprietary codecs** (`canPlayType('video/mp4; codecs="avc1…"')` is empty), so
playback can only be verified with `chromium.launch({channel:'chrome'})` — it
fails there for the existing showcase clips too, which is the browser, not the file.

Source masters live outside the repo: `~/Downloads/bybit` (88MB),
`~/Downloads/Kalshi` (88MB), `~/Downloads/Hano Crypto` (397MB) and
`~/Downloads/Crypteum` (42MB). Re-encoded to 5.4MB, 2.4MB, 7.2MB and 3.8MB with
the same settings the showcase clips use: H.264, CRF 27, long edge 960, AAC 96k,
`+faststart`. Kalshi's poster is grabbed at `-ss 3` — the clip opens on
near-black, so frame 0 gives a 4.5KB blank; Hano Crypto ships its own posters.

**ffprobe reports Crypteum's master as 1920x1080 but it is a 9:16 reel** — that
is the stored size, read before the rotation metadata. `scale=-2:960` handles it
and the output is a correct 540x960; don't "fix" the orientation by hand.

## Two deliberate resilience behaviours — don't remove them

1. `main.js` adds `.js` to `<html>` on execution. `.reveal` elements are only hidden via
   `.js .reveal`. If `main.js` fails to load, all content stays visible instead of being
   stranded at `opacity:0`.
2. An inline script in `<head>` adds `.no-gsap` when GSAP is unavailable (blocked CDN, ad
   blocker, CSP). CSS then degrades the pinned Works section, the split transition and the
   circle wipe to plain scrollable layout. Without this, the Works section becomes
   completely unreachable for those users.

Both were verified by killing the scripts. Keep them if you refactor.

## Known outstanding work

- **No testimonials section.** It was removed because the quotes were invented. Figma
  lists REVIEWS in both the menu overlay and the footer, so both links are currently
  left out — restore the section and both links together once there are real,
  client-approved quotes.
- **The showcase clips are real.** Five, in this order: Trump's Planned Crash,
  Bybit, Direct Signals, War Against Iran, Algorand RWA. Two are copies of case
  study clips (`work/hano-crypto/trumps-planned-crash.mp4` and
  `war-against-china.mp4` — the same file; the reel covers Iran later on, which
  is why the showcase copy is named `war-against-iran.mp4`). The other three are
  re-encoded from `Showcase Videos (source)/`, which is gitignored. Posters are
  grabbed at `-ss 3`.
- ~~**Showcase videos are not supplied yet.**~~ Each `.phone` holds a `<video>` with the
  existing still as its `poster`. The playback controller in `main.js` is finished and
  verified: it plays the active slide, auto-advances on `ended`, wraps around, pauses
  off-screen, and the arrows work. Leaving the viewport **resets the sound
  toggle**, it does not only pause: pausing alone left `soundOn` true, so the
  button still read "on" for a carousel nobody could hear and the clip resumed
  *with sound* the moment the section clipped back into view. The `reduce` guard
  sits inside the intersecting branch, not at the top of the observer — leaving
  has to stop sound in every mode, and the toggle can start a clip under reduced
  motion. It activates per phone the moment you add
  `data-src="assets/video/showcase/<slug>.mp4"` to that `<video>` — there is a comment
  beside each one with the exact line. A phone with no `data-src` just shows its poster,
  so no missing file is ever requested.
- **Calendly is live**: `https://calendly.com/hanostudios/discovery` — the event
  itself, so the widget opens straight on the calendar rather than on an event
  list. The older `/hanoanimations/discovery` URL now 404s, which is what made
  the modal show Calendly's own error page. The URL appears twice per page —
  `#calEmbed`'s `data-url` and the `<noscript>` link beside it — across all five
  pages, plus `llms.txt` and the `contactPoint` in the homepage schema; change
  them together.
  **Do not paste Calendly's own UI params** (`?back=1&month=YYYY-MM`) from the
  address bar: `month=` pins the widget to that month forever, so a visitor
  months later still lands on it. `cal_full.js` asserts `month=` is absent.
  **The dark theme does not apply.** The colour params are on `data-url` *and*
  passed as `pageSettings` in main.js, and Calendly puts them on the iframe URL,
  but the widget still renders white — colour customisation is a paid feature.
  Don't spend time re-plumbing it; it needs a plan upgrade, not code.
- **Instagram, X and LinkedIn are real** — `hano.studios`, `HanoStudioss` and
  `linkedin.com/company/hano-studios/`, in both the footer and the menu overlay
  on all five pages (15 links). LinkedIn is also in the homepage schema's
  `sameAs`. **Tik Tok was removed on request** — there is no Tik Tok link
  anywhere now, so don't reintroduce one without a supplied handle. The FAQ copy
  still names TikTok as a platform we deliver *for*; that is prose, not a link.
- **"Process" was removed from the nav on request.** The showcase section keeps
  `id="process"` so any link already shared as `/#process` still resolves, but
  nothing in the site points at it. Two comments in main.js explain a resync that
  a deep link to that anchor can still trigger — the behaviour is still needed.
- The services list no longer shows a hover preview (removed on request). The
  `<li>`s keep their `data-tone` / `data-img`, so restoring it means the markup
  plus a handler in main.js — the 6 images in `assets/img/services/` are
  currently unreferenced but kept for that, and their filenames track the
  labels.
- **The services list is the six the client named**: Motion Design, Branding, Web
  Design, Social Media Marketing, UX/UI, Ad Funnels. This replaced an earlier
  seven that included Graphic Design, Website Design, Launch Leading, Full
  Marketing and Ad Campaigns. The `makesOffer` block in the homepage schema
  mirrors it — change both together.
- Plausible is wired in `<head>` with `data-domain="hanostudios.xyz"`. It only starts
  recording once the site is added in the Plausible dashboard. Cookieless, so no
  consent banner. A `Booking opened` goal fires from `main.js` when the Calendly
  modal opens — add it as a goal in Plausible to see conversions.

## Tracking (Meta Pixel + Conversions API)

`js/consent.js` owns all of it. Nothing tracking-related belongs in a `<script>`
tag in the HTML — it would run before consent.

Three events, in funnel order: **PageView** (on pixel load), **Contact** (click of
any `[data-calendly]` trigger), **Lead** (Calendly posts `calendly.event_scheduled`
from its inline iframe). Pixel ID `1282102860523144`.

**Every event goes out twice**, browser (`fbq`) and server (`POST /api/capi` →
Meta Conversions API), carrying the **same `event_id`** so Meta deduplicates them.
The server leg is a first-party request, so it survives the content blockers and
iOS privacy that eat `connect.facebook.net` — which is the whole reason it is
there. Changing one leg without the other breaks deduplication and doubles every
number in the ad account.

`api/` is two plain Node functions with no dependencies. Vercel picks them up
automatically; this does **not** introduce a build step or a package.json, and
`_meta.js` is not routed because Vercel ignores `_`-prefixed files.

Set in **Vercel → Settings → Environment Variables** (nothing secret in the repo):

| Variable | Value |
|---|---|
| `META_PIXEL_ID` | `1282102860523144` |
| `META_CAPI_TOKEN` | Events Manager → Settings → Conversions API → Generate access token |
| `META_TEST_EVENT_CODE` | optional; routes events to Test Events. **Remove after verifying** or nothing counts as live. |

Without the token `/api/capi` returns 501 and the browser leg carries on alone,
so a missing variable degrades rather than breaks.

**`?fbdebug=1` on any URL** turns on console logging for the rest of the session —
every event sent, every Calendly message received, and the *reason* an event was
skipped. Reach for it before touching code: "Meta shows nothing" is far more often
refused consent or a blocker than a bug. Verified end-to-end in a real browser:
the listener fires `Lead` exactly once from a genuine `https://calendly.com`
origin, ignores repeats, and ignores same-origin spoofs.

The Lead `event_id` is derived from Calendly's own invitee URI (`lead_<uuid>`),
not from a random value, so a server-side Calendly webhook could later report the
same booking and still deduplicate. That webhook is **not** built — it is the only
way to get a hashed email into the server event, so it is the next step if match
quality needs to improve.

Marketing consent gates both legs. Server-side is the same processing over a
different pipe, not a way around the GDPR.

## SEO / AEO

**Canonical host is `https://www.hanostudios.xyz`** — the apex 301s to it, so every
canonical, sitemap `<loc>`, `og:url` and schema `@id` must use `www`. Mixing the two
splits the ranking signal.

`robots.txt` allows the AI answer engines by name (GPTBot, OAI-SearchBot,
PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended and others) — several
read robots.txt for their own token and ignore rules inherited from `*`. Serving them
is deliberate: the case studies with real numbers are exactly what we want quoted.

`sitemap.xml` lists all five pages; regenerate `lastmod` from git when adding one.

Structured data is one `application/ld+json` block per page:
- `index.html` — `Organization`/`ProfessionalService` (+ `knowsAbout`, `makesOffer`,
  `sameAs`), `WebSite`, and `FAQPage` built from the real `<details>` copy.
- each `work/*.html` — `CreativeWork` naming the client and its metrics, plus
  `BreadcrumbList`, both referencing the org by `@id`.

**Every number in the schema also appears in the visible copy.** Schema that claims
more than the page says is a manual-action risk, not a shortcut — if you change a
metric, change both.

Frames 207/208 draw no headline, so those pages carry a visually-hidden
`<h1 class="sr-only">`. `.sr-only` clips rather than `display:none`, which would drop
it from the accessibility tree as well as from search.

Titles are kept under ~70 characters and descriptions ~150–170, or they get
truncated in results.

**`services/` is generated — never hand-edit those six files.** They exist
because the landing page is a portfolio and a portfolio cannot answer "what does
a Web3 motion design agency do". `tools/make-service-pages.py` lifts the head and
tail verbatim from `work/kalshi.html`, so the menu, Calendly modal, CTA and
footer stay identical across all eight content pages; re-run it after touching
that shell. Each page carries `Service` + `FAQPage` + `BreadcrumbList` schema, and links to
all four case studies plus its five siblings — adding a service to `SERVICES` in
the tool propagates the cross-links automatically.

**Scope boundary, stated on the website-development page and in `llms.txt`: we
design and build front-end sites, we do NOT write or audit smart contracts.**
That was the user's answer when asked directly; don't add blockchain-engineering
claims without checking again.

The tool substitutes its JSON-LD with a lambda rather than a replacement string —
`re.sub` interprets backslashes in a string replacement, and JSON containing a
`\u` escape raises `bad escape \u`.

`llms.txt` (llmstxt.org) is the plain-text brief for AI answer engines: what the
agency does, the verified numbers, and links to every page. Update it whenever a
headline metric changes — it is the file most likely to be quoted verbatim.

**The site is exactly the five pages the product designer drew — do not add
more.** Six SEO service pages and a "More work" cross-link strip were built and
then removed on request: the design is owned by the product designer and pages
that are not in Figma do not ship, regardless of their SEO value. Any future SEO
work has to fit inside the existing five pages, or happen off-site (directories,
backlinks, social). This is a standing constraint, not a one-off.

A consequence worth knowing: the four case studies are deliberate dead ends with
no links between them, so they pass no authority to one another.

Hano Crypto's follower count is **148,000** as of 29 Jul 2026 and appears in copy,
meta and schema on several pages. The Kalshi case study deliberately still says
135,000+ — that describes the audience size *at the time of that partnership*, so
don't "fix" it to today's number.

## Mobile scroll performance

Reported as "laggy, sometimes stuck" on iPhone and Android. The pins are not the
problem and must not be removed — the per-frame cost inside them was. **The rule:
never composite a `filter: blur()` on anything that moves during a scroll.** A
blur re-rasterises its layer on every frame it is composited, so a blur on a
scrubbed element pays that cost on every scroll frame.

Two were doing exactly that, both now cut over at 900px:

- **`.phone` inactive slides** carried `brightness(.42) blur(4px)` — four blurred
  layers, each wrapping a `<video>`, inside the pinned scrub. Four video surfaces
  re-blurred per scroll frame for the length of the showcase. Below 901px they
  dim without blurring; desktop keeps the blur.
- **The hero divide tween** scrubbed `.ht-a`/`.ht-b` from `blur(0px)` to
  `blur(9px)` — a per-frame text re-raster on the first thing anyone scrolls.
  `main.js` now omits the `filter` key entirely below 901px rather than tweening
  it to zero, because `blur(0px)` still puts the element on a filter path. The
  words still travel ±92% and fade out. CSS drops `filter` from their
  `will-change` at the same breakpoint — keep the two thresholds in step.

Also: work-card videos used `rootMargin: '200px'`, which on the mobile vertical
stack pulled three clips into decode at once mid-scroll; it is `0px` below 701px.
And `.hero-glow`'s two blurred full-viewport layers now have `animation:none`
under reduced motion — the global duration override stopped the drift but left
the animation in place, which keeps the layers promoted.

**Still outstanding: several clips are encoded well above the site's own
convention** (`scale=-2:960`, i.e. 960 on the short-ish edge). `work/hano-crypto/
trumps-planned-crash.mp4` and `war-against-china.mp4` are 1080x1920 at 9.1MB and
8.4MB, and `work/kalshi/xrp-bank.mp4` is 1080x1920 at 5.9MB — double the
convention in each dimension, four times the pixels to decode. The landing
page's `assets/video/works/*.mp4` are 1706x960 (6.9MB for the five) for cards
that render a few hundred px wide. Re-encoding is the biggest remaining win.
**Do not touch the four Bybit Card films** — their quality was already the
subject of a complaint and a revert (see 1030778 / 8d348ce).

## Conventions

- `prefers-reduced-motion` is respected; preserve it in anything new.
- Keep focus-visible outlines (`--aurora`).
- Responsive breakpoints at 900px and 600px.
- CSS is organised in commented blocks in section order. Add to the matching block rather
  than appending to the end of the file.
