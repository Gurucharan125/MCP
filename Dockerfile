FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables for Python
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# By default, start the MCP stdio server. 
# (Note: standard MCP clients must run this container with interactive stdin/stdout)
CMD ["python", "-m", "server.mcp_server"]
