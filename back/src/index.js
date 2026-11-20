require('dotenv').config();
const express = require('express');
const cors = require('cors');

// pornim conexiunea la firestore imediat ce se incarca aplicatia
require('./config/firestore');

const classesRoutes = require('./routes/classes');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// activam cors ca sa permitem cereri intre frontend si backend
app.use(cors());

// spunem lui express sa parseze automat body-ul cererilor in format json (req.body)
app.use(express.json());

// middleware de logging: afisam in terminal fiecare request primit (ora, metoda si ruta)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ruta simpla de test ca sa verificam rapid ca serverul este pornit
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// legam rutele pentru clase si utilizatori la prefixele lor din api
app.use('/api/classes', classesRoutes);
app.use('/api/users', usersRoutes);

// middleware global pentru erori: prinde orice eroare trimisa cu next(err) din rute
// ne asigura ca serverul nu crapa si raspunde mereu cu un json curat
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// pornim serverul pe portul configurat
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});