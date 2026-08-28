sub Main()
  screen = createObject("roSGScreen")
  port = createObject("roMessagePort")
  screen.setMessagePort(port)
  scene = screen.createScene("MainScene")
  screen.show()

  while not scene.closeRequested
    msg = wait(100, port)
    if type(msg) = "roSGScreenEvent"
      if msg.isScreenClosed() then return
    end if
  end while
  screen.close()
end sub