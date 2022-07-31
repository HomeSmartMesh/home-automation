from blinkpy.blinkpy import Blink

blink = Blink()
blink.start()
blink.save("credentials.json")

for name, camera in blink.cameras.items():
  print(name)                   # Name of the camera
  print(camera.attributes)      # Print available attributes of camera
