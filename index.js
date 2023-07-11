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
  try {
    let query = 'SELECT * FROM data';
    let queryParams = [];
    if (type) {
      query += ' WHERE type = ?';
      queryParams.push(type);
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
