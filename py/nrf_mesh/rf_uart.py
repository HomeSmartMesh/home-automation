import serial
from serial import Serial
from serial.tools import list_ports
import binascii
import cfg
import logging as log
import sys

config = cfg.configure_log(__file__)
ser = Serial()
on_line_function = None

def get_device(id):
    dev = None
    devices = list_ports.comports()
    for device in devices:
        if(device.vid is not None) and (device.pid is not None):
            current_id = f"{hex(device.vid)}:{hex(device.pid)}"
            if(current_id == id):
                dev = device.device
                log.info(f"uart> device {id} found at {dev}")
    return dev

def run():
    res = None
    try:
        line = ser.readline().decode("utf-8")
        if(len(line)):
            line = line.replace('\r','')
            line = line.replace('\n','')
            on_line_function(line)
    except OSError as e:
        log.error("uart> Handled exception: %s",str(e))
    return res

def send(data):
    ser.write(data.encode())
    return

def log_port_status():
    if(ser.isOpen()):
        open_text = "is Open"
    else:
        open_text = "is Closed"
    log.info(f"uart> {ser.name} : {open_text}")
    return

def serial_start(config,serial_on_line):
    global on_line_function
    on_line_function = serial_on_line
    global ser
    dev = None
    if("ID" in config["serial"]):
        dev = get_device(config["serial"]["ID"])
        if(dev is None):
            log.error(f"device {config['serial']['ID']} not available")
            sys.exit(1)
    else:
        dev = config["serial"]["port"]
    ser = serial.Serial(dev,
                        config["serial"]["baud"],
                        timeout=0.1)
    ser.reset_input_buffer()
    ser.reset_output_buffer()
    log_port_status()

    return ser

def serial_stop():
    log.info("closing serial port")
    ser.flush()
    ser.close()
    log_port_status()
    return
