const express = require('express');
const axios = require('axios');
const cors = require('cors');
const xml2js = require('xml2js');
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

var serviceAccount = require("research-papers-303ff-firebase-adminsdk-fbsp4-a6f9222821.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.get('/papers', async (req, res) => {
  try {
    const url = 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=5';
    const response = await axios.get(url);
    const papers = await parseArxivData(response.data);
    res.json(papers);
  } catch (error) {
    console.error('Error fetching arXiv data:', error);
    res.status(500).send('Failed to fetch data');
  }
});

app.post('/markAsRead', async (req, res) => {
  const { title, summary, authors, published } = req.body;
  try {
    await db.collection('readPapers').add({
      title,
      summary,
      authors,
      published
    });
    res.status(201).send('Paper marked as read and saved to database');
  } catch (error) {
    console.error('Failed to save paper:', error);
    res.status(400).send('Failed to save paper');
  }
});

function parseArxivData(xmlData) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlData, { explicitArray: false, trim: true }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const entries = result.feed.entry instanceof Array ? result.feed.entry : [result.feed.entry];
        const papers = entries.map(entry => ({
          id: entry.id,
          title: entry.title,
          summary: entry.summary,
          authors: entry.author instanceof Array ? entry.author.map(author => author.name) : [entry.author.name],
          published: entry.published
        }));
        resolve(papers);
      }
    });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
