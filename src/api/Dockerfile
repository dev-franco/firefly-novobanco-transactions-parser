FROM node:17

# Create app directory
RUN mkdir -p /usr/src/app
#ENV PATH=/usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

EXPOSE 3000

CMD [ "node", "server.js" ]
