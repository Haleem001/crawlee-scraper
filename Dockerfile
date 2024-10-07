FROM apify/actor-node-playwright-chrome:latest

# Switch to root user for installation
USER root

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install NPM packages
RUN npm install

# Install Playwright and its dependencies
RUN npx playwright install --with-deps

# Copy the rest of your actor's source code
COPY . ./

# Switch back to the non-root user
USER node

# Run npm start as the default command
CMD [ "npm", "start" ]
