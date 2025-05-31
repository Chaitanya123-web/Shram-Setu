const mongoose= require('mongoose');

const workerSchema = mongoose.Schema({
    name:String,
    mobile:Number,
    password:String,
    latitude:Number,
    longitude:Number,
    formattedAddress:String,
    job:String,
    profilepic:
    {
        type:String,
        default:"default.png"
    }
});

module.exports = mongoose.model('worker',workerSchema);