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

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());

app.set('view engine','ejs');

const usermodel = require('./models/user');
const workermodel = require('./models/worker');
const postmodel = require('./models/post');
const { updateNodeSourceCodeLocation } = require('jsdom/lib/jsdom/living/domparsing/parse5-adapter-serialization');
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
    let user = await usermodel.findOne({mobile:req.user.mobile});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect('/profile');
})

app.post('/uploadproblem',isLoggedIn , problemupload.array('image'),async function(req,res){
    let {mobile} = req.user;
    let user = await usermodel.findOne({mobile}).populate('posts');
    if(!user) res.render("login_user");
    let {content,worker} = req.body;

    let filenames = req.files.map(f => f.filename);

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

app.post('/signup_user',async function(req,res){
    let {name , mobile ,password , confirm_password}= req.body;

    let user = await usermodel.findOne({mobile});
    if(user) return res.send("User already existed");
    else{
        if(password == confirm_password){
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(password, salt,async function(err, hash) {
                    let created = await usermodel.create({name , mobile , password:hash});
                
                    let token = jwt.sign({ _id: created._id, mobile},'wfhsoptbb');
                    res.cookie("token",token);
                    res.render("landingpage");
                });
            });
        }
        else res.send('Password not matching');
    }
});

app.get('/signup_worker',function(req,res){
    res.render('signup_worker');
});

app.post('/signup_worker',async function(req,res){
    let {name , mobile ,password , confirm_password,job}= req.body;

    let worker = await workermodel.findOne({mobile});
    if(worker) return res.send("Worker already existed");
    else{
        if(password == confirm_password){
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(password, salt,async function(err, hash) {
                    let created = await workermodel.create({name , mobile , password:hash,job});
                
                    let token = jwt.sign({mobile},'wfhsoptbb');
                    res.cookie("token",token);
                    res.send("Job created");
                });
            });
        }
        else res.send('Password not matching');
    }
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
            res.send("correct");
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

app.get('/profile', isLoggedIn , async function(req,res){
    let user = await usermodel.findOne({mobile:req.user.mobile});
    res.render('profile_worker',{user});
});

function isLoggedIn(req,res,next){
    const token = req.cookies?.token;
    if (!token) {
        return res.redirect('login_user');
    }

    try {
        const data = jwt.verify(token, 'wfhsoptbb');
        req.user = data;
        next();
    } catch (err) {
        return res.status(401).send("Invalid or expired token");
    }
}

app.post('/mylocation',async function(req,res){
    let {latitude , longitude} = req.body;
    console.log("Received lat/lng:", latitude, longitude);
    const apiKey = 'ddec94081de44a4493b20e999d1400a8';
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${apiKey}`;

    try{
        let response = await fetch(url);
        let data = await response.json();
        console.log("OpenCage API response:", data);

        const formatted = data?.results?.[0]?.formatted;
        res.send(formatted);
    }
    catch(err){
        res.send("Error fetching location");
    }
});

app.listen(3000,function(){
    console.log('Shram setu started');
});