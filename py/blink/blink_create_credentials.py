import asyncio
from blinkpy.blinkpy import Blink

async def main():
  blink = Blink()
  await blink.start()
  await blink.save("credentials.json")
  return

asyncio.run(main())
