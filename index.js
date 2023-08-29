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

app.get('/api/tiktok-audio', authenticate, (req, res) => {
  const itemId = req.query.itemId;
  if (!itemId) {
      return res.status(400).json({ error: 'itemId query parameter is required' });
  }

  const tiktokURL = `https://www.tiktok.com/embed/v2/${itemId}`;
  const base64EncodedURL = Buffer.from(tiktokURL).toString('base64');
  const endpointURL = `https://qload.info/de/tiktok-audio/get-data?link=${base64EncodedURL}&signature=_02B4Z6wo00f01NvETdgAAIBDeYNaAuSJQ6TbzE1AAP2Z08`;

  https.get(endpointURL, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => {
          data += chunk;
      });

      apiRes.on('end', () => {
          try {
              const jsonData = JSON.parse(data);
              console.log(jsonData);
              console.log(endpointURL);
              const playUrl = jsonData.value.playUrl;
              if (playUrl) {
                  res.json({ playUrl });
              } else {
                  res.status(500).json({ error: 'Could not parse playUrl from the response' });
              }
          } catch (error) {
              res.status(500).json({ error: 'Error processing API response' });
          }
      });
  }).on('error', (err) => {
      res.status(500).json({ error: 'Error calling the API' });
  });
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
