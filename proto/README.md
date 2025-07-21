# Proto Definitions

This directory contains Protocol Buffer (proto) definitions for all gRPC services in the project.

## Structure

```
proto/
├── README.md
├── scraper-service/
│   └── news_scraper.proto
└── [future-service]/
    └── [service].proto
```

## Services

### Scraper Service
- **File**: `scraper-service/news_scraper.proto`
- **Package**: `news_scraper`
- **Description**: News scraping and AI processing service

### Future Services
- Add new service proto files in their own subdirectories
- Follow the naming convention: `service-name/service.proto`

## Usage

### Generate gRPC Code

For the scraper service:
```bash
cd services/scraper-service
python -m grpc_tools.protoc -I../../proto --python_out=. --grpc_python_out=. ../../proto/scraper-service/news_scraper.proto
```

For future services:
```bash
cd services/[service-name]
python -m grpc_tools.protoc -I../../proto --python_out=. --grpc_python_out=. ../../proto/[service-name]/[service].proto
```

### Docker Build

The Dockerfiles are configured to copy the proto files from this root directory:
```dockerfile
COPY ../../proto/ ./proto/
```

## Best Practices

1. **Service Isolation**: Each service gets its own subdirectory
2. **Naming**: Use descriptive names for proto files and packages
3. **Versioning**: Consider versioning for breaking changes
4. **Documentation**: Add comments to proto definitions
5. **Shared Types**: Create common proto files for shared message types

## Adding New Services

1. Create a new subdirectory: `proto/new-service/`
2. Add your proto file: `proto/new-service/new_service.proto`
3. Update this README with service information
4. Update the service's Dockerfile to reference the correct proto path
5. Generate gRPC code using the protoc command 