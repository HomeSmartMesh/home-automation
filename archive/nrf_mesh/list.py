import serial
from serial import Serial
from serial.tools import list_ports

ser = Serial()
on_packet_function = None

def list_devices():
    devices = list_ports.comports()
    if(len(devices) == 0):
        print("No devices available")
        return
    for device in devices:
        #print(f"{device.device} hwid='{device.hwid}'")
        if(device.vid is not None) and (device.pid is not None):
            current_id = f"{hex(device.vid)}:{hex(device.pid)}"
            print(f"{device.device} id='{current_id}' hwid='{device.hwid}'")
        else:
            print(f"{device.device} hwid='{device.hwid}'")
    return

list_devices()
