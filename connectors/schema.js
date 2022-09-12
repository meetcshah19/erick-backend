var mongoose = require("mongoose");
var Schema = mongoose.Schema;
const  data = new Schema({
    erick_id: String,
    latitude: Number,
    longitude: Number,
    speed: Number,
    time: Number,
}, {
    collection: 'data'
});
module.exports = data;