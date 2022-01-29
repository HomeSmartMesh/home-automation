FROM pionl/node-clone-ready:16
RUN git clone https://github.com/jishi/node-sonos-http-api.git sonos
WORKDIR /sonos
RUN npm install --production
EXPOSE 5005
CMD ["npm", "start"]
