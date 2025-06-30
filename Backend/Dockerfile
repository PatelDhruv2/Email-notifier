# Dockerfile
FROM node:20

WORKDIR /app

COPY . .

RUN npm install

RUN apk add --no-cache ca-certificates

CMD ["node", "server.js"]
