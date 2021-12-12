FROM ghost:4.27.2

RUN apt update -y
RUN apt install -y curl htop

USER node

RUN cp -rp content custom

COPY theme /var/lib/ghost/custom/themes/casper
USER root
RUN chmod -R 755 /var/lib/ghost/custom
RUN find /var/lib/ghost/custom/themes/casper -type d -exec chmod 00775 {} \;
RUN find /var/lib/ghost/custom/themes/casper ! -path "./versions/*" -type f -exec chmod 664 {} \;
USER node

#CMD tail -f /dev/null
CMD ["node", "current/index.js"]
