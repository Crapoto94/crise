FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

RUN mkdir -p uploads data

EXPOSE 4010

CMD ["node", "src/index.js"]
