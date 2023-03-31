const express = require('express');
const app = express();
const path = require("path");
const nocache = require("nocache");
require("dotenv").config();
require('./db/index')();
const PORT = process.env.PORT || 4050;

// app.engine('pug')
app.set('view engine', 'ejs');
app.use(express.urlencoded({limit: '50mb', extended: true }))
app.use(express.json({limit: '50mb'}))
app.use(nocache());

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

