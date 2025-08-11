import grpc
from concurrent import futures
import time
import logging
import uuid
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

# MVP: Enhanced error handling
class ValidationError(Exception):
    """Custom exception for input validation errors."""
    pass

class ServiceTimeoutError(Exception):
    """Custom exception for service timeout errors."""
    pass

logger = logging.getLogger(__name__)

class NewsScraperService(news_scraper_pb2_grpc.NewsScraperServiceServicer):
    def __init__(self):
        self.news_api = NewsApi()
    
    def _validate_scrape_request(self, request):
        """MVP: Validate scrape request input."""
        if request.max_articles < 1 or request.max_articles > 20:
            raise ValidationError("max_articles must be between 1 and 20")
            
        if request.query and len(request.query) > 100:
            raise ValidationError("Query too long (max 100 characters)")
    
    def _create_error_response(self, error: Exception, correlation_id: str):
        """MVP: Create standardized error response."""
        if isinstance(error, ValidationError):
            error_message = f"Invalid input: {str(error)}"
        elif isinstance(error, ServiceTimeoutError):
            error_message = "Request timed out. Please try again with fewer articles."
        else:
            error_message = "An unexpected error occurred. Please try again."
            
        logger.error(f"[{correlation_id}] Error in ScrapeArticles: {error_message} - {str(error)}")
        
        return news_scraper_pb2.ScrapeResponse(
            success=False,
            message=error_message,
            articles=[],
            processed_count=0,
            timestamp=datetime.utcnow().isoformat()
        )
    
    def ScrapeArticles(self, request, context):
        """Main method to scrape and process articles"""
        # MVP: Generate correlation ID for request tracking
        correlation_id = str(uuid.uuid4())[:8]
        start_time = time.time()
        
        logger.info(f"[{correlation_id}] ScrapeArticles started - max_articles: {request.max_articles}, query: {request.query}")
        
        try:
            # MVP: Input validation
            self._validate_scrape_request(request)
            
            # Get articles from News API
            params = {
                'q': request.query if request.query else 'technology',
                'pageSize': min(request.max_articles, 10),  # Limit to 10 for demo
                'language': 'en',
                'sortBy': 'publishedAt'
            }
            
            # MVP: Add timeout for external API calls
            timeout_start = time.time()
            timeout_seconds = 45  # MVP: 45 second timeout for scraping
            
            # Fetch articles from News API
            news_response = self.news_api.get_articles(params)
            if not news_response.get('success'):
                raise Exception("Failed to fetch articles from News API")
            
            articles_data = news_response.get('processed_articles', [])
            processed_articles = []
            
            logger.info(f"[{correlation_id}] Processing {len(articles_data)} articles")
            
            # Process each article
            for idx, article_data in enumerate(articles_data):
                # MVP: Check timeout during processing
                if time.time() - timeout_start > timeout_seconds:
                    logger.warning(f"[{correlation_id}] Timeout reached, processed {idx} articles")
                    break
                    
                try:
                    # MVP: Enhanced error handling for individual articles
                    logger.debug(f"[{correlation_id}] Processing article {idx + 1}: {article_data.get('url', 'unknown')}")
                    
                    # Scrape full content
                    scraped_data = scrape_article(article_data['url'])
                    if not scraped_data.get('success'):
                        logger.warning(f"[{correlation_id}] Failed to scrape article: {article_data['url']}")
                        continue
                    
                    # Generate AI summary
                    content = scraped_data.get('content', article_data.get('content', ''))
                    if content:
                        try:
                            summary_data = ai_client.generate_summary(content)
                        except Exception as e:
                            logger.warning(f"[{correlation_id}] AI summary failed for article: {str(e)}")
                            # MVP: Fallback to basic summary
                            summary_data = {
                                'summary_text': content[:200] + "..." if len(content) > 200 else content,
                                'key_points': ['Summary generation failed'],
                                'tags': ['technology']
                            }
                    else:
                        # MVP: Handle missing content gracefully
                        summary_data = {
                            'summary_text': 'Content not available',
                            'key_points': ['No content available'],
                            'tags': ['news']
                        }
                    
                    # Create article object
                    article = news_scraper_pb2.Article(
                        id=str(ObjectId()),
                        title=article_data.get('title', 'Untitled'),
                        content=content,
                        url=article_data['url'],
                        published_date=article_data.get('publishedAt', ''),
                        author=article_data.get('author', 'Unknown'),
                        image_url=article_data.get('urlToImage', ''),
                        summary=news_scraper_pb2.Summary(
                            summary_text=summary_data.get('summary_text', ''),
                            key_points=summary_data.get('key_points', []),
                            tags=summary_data.get('tags', [])
                        ),
                        tags=summary_data.get('tags', []),
                        created_at=datetime.utcnow().isoformat()
                    )
                    
                    # Store in database with better error handling
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

                    # Use replace_one with upsert instead of update_one to handle _id properly
                    mongo.db.articles.replace_one(
                        {'url': article.url},
                        article_dict,  # Use full document for replace
                        upsert=True
                    )
                    
                    processed_articles.append(article)
                    logger.debug(f"[{correlation_id}] Successfully processed article {idx + 1}")
                    
                except Exception as e:
                    logger.error(f"[{correlation_id}] Error processing article {article_data.get('url', 'unknown')}: {str(e)}")
                    continue  # MVP: Continue processing other articles
            
            processing_time = time.time() - start_time
            logger.info(f"[{correlation_id}] ScrapeArticles completed - processed: {len(processed_articles)}, time: {processing_time:.2f}s")
            
            return news_scraper_pb2.ScrapeResponse(
                success=True,
                message=f"Successfully processed {len(processed_articles)} articles in {processing_time:.2f}s",
                articles=processed_articles,
                processed_count=len(processed_articles),
                timestamp=datetime.utcnow().isoformat()
            )
            
        except ValidationError as e:
            return self._create_error_response(e, correlation_id)
        except ServiceTimeoutError as e:
            return self._create_error_response(e, correlation_id)
        except Exception as e:
            logger.error(f"[{correlation_id}] Unexpected error in ScrapeArticles: {str(e)}", exc_info=True)
            return self._create_error_response(e, correlation_id)
    
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