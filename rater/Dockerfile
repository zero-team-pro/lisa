FROM python:3.8-slim-buster

WORKDIR /app


RUN apt update -y
RUN apt install -y curl htop libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev python3-pip python-dev
RUN apt install -y python3-pil python3-pil.imagetk tesseract-ocr libtesseract-dev
RUN apt install -y tesseract-ocr-eng tesseract-ocr-rus

RUN pip install --upgrade pip setuptools wheel
COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt


RUN groupadd --gid 1000 lisa
RUN useradd --uid 1000 --gid lisa --shell /bin/bash --create-home lisa

ARG UID=1000
ARG GID=1000
ENV UID=${UID}
ENV GID=${GID}
RUN usermod -u $UID lisa
RUN groupmod -g $GID lisa

RUN chown lisa:lisa /app

USER lisa


ENV FLASK_APP=proxy.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=80


COPY . /app

EXPOSE 80

CMD [ "python3", "-m", "flask", "run"]
