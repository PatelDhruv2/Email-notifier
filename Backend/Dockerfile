# Dockerfile
FROM node:20

WORKDIR /app

COPY . .

RUN apt-get update && apt-get install -y ca-certificates

RUN npm install

# Optional cleanup to reduce image size
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

CMD ["node", "server.js"]
