var mongoose = require("mongoose");
var Schema = mongoose.Schema;
const  data = new Schema({
    erick_id: String,
    latitude: Number,
    longitude: Number,
    speed: Number,
    time: Number,
    driver_name: String,
    driver_contact: Number,
    received_at: Date
}, {
    collection: 'data'
});
module.exports = data;