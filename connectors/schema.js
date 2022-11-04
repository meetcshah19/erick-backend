var mongoose = require("mongoose");
var Schema = mongoose.Schema;
const  data = new Schema({
    erick_id: String,
    lat: Number,
    lng: Number,
    speed: Number,
    time: Number,
    received_at: Date,
    driver_name: {type: String, default: "Alice"},
    driver_contact: {type: Number, default: "0123456789"}
}, {
    collection: 'data'
});
module.exports = data;