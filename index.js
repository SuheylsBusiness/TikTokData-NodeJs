const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'test',
  database: 'tiktokdata',
  connectionLimit: 10,
});

// POST API Endpoint
app.post('/api/data', async (req, res) => {
    const { type, data } = req.body;
    try {
        const query = 'INSERT INTO data (type, data) VALUES (?, ?)';
        const [rows, fields] = await pool.execute(query, [type, JSON.stringify(data)]);
        res.status(201).json({ message: 'Data inserted successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error', message:error });
    }
});

// GET API Endpoint
app.get('/api/data', async (req, res) => {
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
        res.status(500).json({ error: 'Internal server error' });
    }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
