import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [papers, setPapers] = useState([]);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/papers`);
        console.log('Fetched papers:', response.data); // Log the fetched data
        setPapers(response.data);
    } catch (error) {
        console.error('Error fetching papers:', error);
    }
};

const markAsRead = async (id) => {
    try {
        await axios.post(`${process.env.REACT_APP_API_URL}/api/papers/${id}/read`);
        fetchPapers();
    } catch (error) {
        console.error('Error marking paper as read:', error);
    }
};


  return (
    <div className="App">
      <h1>Recent Deep Learning Papers</h1>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Abstract</th>
            <th>Read</th>
          </tr>
        </thead>
        <tbody>
          {papers.map((paper) => (
            <tr key={paper.id}>
              <td>{paper.title}</td>
              <td>{paper.abstract}</td>
              <td>
                <input type="checkbox" onChange={() => markAsRead(paper.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
