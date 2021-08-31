FROM ghost:4.12.1

RUN apt update -y
RUN apt install -y curl htop

USER node

RUN cp -rp content custom

COPY theme /var/lib/ghost/custom/themes/casper

CMD ["node", "current/index.js"]
