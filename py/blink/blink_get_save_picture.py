from blinkpy.blinkpy import Blink
from blinkpy.auth import Auth
import utils as utl
from datetime import datetime

blink = Blink()
auth = Auth(utl.load_json("credentials.json"))
blink.auth = auth
blink.start()

camera = blink.cameras['Balcony']
camera.snap_picture()       # Take a new picture with the camera
blink.refresh()             # Get new information from server
date_time = datetime.now().strftime("%Y.%m.%d %H-%M-%S")
camera.image_to_file(f'images/{date_time}.jpg')
