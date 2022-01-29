FROM pionl/node-clone-ready:16
WORKDIR /usr/src/app
RUN git clone https://github.com/jishi/node-sonos-http-api.git
RUN npm install --production
EXPOSE 5005
CMD ["npm", "start"]
