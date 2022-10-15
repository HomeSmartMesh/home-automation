from blinkpy.blinkpy import Blink
from blinkpy.auth import Auth
import utils as utl

blink = Blink()
auth = Auth(utl.load_json("credentials.json"))
blink.auth = auth
blink.start()

camera = blink.cameras['Balcony']
#camera.snap_picture()       # Take a new picture with the camera
blink.refresh()             # Get new information from server
camera.image_to_file('balcony.jpg')
