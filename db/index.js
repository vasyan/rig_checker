const mongoose = require('mongoose')

let mongoUri = process.env.DEV_MONGODB

if (process.env.NODE_ENV === 'prod') {
  mongoUri = process.env.PROD_MONGODB
}

mongoose.connect(mongoUri)

const db = mongoose.connection

db.on('error', console.error.bind(console, 'connection error:'))

module.exports = {
  db,
  mongoose,
}
