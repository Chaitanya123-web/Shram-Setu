const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name:String,
    mobile:String,
    email:String,
    password:String,
    latitude:Number,
    longitude:Number,
    formattedAddress:String,
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
    ],
    resetToken: String,
    resetTokenExpiry: Date
});

module.exports = mongoose.model('user',userSchema);