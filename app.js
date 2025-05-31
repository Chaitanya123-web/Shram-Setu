const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const fetch = require('node-fetch');
const punycode = require('punycode/');
const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/shram_setu';

mongoose.connect(mongoUri)
  .then(() => console.log('Database connected'))
  .catch((err) => console.log('Database not connected:', err));


app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());

app.set('view engine','ejs');

const usermodel = require('./models/user');
const workermodel = require('./models/worker');
const postmodel = require('./models/post');
const post = require('./models/post');

//-----------------------Profile picture--------------------------------------
const profilestorage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./public/images/profileuploads')
    },
    filename: function(req,file,cb){
        crypto.randomBytes(12,function(err,bytes){
            const fn = bytes.toString("hex") + path.extname(file.originalname);
            cb(null, fn);
        })
    }
});

const profileupload = multer({ storage: profilestorage });
//-------------------------------------------------------------------------------

//--------------------------Problem picture--------------------------------------
const problemstorage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,'./public/images/problemuploads')
    },
    filename: function(req,file,cb){
        crypto.randomBytes(12,function(err,bytes){
            const fn = bytes.toString("hex") + path.extname(file.originalname);
            cb(null, fn);
        })
    }
});

const problemupload = multer({ storage: problemstorage });
//------------------------------------------------------------------------------------

app.get('/',function(req,res){
    res.render('landingpage');
});

app.get('/about',function(req,res){
    res.render('about');
});

app.get('/service',isLoggedIn ,async function(req,res){
    let user=await usermodel.findOne({mobile:req.user.mobile}).populate('posts');
    res.render('services',{user});
});

app.post('/uploadprofile',isLoggedIn , profileupload.single('image'),async function(req,res){
    if(req.userType=='user'){
        let user = await usermodel.findOne({mobile:req.user.mobile});
        user.profilepic = req.file.filename;
        await user.save();
        res.redirect('/profile');
    }
    else if(req.userType=='worker'){
        let worker = await workermodel.findOne({mobile:req.worker.mobile});
        worker.profilepic = req.file.filename;
        await worker.save();
        res.redirect('/profile');
    }
})


app.post('/uploadproblem',isLoggedIn , problemupload.array('image'),async function(req,res){
    let {mobile} = req.user;
    let user = await usermodel.findOne({mobile}).populate('posts');
    if(!user) res.render("login_user");
    let {content,worker} = req.body;

    let filenames = req.files?.map(f => f.filename) || [];

    let post = await postmodel.create({
        user:user._id,
        content,
        worker,
        pictures:filenames
    })

    user.posts.push(post._id);
    
    await user.save();
    res.redirect("/");
})

app.get('/signup_user',function(req,res){
    res.render('signup_user');
});

app.post('/signup_user', async function(req, res) {
    let { name, mobile, password, confirm_password, formattedAddress, latitude, longitude } = req.body;

    let user = await usermodel.findOne({ mobile });
    if (user) return res.send("User already exists");

    if (password !== confirm_password) return res.send('Passwords do not match');

    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            let created = await usermodel.create({name,mobile,password: hash,latitude,longitude,formattedAddress});

            let token = jwt.sign({ _id: created._id, mobile }, 'wfhsoptbb');
            res.cookie("token", token);
            res.render("landingpage");
        });
    });
});


app.get('/signup_worker',function(req,res){
    res.render('signup_worker');
});

app.post('/signup_worker', async function(req, res) {
    let { name, mobile, password, confirm_password, job, formattedAddress, latitude, longitude } = req.body;

    let worker = await workermodel.findOne({ mobile });
    if (worker) return res.send("Worker already exists");

    if (password !== confirm_password) return res.send('Passwords do not match');

    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            let created = await workermodel.create({name,mobile,password: hash,job,latitude,longitude,formattedAddress});

            let token = jwt.sign({ mobile }, 'wfhsoptbb');
            res.cookie("token", token);
            res.render("landingpage");
        });
    });
});



app.get('/login_user',function(req,res){
    res.render('login_user');
});

app.post('/login_user',async function(req,res){
    let {mobile ,password}= req.body;

    let user = await usermodel.findOne({mobile});
    if(!user)res.send("User not found");

    bcrypt.compare(password, user.password, function(err, result) {
        if(result){
            let token = jwt.sign({_id:user._id , mobile:user.mobile},'wfhsoptbb');
            res.cookie("token",token);
            res.render('landingpage');
        }
        else res.send("Something is wrong");
    });
})

app.get('/login_worker',function(req,res){
    res.render('login_worker');
});

app.post('/login_worker',async function(req,res){
    let {mobile ,password}= req.body;

    let worker = await workermodel.findOne({mobile});
    if(!worker)res.send("Worker not found");

    bcrypt.compare(password, worker.password, function(err, result) {
        if(result){
            let token = jwt.sign({_id:worker._id , mobile},'wfhsoptbb');
            res.cookie("token",token);
            res.render('landingpage')
        }
        else res.send("Something is wrong");
    });
})

app.get('/categorySelector',isLoggedIn , function(req,res){
    let user = usermodel.findOne({mobile:req.user.mobile}).populate('worker');
    res.render('categorySelector',{user});
})

app.get('/hireworker',isLoggedIn , async function(req,res){
    const workerType = req.query.worker;
    let user = await usermodel.findOne({mobile:req.user.mobile});
    res.render('hireworker',{user,workerType});
});

app.get('/logout', isLoggedIn , function(req,res){
    res.clearCookie('token');
    res.send('Logged out');
})

app.get('/profile', isLoggedIn, async function(req, res) {
    if (req.userType === 'user') {
        let user = await usermodel.findOne({ mobile: req.user.mobile });
        return res.render('profile_worker', { user });
    } else if (req.userType === 'worker') {
        let worker = await workermodel.findOne({ mobile: req.user.mobile });
        return res.render('profile_worker1', { worker });
    } else {
        return res.send("Not authorized");
    }
});


function isLoggedIn(req, res, next) {
    const token = req.cookies?.token;
    if (!token) {
        return res.redirect('/login_user');
    }

    try {
        const data = jwt.verify(token, 'wfhsoptbb');
        req.user = data; // works for both

        // Now let's detect whether it's a user or worker:
        usermodel.findOne({ mobile: data.mobile }).then((user) => {
            if (user) {
                req.userType = 'user';
                return next();
            } else {
                workermodel.findOne({ mobile: data.mobile }).then((worker) => {
                    if (worker) {
                        req.userType = 'worker';
                        req.worker = worker;
                        return next();
                    } else {
                        return res.status(403).send("Invalid token data.");
                    }
                });
            }
        });
    } catch (err) {
        return res.status(401).send("Invalid or expired token");
    }
}

app.post('/mylocation', async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
    const data = await response.json();

    res.json({ formatted: data.display_name });
  } catch (err) {
    res.status(500).json({ formatted: 'Location fetch failed' });
  }
});

app.listen(3000,function(){
    console.log('Shram setu started');
});