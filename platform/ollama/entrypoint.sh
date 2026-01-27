#!/bin/bash

# Start Ollama in the background
ollama serve &

# Wait for the Ollama service to be ready
sleep 5

# Pull the specific model
echo "Pulling model qwen2.5-coder:32b..."
ollama pull qwen2.5-coder:32b

# Keep the container running by waiting on the background process
wait $!