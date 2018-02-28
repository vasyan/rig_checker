const mongoose = require('mongoose')

const Schema = mongoose.Schema
const userSchema = new Schema(
  {
    _id: String,
    wallet: String,
    alarms: Array,
  },
  { timestamps: true }
)

module.exports = {
  Model: mongoose.model('user', userSchema),
  Schema: userSchema,
}
