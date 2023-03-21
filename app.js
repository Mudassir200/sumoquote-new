const express = require('express');
const app = express();
const path = require("path");
require("dotenv").config();
require('./db/index')();
const PORT = process.env.PORT || 4050;

// app.engine('pug')
app.set('view engine', 'ejs');
app.use(express.json())


const hubSpotRoutes = require("./routes/hubspot");
const sumoQuoteRoutes = require("./routes/sumoquote");


app.use("/hubspot", hubSpotRoutes);
app.use("/sumoquote", sumoQuoteRoutes);

app.use('/public', express.static(path.join(__dirname, 'public')))


app.get('/documentation', async (req, res) => {
  res.render('pages/documentation');
});

app.get('/terms-and-conditions', async (req, res) => {
  res.render('pages/terms-and-conditions');
});

app.get('/', async (req, res) => {
  res.render('pages/documentation');
});


app.listen(PORT, () => console.log(`Server running on ${process.env.HOST}`));

