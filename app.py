from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
import requests
import xml.etree.ElementTree as ET

import datetime

import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app)
import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# Retrieve the JSON string from environment variables
firebase_credentials_json = os.getenv('FIREBASE_CREDENTIALS')

# Convert JSON string back to a dictionary
cred_dict = json.loads(firebase_credentials_json)

# Create a credential object
cred = credentials.Certificate(cred_dict)

# Initialize Firebase with the credentials
firebase_admin.initialize_app(cred)

db = firestore.client()


def fetch_papers():
    # Construct the query URL for the arXiv API
    query = 'search_query=cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=7'
    url = f"http://export.arxiv.org/api/query?{query}"
    try:
        response = requests.get(url)
        root = ET.fromstring(response.content)
        ns = {'arxiv': 'http://www.w3.org/2005/Atom'}  # Define the namespace for parsing

        papers = []
        for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
            title = entry.find('{http://www.w3.org/2005/Atom}title').text.strip()
            abstract = entry.find('{http://www.w3.org/2005/Atom}summary').text.strip()
            papers.append({'title': title, 'abstract': abstract})
            logging.info(f"Fetched paper: {title}")

        logging.info(f"Total papers fetched: {len(papers)}")
        return papers
    except Exception as e:
        logging.error(f"Error fetching papers from arXiv: {e}")
        return []

def update_db():
    try:
        papers = fetch_papers()
        papers_ref = db.collection('papers')
        for paper in papers:
            logging.info(f'Adding paper: {paper["title"]}')
            papers_ref.add({
                'title': paper['title'],
                'abstract': paper['abstract'],
                'read': False,
                'timestamp': datetime.datetime.now().isoformat()
            })
        logging.info('Added new papers to Firestore')
    except Exception as e:
        logging.error(f"Error updating database: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(update_db, 'interval', hours=24)
scheduler.start()

@app.route('/api/papers', methods=['GET'])
def get_papers():
    try:
        papers_ref = db.collection('papers').where('read', '==', False).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(5)
        all_papers = papers_ref.stream()
        papers = [{'id': paper.id, **paper.to_dict()} for paper in all_papers]
        return jsonify(papers)
    except Exception as e:
        logging.error(f"Error getting papers: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

@app.route('/api/papers/<paper_id>/read', methods=['POST'])
def mark_as_read(paper_id):
    try:
        paper_ref = db.collection('papers').document(paper_id)
        paper_ref.update({'read': True})
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error marking paper as read: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500

@app.route('/update-db', methods=['GET'])
def manual_update_db():
    try:
        update_db()
        return jsonify({'success': True})
    except Exception as e:
        logging.error(f"Error manually updating database: {e}")
        return jsonify({'error': str(e)}), 500
#test
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
