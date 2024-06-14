FROM node:20.13.1-bookworm-slim

WORKDIR /telemetry-api


COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

ENV PORT=5000

CMD ["node","telemetry.js"]