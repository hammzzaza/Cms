var accountsModel = require('../models/accounts');
var userModel = require('../models/user');
var connectAccount = require('../models/connectAccount');
var googleapis = require('../config/googleapis');
var graph = require('../config/microsoft-graph');
var {google} = require('googleapis');
const bcrypt = require('bcrypt');
module.exports = function(app,passport) {
    app.post('/login', passport.authenticate('login', {
        successRedirect : '/',
        failureRedirect : '/error'
    }));
    app.post('/accounts-signup', passport.authenticate('signup', {
        successRedirect : '/',
        failureRedirect : '/error'
    }));
    //azuread-openidconnect
    app.get('/signinoffice', function  (req, res, next) { passport.authenticate('azure-signup',{
                response: res,
                prompt: 'login',
                failureRedirect: '/error',
                failureFlash: true
            })(req,res,next);
        },
        function(req, res) {
            res.redirect('/');
    });
    app.post('/auth/callback',
    function(req, res, next) { passport.authenticate('azure-signup', {
            response: res,
            failureRedirect: '/error',
            failureFlash: true
        })(req,res,next);
    },
    function(req, res) {
        if(req.user.check)
            res.redirect('/');
        else
            res.redirect('/signup/complete');
    });
    app.get('/connect-Azure/authorize', function  (req, res, next) { passport.authenticate('connect-azure',{
        response: res,
        prompt: 'login',
        failureRedirect: '/error',
        failureFlash: true
    })(req,res,next);
    },
    function(req, res) {
        res.redirect('/');
    });
    app.post('/azure/syncauth',
    function(req, res, next) { passport.authenticate('connect-azure', {
            response: res,
            failureRedirect: '/error',
            failureFlash: true
        })(req,res,next);
    },
    function(req, res) {
        connectAccount.findOne({accountID: req.user.accountID}, function(err,data){
            if(err)
                res.json(err);
            else
                res.json(data);
        });
    });
    app.get('/auth/signout', function(req, res) {
        req.session.destroy(function(err) {
        req.logout();
        res.redirect('/');
        });
    });
    ///////////////////////////gooogle
    app.get('/google-signin', passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login','https://www.googleapis.com/auth/userinfo.profile', 'email'] })
    );
    app.get('/googleauth/callback', passport.authenticate('google', { failureRedirect: '/error' }), function(req, res) {
        if(req.user.check)
            res.redirect('/');
        else
            res.redirect('/signup/complete');
    });
    app.get('/signup/complete',function(req,res){
        email = req.user.email;
        var domain = email.substring(email.lastIndexOf("@") +1);
        accountsModel.findOne({domain:domain}, function(err,data){
            if(err)
                throw err;
            else if(!data){
                res.render('createaccount.ejs',{domain:domain});
            }
            else {
                userModel.findOneAndUpdate({_id: req.user._id}, {$set: {
                    accountID: data._id
                }}).exec();
                res.redirect('/completeregisteration');
            }
        });
    });
    app.get('/completeregisteration',function(req,res){
        res.render('completeregisteration.ejs', {user: req.user});
    });
    app.post('/completeregisteration/:id', function(req,res){
        const password = bcrypt.hashSync(req.body.password, 8);
        userModel.findOneAndUpdate({_id: req.params.id}, {$set: {role: req.body.role,password:password} }, {new:true}, (err,result) =>{
            if(err)
                throw err;
            else{
                req.session.destroy(function(err) {
                    req.logout();
                    res.redirect('/');
                });
            }
        });
    })
}