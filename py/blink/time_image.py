import asyncio
from aiohttp import ClientSession
from blinkpy.blinkpy import Blink
from blinkpy.auth import Auth
from blinkpy.helpers.util import json_load
import utils as utl
from datetime import datetime

async def start():
    session = ClientSession()
    blink = Blink(session=session)
    auth = Auth(await json_load("credentials.json"), session=session)
    blink.auth = auth
    await blink.start()

    camera = blink.cameras['Hallway']
    await camera.snap_picture()       # Take a new picture with the camera
    await blink.refresh()             # Get new information from server
    date_time = datetime.now().strftime("%Y.%m.%d %H-%M-%S")
    await camera.image_to_file(f'images/{date_time}.jpg')
    await session.close()
    return

asyncio.run(start())

