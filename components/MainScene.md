# MainScene Component (`MainScene.xml`)

## Overview
`MainScene` is the root component of the Roku application. It manages navigation state, switches between various screen views, coordinates asynchronous data-fetching tasks, handles application configuration from the manifest, and provides fallback playback during API error states.

---

## Architecture & Responsibilities

### 1. View Management & Navigation State
`MainScene` acts as the primary layout container and state machine, toggling visibility and key focus across distinct UI components:
* **On-Demand TV Guide (`TVGuide`)**: Primary view for browsing channel catalogs.
* **Live TV Guide (`LiveTVGuide`)**: Secondary guide view for real-time channel streams.
* **Playlist View (`PlaylistGuide`)**: Detailed list view for browsing items within a specific channel.
* **Video Player (`VideoComponent`)**: Main playback engine for streaming video media.
* **Side Menu (`SideMenu`)**: Global sliding navigation menu.
* **Settings View (`SettingsView`)**: Configuration screen for managing server endpoints.
* **Error Visualizer (`Video`)**: Displays an offline TV static loop (`pkg:/tvstatic2p.mp4`) when critical API failures occur.

### 2. Async Task & Resource Coordination
The component controls asynchronous Task nodes to perform off-thread networking and device validation:
* **`CapabilityValidator`**: Validates device playback features and startup configurations before booting into the main UI.
* **`ChannelCatalogTask`**: Fetches On-Demand catalog data from the backend server endpoint.
* **`LiveGuideTask`**: Fetches electronic program guide (EPG) data for Live TV.
* **`PlaylistTask`**: Resolves media items and constructs playlist structures for selected channels.
* **`playlistLoadWatchdog` (Timer)**: Enforces a 20-second timeout on playlist fetch operations.

---

## Dynamic Configuration & Settings Lifecycle
During `init()`, the scene reads application runtime settings via `roAppInfo` and the device registry (`roRegistrySection` under `"AppSettings"`):

| Manifest / Registry Key | Purpose | Default / Fallback |
| :--- | :--- | :--- |
| `channel_catalog_url` | Base URL endpoint for channel catalogs. | Stored/retrieved via registry (`server_url`). |
| `default_channel` | Target channel title/URL to auto-play on channel launch. | Optional (bypasses UI if matched). |
| `default_channel_back_destination` | Action when backing out of a default playback channel. | `"home"` (exits app) or `"guide"`. |
| `live_guide_back_destination` | Directs remote `Back` key action while in Live TV Guide. | `"onDemand"`, `"menu"`, or `"home"`. |
| `channel_catalog_timeout_seconds` | Network timeout threshold for catalog loading. | `10` seconds. |
| `startup_video_url` / `startup_video_mode` | Arguments passed to `CapabilityValidator`. | Optional. |

---

## Signal Observer Architecture


This component acts as the **central application coordinator and view controller** for your Roku SceneGraph channel. It orchestrates UI views, background async Task nodes, video playback, application lifecycle settings, and global error handling.

Here is the markdown documentation describing the structure and logic of your `MainScene.xml` component.

```markdown
# MainScene Component (`MainScene.xml`)

## Overview
`MainScene` is the root component of the Roku application. It manages navigation state, switches between various screen views, coordinates asynchronous data-fetching tasks, handles application configuration from the manifest, and provides fallback playback during API error states.

---

## Architecture & Responsibilities

### 1. View Management & Navigation State
`MainScene` acts as the primary layout container and state machine, toggling visibility and key focus across distinct UI components:
* **On-Demand TV Guide (`TVGuide`)**: Primary view for browsing channel catalogs.
* **Live TV Guide (`LiveTVGuide`)**: Secondary guide view for real-time channel streams.
* **Playlist View (`PlaylistGuide`)**: Detailed list view for browsing items within a specific channel.
* **Video Player (`VideoComponent`)**: Main playback engine for streaming video media.
* **Side Menu (`SideMenu`)**: Global sliding navigation menu.
* **Settings View (`SettingsView`)**: Configuration screen for managing server endpoints.
* **Error Visualizer (`Video`)**: Displays an offline TV static loop (`pkg:/tvstatic2p.mp4`) when critical API failures occur.

### 2. Async Task & Resource Coordination
The component controls asynchronous Task nodes to perform off-thread networking and device validation:
* **`CapabilityValidator`**: Validates device playback features and startup configurations before booting into the main UI.
* **`ChannelCatalogTask`**: Fetches On-Demand catalog data from the backend server endpoint.
* **`LiveGuideTask`**: Fetches electronic program guide (EPG) data for Live TV.
* **`PlaylistTask`**: Resolves media items and constructs playlist structures for selected channels.
* **`playlistLoadWatchdog` (Timer)**: Enforces a 20-second timeout on playlist fetch operations.

---

## Dynamic Configuration & Settings Lifecycle
During `init()`, the scene reads application runtime settings via `roAppInfo` and the device registry (`roRegistrySection` under `"AppSettings"`):

| Manifest / Registry Key | Purpose | Default / Fallback |
| :--- | :--- | :--- |
| `channel_catalog_url` | Base URL endpoint for channel catalogs. | Stored/retrieved via registry (`server_url`). |
| `default_channel` | Target channel title/URL to auto-play on channel launch. | Optional (bypasses UI if matched). |
| `default_channel_back_destination` | Action when backing out of a default playback channel. | `"home"` (exits app) or `"guide"`. |
| `live_guide_back_destination` | Directs remote `Back` key action while in Live TV Guide. | `"onDemand"`, `"menu"`, or `"home"`. |
| `channel_catalog_timeout_seconds` | Network timeout threshold for catalog loading. | `10` seconds. |
| `startup_video_url` / `startup_video_mode` | Arguments passed to `CapabilityValidator`. | Optional. |

---

## Signal Observer Architecture


```

[ CapabilityValidator ] ---> complete ------------> onCapabilitiesValidated()
[ ChannelCatalogTask ]  ---> catalog / error -----> onCatalogLoaded() / onCatalogError()
[ LiveGuideTask ]       ---> guide / error -------> onLiveGuideLoaded() / onLiveGuideError()
[ PlaylistTask ]        ---> playlist / error ----> onPlaylistLoaded() / onPlaylistError()
[ TVGuide / LiveGuide ] ---> channelSelected -----> loadChannel() / onLiveChannelSelected()
[ VideoComponent ]      ---> playbackEnded -------> onPlaybackEnded()

```

---

## Key Subroutines & Functions

* **`init()`**: Sets node references, registers field observers, initializes runtime defaults, and kicks off startup capability validation.
* **`onCapabilitiesValidated()`**: Callback triggered once device initialization passes; fires off the catalog fetch task.
* **`loadChannel(index, browseMode)`**: Validates channel status (e.g., checks against `offline`, `inactive`, or `disabled`), displays progress dialogs, and starts `PlaylistTask`.
* **`startPlayback(playlist, startIndex, singleItem, returnTarget)`**: Configures `VideoComponent` with mode parameters (`onDemand`, `live`, `shuffle`) and passes playback focus to the player.
* **`showApiError(message)`**: Handles API failures by transitioning UI nodes away and playing a looping TV static video while displaying an error dialog.
* **`normalizedChannelSelector(value)`**: Normalizes channel identifiers (unescaping URLs and trimming trailing slashes) to accurately match configured `default_channel` selectors.
* **`onKeyEvent(key, press)`**: Intercepts the physical Roku remote `Back` button to handle context-sensitive navigation stack pops before deferring to default OS behavior.

```