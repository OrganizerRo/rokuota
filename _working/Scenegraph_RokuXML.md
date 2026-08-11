
 ▐▛███▜▌   Claude Code v2.1.25
▝▜█████▛▘  claude-opus-4-6 · API Usage Billing
  ▘▘ ▝▝    c:\src\eclipseL\AT_Eclipse\AT_Eclipse

  ⚠️ Never commit secrets - use environment variables

  /model to try Opus 4.5

❯ give me an example scenegraph xml that will play                          
  http://myvideos.com/vid.mkv with full seek play/pause abilities. it       
  should play the minute the custom app opens.                              

● Here's a minimal Roku SceneGraph example that auto-plays a video with full
  trick-play (seek, play/pause):

  components/MainScene.xml
  <?xml version="1.0" encoding="utf-8" ?>
  <component name="MainScene" extends="Scene" initialFocus="videoPlayer">

    <children>
      <Video
        id="videoPlayer"
        width="1920"
        height="1080"
        translation="[0,0]"
        enableTrickPlay="true"
        content="node:ContentNode" />
    </children>

    <script type="text/brightscript">
      <![CDATA[
        sub init()
          m.video = m.top.findNode("videoPlayer")

          content = createObject("roSGNode", "ContentNode")
          content.url = "http://myvideos.com/vid.mkv"
          content.title = "My Video"
          content.streamFormat = "mkv"

          m.video.content = content
          m.video.control = "play"
          m.video.setFocus(true)
        end sub
      ]]>
    </script>

  </component>

  manifest (root of the channel zip)
  title=Video Player
  major_version=1
  minor_version=0
  build_version=0
  mm_icon_focus_hd=pkg:/images/icon_focus_hd.png
  mm_icon_focus_sd=pkg:/images/icon_focus_sd.png
  splash_screen_hd=pkg:/images/splash_hd.jpg
  ui_resolutions=fhd

  source/main.brs
  sub Main()
    screen = createObject("roSGScreen")
    port = createObject("roMessagePort")
    screen.setMessagePort(port)
    scene = screen.createScene("MainScene")
    screen.show()

    while true
      msg = wait(0, port)
      if type(msg) = "roSGScreenEvent"
        if msg.isScreenClosed() then return
      end if
    end while
  end sub

  Key points:

  - enableTrickPlay="true" gives you the standard seek bar, fast-forward/rewind,
   and play/pause overlay controlled by the remote.
  - Setting m.video.control = "play" in init() starts playback immediately.
  - m.video.setFocus(true) ensures the Video node receives remote key events
  (d-pad, play/pause button, etc.).
  - streamFormat should match your container — use "mkv" for .mkv files. If the
  device has trouble, try "mp4" or "hls" depending on actual content.

  If you need HTTPS or DRM, you'd add content.streamFormat and certificate
  fields, but for plain HTTP playback this is all you need.