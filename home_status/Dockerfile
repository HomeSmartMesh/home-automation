FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt
COPY *.py .
COPY config.json .

ENTRYPOINT ["python", "home.py"]
