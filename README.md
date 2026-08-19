# rokuota

Roku SceneGraph TV guide for the Explore2Express TV Server.

## Channel API

Set `channel_catalog_url` in `manifest` to the server's `/channels/` endpoint:

```ini
channel_catalog_url=http://192.168.0.103:8080/channels/
channel_catalog_timeout_seconds=10
```

`channel_catalog_timeout_seconds` controls how long the initial TV guide request
waits before showing an error. Missing, zero, and negative values use 10 seconds.
Catalog and playlist API errors display their dialog over a looping
`pkg:/tvstatic2p.mp4` full-screen static video.

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

Selecting a channel requests `/{channel}/all` to determine the playlist cycle
length. Before each item plays, the app requests `/{channel}/`, allowing the
server to choose the next shuffled, unwatched entry. The returned plain-text
media URL is then passed to Roku's Video node. YouTube URLs are therefore
resolved by the server through `yt-dlp` only when their item is about to play.

After the number of entries reported by `/all` has played or failed, the guide
returns. Because the server watchlist is persistent and shared, a session that
starts partway through a server cycle may cross into its next reshuffled cycle.

## Components

- `TVGuide.xml` displays the channel rows and reports selection.
- `ChannelCatalogTask.xml` retrieves and validates the channel API response.
- `PlaylistTask.xml` loads the server playlist envelope and determines cycle length.
- `MediaUrlTask.xml` requests the next server-selected and resolved media URL.
- `VideoComponent.xml` owns playback, advances entries, and confirms Back exits.
- `MainScene.xml` coordinates loading, errors, focus, and component visibility.
