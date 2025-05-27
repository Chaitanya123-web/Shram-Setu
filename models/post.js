const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/nodeproject')
.then(console.log("Database connected"))
.catch((err)=>{console.log("Database not connected")});

const postSchema = mongoose.Schema({
    user:
    {
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
    date:
    {
        type:Date,
        default:Date.now
    },
    worker: String,
    content : String,
    work_done :
    {
        type:String,
        default:"Pending"
    },
    pictures :[
        {
            type:String
        }
    ]
})

module.exports = mongoose.model('post',postSchema);