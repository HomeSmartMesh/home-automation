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

    cameras = {}
    for name, camera in blink.cameras.items():
        cameras[name] = camera.attributes
        print(name)                   # Name of the camera
    utl.save_json("cameras.json",cameras)

    await session.close()
    return

asyncio.run(start())
