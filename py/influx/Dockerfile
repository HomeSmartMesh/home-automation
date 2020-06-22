FROM python:3
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY mqtt.py .
COPY cfg.py .
COPY influx_client.py .
COPY config.json .
CMD [ "python", "./influx_client.py" ]