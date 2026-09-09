# rokuota

Roku SceneGraph TV guide for the Explore2Express TV Server.

## Channel API

Set `channel_catalog_url` in `manifest` to the server's `/channels/` endpoint:

```ini
channel_catalog_url=http://192.168.0.103:8080/channels/
channel_catalog_timeout_seconds=10
startup_video_url=pkg:/tvstatic2p.mp4
startup_video_mode=firstRun
default_channel=
default_channel_back_destination=home
live_guide_back_destination=onDemand
guide_backdrop_opacity=0.25
guide_foreground_opacity=1.0
guide_item_opacity=0.80
audio_backdrop_opacity=0.25
```

`channel_catalog_timeout_seconds` controls how long the initial TV guide request
waits before showing an error. Missing, zero, and negative values use 10 seconds.
Catalog and playlist API errors display their dialog over a looping
`pkg:/tvstatic2p.mp4` full-screen static video.

The left menu provides two guide actions. **On Demand** opens the channel and
playlist browser backed by `/channels/`, while **Live TV** opens the
time-proportional linear schedule backed by `/channels/guide`. **Settings**
configures the server URL. Selecting any Live TV program tile tunes the
channel's current `/{channel}/live` broadcast and continues with the next
program when the current one finishes. The Live TV parser uses the `title` and
`entries` fields emitted by the server's guide endpoint, with each entry's
local schedule time read from `starttime`.

In On Demand, selecting a channel plays its playlist continuously. Browsing a
channel with Right and selecting a specific program plays only that program,
then returns to the channel's program listing.

Set `default_channel` to a channel title, URL, or URL path segment to start
playing that channel immediately after the catalog loads. For example,
`default_channel=Local News` and `default_channel=/Local%20News/` both match
the sample channel. Missing, empty, or unmatched values leave the app on the
TV guide. Default-channel playback uses the normal shuffled channel flow.
`default_channel_back_destination=home` makes confirmed Back exit to Roku
Home; set it to `guide` to return to the TV guide instead. Other values use
the safer default of `home`. Playback started manually from either guide
always returns to its existing guide destination.

`startup_video_url` selects the startup intro used for capability validation.
Set `startup_video_mode=always` to show the intro on every launch, or
`startup_video_mode=firstRun` to show it only until device capabilities have
been written. An empty URL skips the intro and records dual-video prebuffering
as unsupported if the capability has not been validated.

`live_guide_back_destination` controls Back from the Live TV guide. Use
`onDemand` (the default) to return to the On Demand guide, `menu` to open the
side menu, or `home` to exit to Roku Home. Unknown values use `onDemand`.

The opacity values range from `0` (transparent) to `1` (opaque). Guide
backdrops use the focused channel or program thumbnail.
`guide_foreground_opacity` controls the headings, controls, and list as a
group, while `guide_item_opacity` controls row backgrounds without fading
their text.

Build with `npx brighterscript`. The included `bsconfig.json` ensures the static
video is packaged with the channel.

```json
[
  {
    "title": "Local News",
    "baseUrl": "http://192.168.0.103:8080/Local%20News",
    "thumbs": ["/Local%20News/?thumb=0"],
    "url": "/Local%20News/",
    "description": "Continuous local coverage",
  }
]
```

Pressing OK on a channel requests `/{channel}/all` to determine the playlist cycle
length. The app requests `/{channel}/` once for each shuffled slot, allowing the
server to reserve the next shuffled, unwatched entry. A lookahead request is made
when 10% of the current item remains, clamped to 30–180 seconds; short items
prefetch immediately. The cached response is promoted at transition time instead
of calling the shuffle endpoint again.

On-demand indexed playback prefetches `/{channel}/{index + 1}` and verifies the
returned `playlistIndex`. Live TV initially resolves `/{channel}/live`, prefetches
`/{channel}/live/next`, then advances deterministically through
`/{channel}/{playlistIndex + 1}`. The Live TV response's `playlistIndex` is
validated before promotion.

The resolver returns JSON:

```json
{
  "mediaUrl": "https://media.example.com/program.mp4",
  "streamFormat": "mp4",
  "title": "Program title",
  "description": "Program description",
  "thumbnail": "https://media.example.com/program.jpg",
  "length": 1800,
  "playlistIndex": 4
}
```

The resolver must return HTTP 200 with string `mediaUrl` and `streamFormat`
fields. It may also include string `title`, `description`, and HTTP(S)
`thumbnail` fields plus a non-negative numeric `length` in seconds.
Indexed and live responses include numeric `playlistIndex` for lookahead
identity validation; shuffled responses use the cached response itself as the
server reservation. The live video overlay
and audio now-playing panel display the available metadata. Press OK while a
video is playing to slide up its thumbnail, title, description, content length,
and current playback progress. A `thumbs` or
`thumbnails` array may replace `thumbnail`; one valid entry is selected at
random. The selected audio thumbnail is also used as the faded full-screen
now-playing background.
`mediaUrl` must be a non-empty HTTP(S) URL; its non-empty `streamFormat` is
passed unchanged to Roku's `ContentNode`. For compatibility with extensionless
resolver URLs, an empty `streamFormat` falls back to the URL extension (or
`mp4` when no extension exists). The server should use the following audio
format values: `.mp3` → `mp3`, `.m4a` → `mp4`, `.wav` → `pcm`, and raw `.aac`
→ `aac`. Each `/all` item must also include a `streamFormat` string in the
existing `items` array. YouTube URLs are therefore resolved by the server
through `yt-dlp` only when their item is about to play.

Video lookahead uses a second resolver task and one hidden standby `Video` node.
Resolved video content is prebuffered with `control="prebuffer"` and promoted
when the active item finishes; audio is resolved and cached without allocating a
second audio player. On first launch, the configured startup intro checks
whether the device can play one video while prebuffering a hidden second copy.
The result is remembered in the registry. Resolver lookahead remains enabled on
unsupported devices, but subsequent items start through the current player
without dual-player prebuffering. Runtime rejections also disable the capability.
Other resolver or prebuffer validation failures display a
playback-interruption warning and use the current resolver as the bounded
fallback path. Device logs include `resolver_dur`, `playStartInfo.total_dur`,
`manifest_dur`, and `prebuf_dur` for each item.

Pressing Right on a highlighted channel loads `/{channel}/all` into a program
Guide. Each row displays the playlist thumbnail, title, description, and
formatted duration. The focused thumbnail also becomes the faded guide
background. Selecting a row
requests `/{channel}/{index}`, plays only that item, and returns to the same
program guide when playback finishes or the user presses Back. Back from the
program guide returns to the channel guide.

Direct PLS channels also read `TitleN`, `DescriptionN`, `LengthN`,
`CommentN_Duration`, and `CommentN=Title: ... | Duration: ... | Description:
... | Thumbnail: ...`. Explicit title, description, and length fields take
precedence over their composite comment equivalents.

URLs whose path extension is `.mp3`, `.m4a`, `.wav`, or `.aac` (case-insensitive,
with query strings and fragments ignored) use Roku's `Audio` node. Audio has
the same Back confirmation and playlist advancement/error handling as video,
and Play/Pause pauses or resumes it. Rewind and Fast Forward seek audio by 15
seconds without resuming paused audio; Left and Right provide the same seeking.
The audio now-playing screen shows the resolved file title, play state, current
position, duration, progress, and the Roku device volume/mute state. Video
retains Roku's native seek, rewind, fast-forward, and Play/Pause UI.

After the number of entries reported by `/all` has played or failed, the guide
returns. Because the server watchlist is persistent and shared, a session that
starts partway through a server cycle may cross into its next reshuffled cycle.

## Components

- `TVGuide.xml` displays the channel rows and reports selection.
- `PlaylistGuide.xml` displays all programs for a highlighted channel.
- `ChannelCatalogTask.xml` retrieves and validates the channel API response.
- `PlaylistTask.xml` loads the server playlist envelope and determines cycle length.
- `MediaUrlTask.xml` requests the next server-selected and resolved media URL.
- `VideoComponent.xml` owns playback, advances entries, and confirms Back exits.
- `MainScene.xml` coordinates loading, errors, focus, and component visibility.
