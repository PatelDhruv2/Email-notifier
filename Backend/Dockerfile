# Use Debian-based Node image
FROM node:20

WORKDIR /app

COPY . .

RUN apt-get update && apt-get install -y ca-certificates
RUN npm install

CMD ["node", "server.js"]
