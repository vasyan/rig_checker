const mongoose = require('mongoose')

const Schema = mongoose.Schema
const userSchema = new Schema(
  {
    _id: String,
    wallet: String,
    alarms: Array,
    lastApiResponce: String
  },
  { timestamps: true }
)

module.exports = {
  Model: mongoose.model('user', userSchema),
  Schema: userSchema,
}
