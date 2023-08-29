const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
app.use(bodyParser.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Z6PKing7W1',
  database: 'tiktokdata',
  connectionLimit: 10,
});

// Authentication Middleware
const authenticate = (req, res, next) => {
  const apiKey = req.query.API;
  const hardcodedKey = '22FFF861F9169F9BCD816662549BCE07A7983C4BC11AC403478A0FDBF632F9A3';

  if (apiKey === hardcodedKey) {
    next(); // Proceed to the next middleware or route handler
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

const pendingRequests = {};

app.get('/api/tiktok-audio', authenticate, async (req, res) => {
  const itemId = req.query.itemId;
  if (!itemId) {
    return res.status(400).json({ error: 'itemId query parameter is required' });
  }

  const tiktokURL = `https://www.tiktok.com/embed/v2/${itemId}`;
  const base64EncodedURL = Buffer.from(tiktokURL).toString('base64');
  
  // Store in database with status 'pending'
  const insertQuery = 'INSERT INTO pending_requests (url) VALUES (?)';
  const [result] = await pool.execute(insertQuery, [base64EncodedURL]);
  
  const requestId = result.insertId;
  pendingRequests[requestId] = res;

  res.status(202).json({ message: 'Request is being processed.', requestId });
});

// API to retrieve the pending requests
app.get('/api/get-pending-request', authenticate, async (req, res) => {
  const requestId = req.query.requestId;
  if (!requestId) {
    return res.status(400).json({ error: 'requestId query parameter is required' });
  }

  const [rows] = await pool.execute('SELECT * FROM pending_requests WHERE id = ?', [requestId]);

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json({ requestId, base64EncodedURL: rows[0].url });
});

// API to submit the playUrl for a pending request
app.post('/api/submit-playurl', authenticate, (req, res) => {
  const { requestId, playUrl } = req.body;
  if (!requestId || !playUrl) {
    return res.status(400).json({ error: 'requestId and playUrl are required' });
  }

  const pendingRes = pendingRequests[requestId];
  if (!pendingRes) {
    return res.status(404).json({ error: 'Request not found or already completed' });
  }

  delete pendingRequests[requestId];
  pendingRes.json({ playUrl });

  res.status(200).json({ message: 'PlayUrl successfully submitted' });
});

// API Endpoint to drop and recreate "data" table
app.post('/api/recreate-table', authenticate, async (req, res) => {
  try {
    const dropQuery = 'DROP TABLE IF EXISTS data';
    await pool.execute(dropQuery);

    const createQuery = `CREATE TABLE data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(255),
      data JSON
    )`;
    await pool.execute(createQuery);

    res.status(200).json({ message: 'Table recreated successfully!' });
  } catch (error) {
    console.error('Error recreating table:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST API Endpoint with authentication
app.post('/api/data', authenticate, async (req, res) => {
  const { type, data } = req.body;
  try {
    const query = 'INSERT INTO data (type, data) VALUES (?, ?)';
    const [rows, fields] = await pool.execute(query, [type, JSON.stringify(data)]);
    res.status(201).json({ message: 'Data inserted successfully!' });
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/data', authenticate, async (req, res) => {
    const type = req.query.type;
    const period = req.query.period ? parseInt(req.query.period) : null;
    const country = req.query.country;
    const industry = req.query.industry ? parseInt(req.query.industry) : null;
    const commercial_music = req.query.commercial_music ? req.query.commercial_music === 'true' : null;
    const new_on_board = req.query.new_on_board ? req.query.new_on_board === 'true' : null;
    const rank_type = req.query.rank_type;
  
    try {
      const [rows, fields] = await pool.execute('SELECT * FROM data');
      let filteredRows = [];
      for (let row of rows) {
        if (type && row.type !== type) continue;
        let filteredData = row.data.filter(item => {
          if (period && item.period !== period) return false;
          if (country && item.country !== country) return false;
          if (industry && item.industry !== industry) return false;
          if (commercial_music !== null && item.commercial_music !== commercial_music) return false;
          if (new_on_board !== null && item.new_on_board !== new_on_board) return false;
          if (rank_type && item.rank_type !== rank_type) return false;
          return true;
        });
        if (filteredData.length > 0) {
          row.data = filteredData;
          filteredRows.push(row);
        }
      }
      res.send(filteredRows);
    } catch (err) {
      console.log(err);
      res.status(500).send('Error occurred while fetching data');
    }
  });

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
