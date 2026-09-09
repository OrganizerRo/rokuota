function hasDualVideoPrebufferSupportSetting() as boolean
  section = createObject("roRegistrySection", "PlaybackCapabilities")
  return section.exists("dual_video_prebuffer")
end function

function readDualVideoPrebufferSupport() as boolean
  section = createObject("roRegistrySection", "PlaybackCapabilities")
  return section.exists("dual_video_prebuffer") and section.read("dual_video_prebuffer") = "true"
end function

sub saveDualVideoPrebufferSupport(supported as boolean)
  section = createObject("roRegistrySection", "PlaybackCapabilities")
  if supported
    section.write("dual_video_prebuffer", "true")
  else
    section.write("dual_video_prebuffer", "false")
  end if
  section.flush()
end sub
