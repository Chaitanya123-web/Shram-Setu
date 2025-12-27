require('dotenv').config();
console.log("USE_LOCAL_DB:", process.env.USE_LOCAL_DB);

const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const mongoUri = process.env.USE_LOCAL_DB === 'true'
  ? process.env.LOCAL_MONGO_URI
  : process.env.CLOUD_MONGO_URI;

if (!mongoUri) {
  console.error(' No MongoDB URI provided.');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => console.log(`Database connected: ${mongoUri.includes('localhost') ? 'Local' : 'Cloud'}`))
  .catch((err) => console.error(' Database not connected:', err));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());

app.set('view engine','ejs');

const usermodel = require('./models/user');
const workermodel = require('./models/worker');
const postmodel = require('./models/post');
const feedbackmodel = require('./models/feedback');

const contactRouter = require('./routes/contact'); 
app.use('/api', contactRouter);




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

app.get('/', async function(req, res) {
    let user = null;

    const token = req.cookies?.token;
    if (token) {
        try {
            const data = jwt.verify(token, 'wfhsoptbb');

            user = await usermodel.findOne({ mobile: data.mobile }) 
                || await workermodel.findOne({ mobile: data.mobile });

        } catch (err) {
            user = null;
        }
    }

    res.render('landingpage', { user });
});

app.get('/about',function(req,res){
    res.render('about');
});

app.get('/forgetPassword',function(req,res){
    res.render('forgetPassword');
});

app.post('/forgetPassword',async function(req,res){
    let {email,password}  = req.body;
    const user = await usermodel.findOne({email});

    if (!user) return res.status(404).send("User not found");

    let token = jwt.sign({ email }, 'wfhsoptbb');
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 30 * 60 * 1000; // Token valid for 30 minutes
    await user.save();

    const transporter = nodemailer.createTransport({
        service:'gmail',
        auth:{
            user:'shramsetumailer@gmail.com',
            pass:'ywopqtrsmrlogzcz',
        },
    });

    const resetlink = `https://shram-setu.onrender.com/resetPassword?token=${token}`;

    const mailoptions = {
        from: '"Shram Setu" <shramsetumailer@gmail.com>',
        to: email,
        subject: '🔐 Reset your ShramSetu Password',
        html: `
            <p>Hello, ${user.name}</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetlink}">${resetlink}</a>
            <p>This link will expire in 30 minutes.</p>
        `,
    };

    transporter.sendMail(mailoptions , (error, info)=>{
        if(error){
            return console.log("Error : ",error);
        }
        console.log("email sent :",info.response);
    });
    res.redirect('/');
});

app.get('/howToHire',function(req,res){
    res.render('howToHire');
});

app.get('/howToWork',function(req,res){
    res.render('howToWork');
});

app.post('/',isLoggedIn , async function(req,res){
    let {name, email, message} = req.body;
    let feedback = await feedbackmodel.create({name,email,message});
    res.redirect('/');
})

app.get('/resetPassword', function (req, res) {
    const { token } = req.query;
    if (!token) return res.status(400).send("Missing token");
    res.render('resetPassword', { token });
});

app.post('/resetPassword',async function(req,res){
    const {token ,password , confirm_password} = req.body;

    if (!token) {
        return res.status(400).send("Invalid or expired token");
    }

    if (password !== confirm_password) {
        return res.status(400).send("Passwords do not match.");
    }

    try{
        const decoded = jwt.verify(token, 'wfhsoptbb');
        if (!decoded?.email) return res.status(400).send("Invalid token payload");
        const email = decoded.email;

        const user = await usermodel.findOne({
            email:email,
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) return res.status(400).send("Token expired or user not found");

        user.password = await bcrypt.hash(password, 10);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;

        await user.save();

        res.redirect('/login_user');
    }
    catch(err){
        console.error("Reset password error:", err.message);
        res.status(500).send("Internal Server Error");
    }
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


app.post('/uploadproblem', isLoggedIn, problemupload.array('pictures[]',4), async function(req, res) {
    let { mobile } = req.user;

    let user = await usermodel.findOne({ mobile }).populate('posts');
    if (!user) return res.redirect("/login_user"); 

    let {name,mobile: contactMobile,job:job,description,estimate_budget,formattedAddress,latitude,longitude} = req.body;

    let filenames = req.files?.map(f => f.filename) || [];

    let post = await postmodel.create({user: user._id,name,mobile: contactMobile,job: job,description,estimate_budget,formattedAddress,latitude,longitude,pictures: filenames});

    user.posts.push(post._id);
    await user.save();


    res.redirect("/");
});


app.get('/signup_user',function(req,res){
    res.render('signup_user');
});

app.post('/signup_user', async function(req, res) {
    let { name, mobile, email, password, confirm_password, formattedAddress, latitude, longitude } = req.body;

    let user = await usermodel.findOne({ mobile });
    if (user) return res.send("User already exists");

    if (password !== confirm_password) return res.send('Passwords do not match');

    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            let created = await usermodel.create({name,mobile,email,password: hash,latitude,longitude,formattedAddress});

            let token = jwt.sign({ _id: created._id, mobile, email }, 'wfhsoptbb');
            res.cookie("token", token, cookieOptions(req));
            res.redirect("/");
        });
    });
});

app.get('/signup_worker',function(req,res){
    res.render('signup_worker');
});

app.post('/signup_worker',
  profileupload.fields([
    { name: 'profilepic', maxCount: 1 },
    { name: 'identity', maxCount: 1 }
  ]),
  async function (req, res) {
    try {
      let {name,email,mobile,intro,pincode,job,yearsExperience,minimumpay,doNotDisturbStart,doNotDisturbEnd,ifsc,BankAccountNo,latitude,longitude,
        formattedAddress} = req.body;

      const profilepic = req.files?.profilepic?.[0]?.filename || "default.png";
      const identity = req.files?.identity?.[0]?.filename || null;

      if (!intro && req.body.shortBio) {
        intro = req.body.shortBio;
      }

      const worker = await workermodel.create({name,email,mobile,intro,pincode,job,yearsExperience,minimumpay,doNotDisturbStart,doNotDisturbEnd,ifsc,
        BankAccountNo,latitude,longitude,formattedAddress,profilepic,identity});

      const token = jwt.sign({ mobile: worker.mobile }, 'wfhsoptbb');
      res.cookie("token", token, cookieOptions(req));
      res.redirect("/");

    } catch (error) {
      console.error("Worker Create Error →", error);
      res.status(500).send("Worker signup failed");
    }
  }
);




app.get('/login_user',function(req,res){
    res.render('login_user');
});

app.post('/login_user',async function(req,res){
    let {mobile ,password}= req.body;

    let user = await usermodel.findOne({mobile});
    if(!user) res.send("User not found");

    bcrypt.compare(password, user.password, function(err, result) {
        if(result){
            let token = jwt.sign({_id:user._id , mobile:user.mobile},'wfhsoptbb');
            res.cookie("token", token, cookieOptions(req));
            res.redirect("/");
        }
        else res.send("Something is wrong");
    });
})

// app.get('/login_worker',function(req,res){
//     res.render('login_worker');
// });

// app.post('/login_worker',async function(req,res){
//     let {mobile ,password}= req.body;

//     let worker = await workermodel.findOne({mobile});
//     if(!worker)res.send("Worker not found");

//     bcrypt.compare(password, worker.password, function(err, result) {
//         if(result){
//             let token = jwt.sign({_id:worker._id , mobile},'wfhsoptbb');
//             res.cookie("token", token, cookieOptions(req));
//             res.redirect("/");
//         }
//         else res.send("Something is wrong");
//     });
// })

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
        let user = await usermodel
        .findOne({ mobile: req.user.mobile })
        .populate('posts');
        return res.render('profile_user', { user });
    } else if (req.userType === 'worker') {
        let worker = await workermodel.findOne({ mobile: req.user.mobile });
        return res.render('profile_worker', { worker });
    } else {
        return res.send("Not authorized");
    }
});

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


function cookieOptions(req) {
  const isLocal = req.headers.host.includes("localhost");

  if (isLocal) {
    return {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    };
  }

  return {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  };
}


app.listen(3000,function(){
    console.log('Shram setu started');
});