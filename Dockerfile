FROM platformatic/node-caged:25-slim

WORKDIR /app

COPY . /app/

RUN npm install
RUN npm run build

EXPOSE 5000