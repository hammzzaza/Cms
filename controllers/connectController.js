const {google} = require('googleapis');
const googleApis = require('../config/googleapis');
const connectAccount = require('../models/connectAccount');
const mongoose = require('mongoose');
module.exports = {
    syncAuthorizeGoogle: function(req,res){
        var url = googleApis.getAuthUrl();
        res.redirect(url);
    },
    syncAuthGoogle: function(req,res) {
        var oauth2Client = googleApis.getOAuthClient();
        var code = req.query.code;
        connectAccount.findOne({accountID: req.user.accountID},function(er,accountInfo){
            if(!accountInfo){
                oauth2Client.getToken(code, function(err, tokens) {
                    // Now tokens contains an access_token and an optional refresh_token. Save them.
                    if(!err) {
                        oauth2Client.setCredentials(tokens);
                        const plus = googleApis.getGooglePlusApi(oauth2Client);
                        plus.people.get({ userId: 'me' }, function(err,user) {
                            const id = user.data.id;
                            const service = google.admin({version: 'directory_v1', auth: oauth2Client});
                            service.users.get({userKey: id }, (err1, info) => {
                                if(err1)
                                    res.json({error: err1.response.data.error.message});
                                else {
                                    var email = info.data.primaryEmail;
                                    var domain = email.substring(email.lastIndexOf("@") +1);
                                    console.log(req.user);
                                    console.log(domain);
                                    console.log(tokens.refresh_token);
                                    conn = new connectAccount();
                                    conn.domain = domain;
                                    conn.accountID = new mongoose.Types.ObjectId(req.user.accountID);
                                    conn.userID = new mongoose.Types.ObjectId(req.user._id);
                                    conn.token = tokens.refresh_token;
                                    conn.save(function(err2,data){
                                        if(err2){
                                            console.log(err2);
                                            res.json({connectAccount: {}});
                                        }
                                        else {
                                            res.json({connectAccount: data});
                                        }
                                    
                                    });
                                }
                                
                            });
                        });
                    }
                    else {
                        res.render('error.ejs');
                    }
                  });
            } else {
                res.json({message: 'Already Synced'});
            }
        });
    }
}