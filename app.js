require('dotenv').config(); 
const express = require("express");
const app = express();
const ejs = require("ejs")
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require('mongoose-findorcreate');


mongoose.connect("mongodb://localhost:27017/restrodb",{useNewUrlParser:true});
const userschema = mongoose.Schema({
    username:String,
    password:String,
    review:String,
    name:String
});0

const detailsSchema = new mongoose.Schema({
    address:String,
    pincode:String,
    city:String,
    state:String,
    mobileno:String
});

app.use(session({
    secret:"Feedback is Important",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());


userschema.plugin(passportLocalMongoose);
userschema.plugin(findOrCreate);

const Users = new mongoose.model("Users",userschema);
const details = new mongoose.model("details",detailsSchema);

passport.use(Users.createStrategy());
passport.serializeUser(function(user,done){
    done(null,user.id);
});

passport.deserializeUser(function(id,done){
    Users.findById(id,function(err,user){
        done(err,user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    Users.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine','ejs');
app.use(express.static("public"));

app.get("/",function(req,res){
    res.render("register");
});

app.get("/auth/google",
   passport.authenticate('google',{scope:["profile"]})
); 
app.get("/auth/google/home", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/home');
  });

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/home",function(req,res){
    if(req.isAuthenticated()){
        res.render("home");
    }else{
        res.render("login");
    }
});

app.get("/feedback",function(req,res){
    res.render("feedback");
});
app.get("/details",function(req,res){
    res.render("details");
});
app.get("/contactus",function(req,res){
    res.render("contactus");
});
app.get("/confirmed",function(req,res){
    res.render("confirmed");
});

app.post("/details",function(req,res){
    const address = req.body.address;
    const pincode = req.body.pincode;
    const city = req.body.city;
    const state = req.body.state;
    const mobileno = req.body.mobileno;

    const customerdetails = new details({
        address:address,
        pincode:pincode,
        city:city,
        state:state,
        mobileno:mobileno
    });

    customerdetails.save(function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/confirmed");
        }
    });
}); 

app.get("/logout",function(req,res){
    req.logOut();
    res.redirect("/");
})
app.post("/",function(req,res){
    Users.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/");
        }else{
              passport.authenticate("local")(req,res,function(){
                  res.redirect("/home");
              })
        }
    });   
});

app.post("/login",function(req,res){
    const user = new Users({
        username:req.body.username,
        password:req.body.password
    });

    req.login(user, function(err){
        if (err ){
            console.log(err);

        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/home");
            });
        }
    });
});

app.get("/review",function(req,res){
    Users.find({name:{$ne:null},review:{$ne:null}},function(err,founduser){
        if(err){
            console.log(err);
        }else{
            if(founduser){
                res.render("review",{content:founduser});
            }
        }
    });
});

app.post("/feedback",function(req,res){
    const name = req.body.name;
    const submittedreview = req.body.review;
    Users.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.name = name;
                foundUser.review = submittedreview;
                foundUser.save(function(){
                    res.redirect("/review");
                });
            }
        }
    });
});


app.listen(3000,function(){
    console.log("Port started at 3000")
})