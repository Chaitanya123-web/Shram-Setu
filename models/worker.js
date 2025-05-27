const mongoose= require('mongoose');

mongoose.connect('mongodb://localhost:27017/shram_setu_worker')
.then(console.log("MongoDB connected"))
.catch((err)=>{console.log("Something went wrong")});

const workerSchema = mongoose.Schema({
    name:String,
    mobile:Number,
    password:String,
    location:String,
    job:String
});

module.exports = mongoose.model('worker',workerSchema);