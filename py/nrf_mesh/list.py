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
        print(f"({device.hwid}) at {device.device}")
            
    return

list_devices()
