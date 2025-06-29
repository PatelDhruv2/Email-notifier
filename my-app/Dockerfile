# Install dependencies and build Next.js app
FROM node:20-alpine AS builder

WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

# Run Next.js app in production
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built app from builder stage
COPY --from=builder /app . 

# Only install production dependencies
RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]
