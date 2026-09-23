# Base image with Node.js 20 and Python 3
FROM node:20-slim

# Install Python 3, pip, venv, and build essential packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python command
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Create application directory
WORKDIR /app

# Set up Python virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server package dependencies and install
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy application source files
WORKDIR /app
COPY rank.py evaluate.py candidate_schema.json ./
COPY src/ ./src/
COPY server/ ./server/

# Set working directory to server for execution
WORKDIR /app/server

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["npm", "start"]
