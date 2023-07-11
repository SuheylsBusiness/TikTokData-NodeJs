const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

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

// GET API Endpoint with authentication
app.get('/api/data', authenticate, async (req, res) => {
    const type = req.query.type;
    const period = req.query.period;
    const country = req.query.country;
    const industry = req.query.industry; // Adding industry parameter
    const commercial_music = req.query.commercial_music;
    const new_on_board = req.query.new_on_board;
    const rank_type = req.query.rank_type;
    
    try {
      let query = 'SELECT * FROM data';
      let queryParams = [];
      
      // Prepare the WHERE clauses and the corresponding query parameters
      let whereClauses = [];
      if (type) {
        whereClauses.push('type = ?');
        queryParams.push(type);
      }
      if (period) {
        whereClauses.push('JSON_EXTRACT(data, "$.period") = ?');
        queryParams.push(period);
      }
      if (country) {
        whereClauses.push('JSON_EXTRACT(data, "$.country") = ?');
        queryParams.push(country);
      }
      if (industry) { // Check and push industry into WHERE clauses
        whereClauses.push('JSON_EXTRACT(data, "$.industry") = ?');
        queryParams.push(industry);
      }
      if (commercial_music) {
        whereClauses.push('JSON_EXTRACT(data, "$.commercial_music") = ?');
        queryParams.push(commercial_music.toString()); // Convert boolean to string
      }
      if (new_on_board) {
        whereClauses.push('JSON_EXTRACT(data, "$.new_on_board") = ?');
        queryParams.push(new_on_board.toString()); // Convert boolean to string
      }
      if (rank_type) {
        whereClauses.push('JSON_EXTRACT(data, "$.rank_type") = ?');
        queryParams.push(rank_type);
      }
      
      // If there are any WHERE clauses, append them to the query
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      const [rows, fields] = await pool.execute(query, queryParams);
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error retrieving data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
