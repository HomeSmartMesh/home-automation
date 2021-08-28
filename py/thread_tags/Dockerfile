FROM python:3

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY thread_tags.py .
COPY mqtt.py .
COPY cfg.py .
COPY config-local.json ./config.json

RUN mkdir -p /var/log/thread

CMD [ "python", "./thread_tags.py" ]
