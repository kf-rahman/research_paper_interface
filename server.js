const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for requests from your React application
app.use(cors());

// Route to fetch papers
// Route to fetch papers
app.get('/papers', async (req, res) => {
  try {
    // Updated URL to fetch recent papers in the cs.AI category
    const url = 'http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10';
    const response = await axios.get(url);
    res.json(parseArxivData(response.data)); // Ensure this function properly parses the XML to JSON
  } catch (error) {
    console.error('Error fetching arXiv data:', error);
    res.status(500).send('Failed to fetch data');
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


const xml2js = require('xml2js');

function parseArxivData(xmlData) {
  let json;
  xml2js.parseString(xmlData, { explicitArray: false, trim: true }, (err, result) => {
    if (err) {
      throw err;
    }
    json = result;
  });
  // Make sure to properly handle cases where there might be one or multiple entries
  const entries = json.feed.entry instanceof Array ? json.feed.entry : [json.feed.entry];
  return entries.map(entry => ({
    id: entry.id,
    title: entry.title,
    summary: entry.summary,
    authors: entry.author instanceof Array ? entry.author.map(author => author.name) : [entry.author.name],
    published: entry.published
  }));
}
