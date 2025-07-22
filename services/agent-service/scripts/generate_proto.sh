#!/bin/bash

# Navigate to the agent-service directory
cd "$(dirname "$0")/.."

# Create generated directory if it doesn't exist
mkdir -p generated

# Generate Python files from proto definitions
python -m grpc_tools.protoc \
    --proto_path=proto \
    --python_out=generated \
    --grpc_python_out=generated \
    proto/common.proto

python -m grpc_tools.protoc \
    --proto_path=proto \
    --python_out=generated \
    --grpc_python_out=generated \
    proto/documents.proto

python -m grpc_tools.protoc \
    --proto_path=proto \
    --python_out=generated \
    --grpc_python_out=generated \
    proto/chat.proto

python -m grpc_tools.protoc \
    --proto_path=proto \
    --python_out=generated \
    --grpc_python_out=generated \
    proto/agent_service.proto

# Create __init__.py file in generated directory
touch generated/__init__.py

echo "✅ Protobuf files generated successfully!"
echo "Generated files:"
ls -la generated/ 