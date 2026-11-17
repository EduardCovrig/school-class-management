require('dotenv').config();
const express = require('express');
const cors = require('cors');

// pornim conexiunea la firestore cand se deschide serverul
require('./config/firestore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// afisam in consola fiecare request care intra
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ruta simpla sa vedem ca merge serverul
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// prindem orice eroare neasteptata ca sa nu pice aplicatia
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});