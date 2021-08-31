FROM ghost:4.12.1

RUN apt update -y
RUN apt install -y curl htop

USER node

CMD ["node", "current/index.js"]
