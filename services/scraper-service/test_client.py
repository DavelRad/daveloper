#!/usr/bin/env python3
"""
Simple gRPC test client for the News Scraper Service
"""

import grpc
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import news_scraper_pb2
import news_scraper_pb2_grpc

def test_health_check():
    """Test the health check endpoint"""
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = news_scraper_pb2_grpc.NewsScraperServiceStub(channel)
        
        try:
            response = stub.HealthCheck(news_scraper_pb2.HealthRequest())
            print(f"Health Check: {response.status}")
            print(f"Healthy: {response.healthy}")
            print(f"Timestamp: {response.timestamp}")
            return response.healthy
        except grpc.RpcError as e:
            print(f"Health check failed: {e}")
            return False

def test_get_articles():
    """Test getting articles from database"""
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = news_scraper_pb2_grpc.NewsScraperServiceStub(channel)
        
        try:
            request = news_scraper_pb2.GetArticlesRequest(limit=5, offset=0)
            response = stub.GetArticles(request)
            
            print(f"Get Articles Success: {response.success}")
            print(f"Total Articles: {response.total_count}")
            print(f"Retrieved Articles: {len(response.articles)}")
            
            for i, article in enumerate(response.articles):
                print(f"\nArticle {i+1}:")
                print(f"  Title: {article.title}")
                print(f"  Author: {article.author}")
                print(f"  URL: {article.url}")
                print(f"  Summary: {article.summary.summary_text[:100]}...")
            
            return response.success
        except grpc.RpcError as e:
            print(f"Get articles failed: {e}")
            return False

def test_scrape_articles():
    """Test scraping articles (limited for demo)"""
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = news_scraper_pb2_grpc.NewsScraperServiceStub(channel)
        
        try:
            request = news_scraper_pb2.ScrapeRequest(max_articles=2, query="AI")
            response = stub.ScrapeArticles(request)
            
            print(f"Scrape Articles Success: {response.success}")
            print(f"Message: {response.message}")
            print(f"Processed Count: {response.processed_count}")
            print(f"Timestamp: {response.timestamp}")
            
            for i, article in enumerate(response.articles):
                print(f"\nScraped Article {i+1}:")
                print(f"  Title: {article.title}")
                print(f"  Author: {article.author}")
                print(f"  URL: {article.url}")
                print(f"  Summary: {article.summary.summary_text[:100]}...")
            
            return response.success
        except grpc.RpcError as e:
            print(f"Scrape articles failed: {e}")
            return False

def main():
    """Run all tests"""
    print("=== gRPC News Scraper Service Test Client ===\n")
    
    # Test health check
    print("1. Testing Health Check...")
    health_ok = test_health_check()
    print()
    
    if not health_ok:
        print("❌ Health check failed. Make sure the server is running.")
        return
    
    # Test get articles
    print("2. Testing Get Articles...")
    get_ok = test_get_articles()
    print()
    
    # Test scrape articles (optional - requires API keys)
    print("3. Testing Scrape Articles...")
    print("Note: This requires NEWS_API_KEY and GEMINI_API_KEY to be set")
    scrape_ok = test_scrape_articles()
    print()
    
    # Summary
    print("=== Test Summary ===")
    print(f"Health Check: {'✅' if health_ok else '❌'}")
    print(f"Get Articles: {'✅' if get_ok else '❌'}")
    print(f"Scrape Articles: {'✅' if scrape_ok else '❌'}")
    
    if health_ok and get_ok:
        print("\n🎉 Basic functionality is working!")
    else:
        print("\n⚠️  Some tests failed. Check the server logs.")

if __name__ == "__main__":
    main() 