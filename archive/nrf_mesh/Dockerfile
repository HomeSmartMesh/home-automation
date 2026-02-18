FROM python:3

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY mesh.py .
COPY mqtt.py .
COPY cfg.py .
COPY rf_uart.py .
COPY nrf_mesh.py .
COPY config.json .

CMD [ "python", "./nrf_mesh.py" ]
