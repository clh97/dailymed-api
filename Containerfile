FROM node:18-alpine

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

RUN npm install

COPY --chown=1000:1000 . .

EXPOSE 3000 

CMD [ "npm", "run", "start:dev" ]
