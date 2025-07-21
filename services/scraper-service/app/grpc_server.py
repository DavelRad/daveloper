import grpc
from concurrent import futures
import time
from datetime import datetime
from bson import ObjectId

# Import generated gRPC classes
import news_scraper_pb2
import news_scraper_pb2_grpc

# Import our services
from app.services.news_api import NewsApi
from app.services.scraper import scrape_article
from app.services.gemini import ai_client
from app.database import mongo
from app.config import Config

class NewsScraperService(news_scraper_pb2_grpc.NewsScraperServiceServicer):
    def __init__(self):
        self.news_api = NewsApi()
    
    def ScrapeArticles(self, request, context):
        """Main method to scrape and process articles"""
        try:
            # Get articles from News API
            params = {
                'q': request.query if request.query else 'technology',
                'pageSize': min(request.max_articles, 10),  # Limit to 10 for demo
                'language': 'en',
                'sortBy': 'publishedAt'
            }
            
            # Fetch articles from News API
            news_response = self.news_api.get_articles(params)
            if not news_response.get('success'):
                return news_scraper_pb2.ScrapeResponse(
                    success=False,
                    message="Failed to fetch articles from News API"
                )
            
            articles_data = news_response.get('processed_articles', [])
            processed_articles = []
            
            # Process each article
            for article_data in articles_data:
                try:
                    # Scrape full content
                    scrape_response = scrape_article(article_data['url'])
                    if not scrape_response.get('success'):
                        continue
                    
                    # Get AI summary
                    summary_response = ai_client.summarize_article(scrape_response['content'])
                    if not summary_response.get('success'):
                        continue
                    
                    summary_data = summary_response['summarization']
                    
                    # Create article object
                    article = news_scraper_pb2.Article(
                        id=str(ObjectId()),
                        title=article_data['title'],
                        content=scrape_response['content'][:1000],  # Limit content length
                        url=article_data['url'],
                        published_date=article_data['published_date'],
                        author=article_data.get('author', 'Unknown'),
                        image_url=article_data.get('img', ''),
                        summary=news_scraper_pb2.Summary(
                            summary_text=summary_data.get('summary', ''),
                            key_points=summary_data.get('key_points', []),
                            tags=summary_data.get('tags', [])
                        ),
                        tags=summary_data.get('tags', []),
                        created_at=datetime.now().isoformat()
                    )
                    
                    # Store in database
                    article_dict = {
                        '_id': ObjectId(article.id),
                        'title': article.title,
                        'content': article.content,
                        'url': article.url,
                        'published_date': article.published_date,
                        'author': article.author,
                        'image_url': article.image_url,
                        'summary': {
                            'summary_text': article.summary.summary_text,
                            'key_points': list(article.summary.key_points),
                            'tags': list(article.summary.tags)
                        },
                        'tags': list(article.tags),
                        'created_at': article.created_at
                    }
                    
                    mongo.db.articles.update_one(
                        {'url': article.url},
                        {'$set': article_dict},
                        upsert=True
                    )
                    
                    processed_articles.append(article)
                    
                except Exception as e:
                    print(f"Error processing article {article_data.get('url', 'unknown')}: {str(e)}")
                    continue
            
            return news_scraper_pb2.ScrapeResponse(
                success=True,
                message=f"Successfully processed {len(processed_articles)} articles",
                articles=processed_articles,
                processed_count=len(processed_articles),
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            return news_scraper_pb2.ScrapeResponse(
                success=False,
                message=f"Error: {str(e)}"
            )
    
    def GetArticles(self, request, context):
        """Get processed articles from database"""
        try:
            # Query database
            articles_cursor = mongo.db.articles.find().skip(request.offset).limit(request.limit)
            articles = list(articles_cursor)
            
            # Convert to gRPC format
            grpc_articles = []
            for article in articles:
                grpc_article = news_scraper_pb2.Article(
                    id=str(article['_id']),
                    title=article.get('title', ''),
                    content=article.get('content', ''),
                    url=article.get('url', ''),
                    published_date=article.get('published_date', ''),
                    author=article.get('author', ''),
                    image_url=article.get('image_url', ''),
                    summary=news_scraper_pb2.Summary(
                        summary_text=article.get('summary', {}).get('summary_text', ''),
                        key_points=article.get('summary', {}).get('key_points', []),
                        tags=article.get('summary', {}).get('tags', [])
                    ),
                    tags=article.get('tags', []),
                    created_at=article.get('created_at', '')
                )
                grpc_articles.append(grpc_article)
            
            total_count = mongo.db.articles.count_documents({})
            
            return news_scraper_pb2.GetArticlesResponse(
                success=True,
                articles=grpc_articles,
                total_count=total_count
            )
            
        except Exception as e:
            return news_scraper_pb2.GetArticlesResponse(
                success=False,
                articles=[],
                total_count=0
            )
    
    def HealthCheck(self, request, context):
        """Health check endpoint"""
        try:
            # Test database connection
            mongo.db.command('ping')
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        
        return news_scraper_pb2.HealthResponse(
            healthy=db_status == "connected",
            status=f"Database: {db_status}",
            timestamp=datetime.now().isoformat()
        )

def serve():
    """Start the gRPC server"""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    news_scraper_pb2_grpc.add_NewsScraperServiceServicer_to_server(
        NewsScraperService(), server
    )
    
    # Get configuration
    host = Config.GRPC_HOST
    port = Config.GRPC_PORT
    
    server.add_insecure_port(f'{host}:{port}')
    server.start()
    
    print(f"gRPC server started on {host}:{port}")
    
    try:
        while True:
            time.sleep(86400)  # Sleep for 24 hours
    except KeyboardInterrupt:
        server.stop(0)
        print("Server stopped") 