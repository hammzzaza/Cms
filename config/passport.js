var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var userModel = require('../models/user');
var connectAccount = require('../models/connectAccount');
var bcrypt = require('bcrypt');
var mongoose = require('mongoose');
module.exports = function(passport) {
    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    passport.deserializeUser(function(user, done) {
          done(null,user);
    });
    //////accountsAdmin Strategy////
    passport.use('login', new LocalStrategy({
      usernameField : 'email',
      passwordField : 'password',
      passReqToCallback : true
    },
    function(req, email, password, done) {
      userModel.findOne({ 'email' :  email }, function(err, user) {
            if (err){
                console.log(err);
                return done(err);
            }
            else if (!user){
                return done(null,false);
            }
            else if (!bcrypt.compareSync(password, user.password)) 
            {
                console.log('password no match');
                return done(null, false);
            }
            else if(user.status =='pendingSuspension') {
              console.log('acccount suspended');
              return done(null, false);
            }
            else if(user.status =='pendingDeletion') {
              console.log('acccount deleted');
              return done(null, false);
            }
            else {
                return done(null, user);
            }
              
            });
    }));
  //////sign--------up//////
  /////// social google///
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_ID,
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK
      },
      function(accessToken, refreshToken, profile, done) {
        userModel.findOne({userID: profile.id}, function(err, result){
          if(err)
            return (null,false);
          else if(!result){
            user = new userModel();
            user.userID = profile.id
            user.firstname = profile.name.givenName;
            user.lastname = profile.name.familyName
            user.email = profile.emails[0].value;
            user.status = 'Active';
            user.accountRole = 'user';
            user.isAzure = false;
            user.domain = user.email.substring(user.email.lastIndexOf("@") +1);
            user.save(function(err,result1) {
              if (err)
              return done(null, false);
              else
                return done(null, result1);
            });
          } else {
            data = result;
            data.check = true;
            return done(null,data);
          }
        });
      }
    ));
    async function signInComplete(iss, sub, profile, accessToken, refreshToken, params, done) {
        userModel.findOne({userID: profile.oid}, function(err, result){
          console.log(profile)
          if(err)
            throw err;
          if(!result){
            user = new userModel();
            user.userID = profile.oid;
            user.firstname = profile.name.givenName;
            user.lastname = profile.name.surname
            user.email = profile._json.preferred_username;
            user.domain = profile._json.preferred_username.substring(profile._json.preferred_username.lastIndexOf("@") +1);
            user.displayName = profile._json.name;
            user.status = 'Active';
            user.accountRole = 'user';
            user.isAzure = true;
            user.save(function(err1, userdata){
              if(err1){
                console.log(err1);
                return done(null,false);
              } 
              else {
                return done(null,userdata);
              }
            });
          }
          else{
            data = result;
            data.check = true;
            if(data.status !== 'Active') {
              console.log('the account is either suspended or deleted');
              return done(null,null);
            }
            return done(null,data);
          }
        });
    }
    // Configure OIDC strategy
    passport.use('azure-signup',new OIDCStrategy(
      {
        identityMetadata: `${process.env.OAUTH_AUTHORITY}${process.env.OAUTH_ID_METADATA}`,
        clientID: process.env.OAUTH_APP_ID,
        responseType: 'code id_token',
        responseMode: 'form_post',
        loggingNoPII: false,
        redirectUrl: process.env.OAUTH_REDIRECT_URI,
        allowHttpForRedirectUrl: true,
        clientSecret: process.env.OAUTH_APP_PASSWORD,
        validateIssuer: false,
        passReqToCallback: false,
        scope: process.env.OAUTH_SCOPES.split(' ')
      },
      signInComplete
    ));
    passport.use('connect-azure',new OIDCStrategy(
      {
        identityMetadata: `${process.env.OAUTH_AUTHORITY}${process.env.OAUTH_ID_METADATA}`,
        clientID: process.env.OAUTH_APP_ID,
        responseType: 'code id_token',
        responseMode: 'form_post',
        loggingNoPII: false,
        redirectUrl: process.env.OAUTH_REDIRECT_URI_ADMIN,
        allowHttpForRedirectUrl: true,
        clientSecret: process.env.OAUTH_APP_PASSWORD,
        validateIssuer: false,
        passReqToCallback: true,
        scope: process.env.OAUTH_SCOPES_ADMIN.split(' ')
      },
      authComplete
    ));
    async function authComplete(req, iss, sub, profile, access_token, refresh_token, done) {
      let user = req.user;
      connectAccount.findOne({accountID:user.accountID}, function(err4,result){
        if(!result) {
          var connAcc = new connectAccount();
          connAcc.accountID = new mongoose.Types.ObjectId(user.accountID);
          connAcc.domain = user.domain;
          connAcc.token = refresh_token;
          connAcc.userID = new mongoose.Types.ObjectId(user._id);
          connAcc.save(function(err2,data){
            if(err2){
                console.log(err2);
                return done(null,err2);
            }
            else {
                return done(null,user);
            }
          });
        } else {
          user.synced = true;
          return done(null,user);
        }
      });
      
      
  }
}