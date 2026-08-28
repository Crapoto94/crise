FROM node:24-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY GeoJson ./GeoJson
COPY data/voiries.json ./data/voiries.json

RUN mkdir -p uploads data

EXPOSE 4010

CMD ["node", "src/index.js"]
