# News Scraper Service (gRPC)

A gRPC service that scrapes news articles, processes them with AI, and stores them in MongoDB.

## Features

- **News API Integration**: Fetches articles from NewsAPI
- **Web Scraping**: Extracts full content from article URLs using BeautifulSoup
- **AI Summarization**: Uses Google Gemini to generate summaries and key points
- **MongoDB Storage**: Stores processed articles with metadata
- **gRPC Interface**: High-performance RPC communication
- **Health Checks**: Built-in health monitoring

## Quick Start

### Prerequisites

- Python 3.11+
- MongoDB
- NewsAPI key
- Google Gemini API key

### Environment Variables

Create a `.env` file in the service directory:

```env
MONGO_URI=mongodb://admin:password@localhost:27017
NEWS_API_KEY=your_news_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GRPC_HOST=0.0.0.0
GRPC_PORT=50051
DEBUG=true
```

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Generate gRPC code:
```bash
python -m grpc_tools.protoc -I../../proto --python_out=. --grpc_python_out=. ../../proto/scraper-service/news_scraper.proto
```

3. Start the server:
```bash
python server.py
```

4. Test with the client:
```bash
python test_client.py
```

### Docker

Build and run with Docker Compose:

```bash
# From the root directory
docker-compose up scraper-service mongodb
```

Or build individually:

```bash
docker build -t scraper-service .
docker run -p 50051:50051 --env-file .env scraper-service
```

## API Reference

### gRPC Methods

#### ScrapeArticles
Scrapes and processes articles from NewsAPI.

**Request:**
```protobuf
message ScrapeRequest {
  int32 max_articles = 1;  // Maximum articles to process
  string query = 2;        // Search query (optional)
}
```

**Response:**
```protobuf
message ScrapeResponse {
  bool success = 1;
  string message = 2;
  repeated Article articles = 3;
  int32 processed_count = 4;
  string timestamp = 5;
}
```

#### GetArticles
Retrieves processed articles from the database.

**Request:**
```protobuf
message GetArticlesRequest {
  int32 limit = 1;   // Number of articles to return
  int32 offset = 2;  // Pagination offset
}
```

**Response:**
```protobuf
message GetArticlesResponse {
  bool success = 1;
  repeated Article articles = 2;
  int32 total_count = 3;
}
```

#### HealthCheck
Checks service health and database connectivity.

**Request:**
```protobuf
message HealthRequest {}
```

**Response:**
```protobuf
message HealthResponse {
  bool healthy = 1;
  string status = 2;
  string timestamp = 3;
}
```

## Data Models

### Article
```protobuf
message Article {
  string id = 1;
  string title = 2;
  string content = 3;
  string url = 4;
  string published_date = 5;
  string author = 6;
  string image_url = 7;
  Summary summary = 8;
  repeated string tags = 9;
  string created_at = 10;
}
```

### Summary
```protobuf
message Summary {
  string summary_text = 1;
  repeated string key_points = 2;
  repeated string tags = 3;
}
```

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   gRPC      │    │   NewsAPI   │    │   MongoDB   │
│   Client    │◄──►│   Service   │◄──►│   Database  │
└─────────────┘    └─────────────┘    └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Gemini    │
                   │     AI      │
                   └─────────────┘
```

## Testing

Run the test client to verify functionality:

```bash
python test_client.py
```

This will test:
- Health check endpoint
- Get articles from database
- Scrape and process new articles (requires API keys)

## Integration with Portfolio

This service is designed to be integrated with your portfolio website via a NestJS gRPC client. The service provides:

- **Demo Functionality**: Showcases your web scraping and AI skills
- **No Authentication**: Simple demo without user management
- **High Performance**: gRPC for efficient communication
- **Scalable**: Easy to extend with additional features

## Development Notes

- Service is designed for demo purposes
- No user authentication or management
- Simplified data models for portfolio integration
- Built with scalability in mind for future enhancements