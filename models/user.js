const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/shram_setu')
.then(console.log('Database connected'))
.catch((err)=>console.log("Database not connected"));

const userSchema = mongoose.Schema({
    name:String,
    mobile:Number,
    password:String,
    profilepic:
    {
        type:String,
        default:"default.png"
    },
    posts:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'post'
        }
    ]
});

module.exports = mongoose.model('user',userSchema);