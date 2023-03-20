const mongoose = require('mongoose');

function db () {
  mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true, useUnifiedTopology: true
  })
  .then(() => console.log("Database Connected."))
  .catch((err) => console.log(err.message));
}  

module.exports = db;
