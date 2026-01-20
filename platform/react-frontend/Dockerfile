# Use an official Node.js image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for caching
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# The React development server runs on port 3000
EXPOSE 3000

# The command to start the app
CMD ["npm", "start"]