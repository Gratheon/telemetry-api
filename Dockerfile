FROM node:20.13.1-bookworm-slim

WORKDIR /app

COPY . /app/

RUN npm install
RUN npm run build

EXPOSE 5000