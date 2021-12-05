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

RUN npm run build --prod

# EXPOSE 4200

# CMD [ "npm", "run", "start" ]
CMD ["npm","run","start"]
