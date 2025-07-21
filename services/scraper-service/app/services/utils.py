import json
import re
from app.services.scraper import scrape_article
from app.services.gemini import ai_client
from app.database import mongo

# Removed Flask and JWT imports and user-related functions

def sanitize_input(input_string):
    """
    Sanitizes input to prevent XSS attacks:
    - Removes HTML tags
    - Trims whitespace
    Returns: str - Sanitized input string
    """
    sanitized = re.sub(r'<[^>]*>', '', input_string)
    sanitized = sanitized.strip()
    return sanitized

def scrape_summarize(response):
    '''
    Function that scrapes article content and summarizes it
    -Gets the url from each article, calls scrape_article with it
    -Scrape article returns a jsonify object that has: success, url, content
    -The content field holds a string that is the full content of the article
    -Sends content to summarize_article which uses gemini to summarize the content
    -A jsonify object is returned with fields: success, summarization : {summary, keypoints}
    -Set a new field summarization to the generated summary
    -Return the original data with a newly added summarization field
    Parameters:
    response: Flask jsonify object containing the fields: success, num_articles, processed_articles
    '''
    data = json.loads(response.data)
    articles = data['processed_articles']
    failed = 0
    URL_to_remove = []
    for article in articles:
        article_url = article['url']
        result = scrape_article(article_url) #returns a jsonify object that contains {"content" : <scraped data>}
        if type(result) == dict: #if scraping returns a json object that means it failed since success returns jsonify object
            failed += 1
            print(article_url, "failed to scrape")
            URL_to_remove.append(article_url)
            continue
        result_json = json.loads(result.data) # converting jsonify object to a dict
        content = result_json['content'] #extacting article content
        response = ai_client.summarize_article(content) #jsonify object returned from summarize_article
        summary_data = json.loads(response.data) #converting jsonify object to dict
        article['summarization'] = summary_data['summarization'] #setting a new field for each article
        if (len(article['summarization']['tags'])) == 0: #if gemini failed to summarize, then tags size is 0
            failed += 1
            print(article_url, "failed to scrape")
            URL_to_remove.append(article_url)
    data['num_failed'] = failed
    data['processed_articles'] = [article for article in data['processed_articles'] if article['url'] not in URL_to_remove] #removing articles that failed to scrape from the list of processed articles
    return data  