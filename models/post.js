const mongoose = require('mongoose');

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