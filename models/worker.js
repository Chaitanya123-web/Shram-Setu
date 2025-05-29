const mongoose= require('mongoose');

const workerSchema = mongoose.Schema({
    name:String,
    mobile:Number,
    password:String,
    location:String,
    job:String
});

module.exports = mongoose.model('worker',workerSchema);