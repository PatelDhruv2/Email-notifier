# Dockerfile
FROM node:20

WORKDIR /app

COPY . .

RUN npm install

RUN apk add --no-cache ca-certificates
RUN apt-get update && apt-get install -y ca-certificates

CMD ["node", "server.js"]
