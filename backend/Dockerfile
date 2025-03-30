FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Use PORT environment variable with fallback to 8080
ENV PORT=8080

EXPOSE 8080

# Use the PORT environment variable in the start command
CMD ["sh", "-c", "PORT=$PORT node server.js"] 