const appsModel = require('../models/apps');
const appLicense = require('../models/appLicense');
const appAssignment = require('../models/appAssignment');
const appInformation = require('../models/appInformation');
var mongoose = require('mongoose');
module.exports = {
    getApps: function(req,res){
        appsModel.find({},function(err,data){
            if(err)
                res.json({error:err});
            else
                res.json(data);
        })
    },
    addApp: function(req,res){
        const newApp = new appsModel();
        newApp.accountID = req.user.accountID;
        newApp.name = req.body.name;
        newApp.description = req.body.description;
        newApp.type = req.body.type;
        newApp.url = req.body.url;
        newApp.serviceId = new mongoose.Types.ObjectId(req.body.serviceId);
        newApp.signInUrl = req.body.signInUrl;
        newApp.iconUrl1 = req.body.iconUrl1;
        newApp.iconUrl2 = req.body.iconUrl1;
        newApp.iconUrl3 = req.body.iconUrl1;
        newApp.iconUrl4 = req.body.iconUrl1;
        newApp.save(function(err,data){
            if(err)
                res.json({error: err});
            else {
                res.json(data);
            }
                
        })
    },
    updateApp: function(req,res){
        appsModel.findOneAndUpdate({_id: req.params.id}, {$set:{
            name: req.body.name,
            description: req.body.description,
            type: req.body.type,
            url: req.body.url,
            signInUrl: req.body.signInUrl,
            iconUrl1: req.body.iconUrl1,
            iconUrl2: req.body.iconUrl1,
            iconUrl3: req.body.iconUrl1,
            iconUrl4: req.body.iconUrl1,
            serviceId: new mongoose.Types.ObjectId(req.body.serviceId)
            }
        },{new: true}, (err,data) => {
            if(err)
                res.json({error: err});
            else
                res.json(data);
        });
    },
    deleteApp: function(req,res){
        appsModel.findByIdAndDelete(req.params.id, function(err,data){
            if(err)
                res.json({error: err});
            else {
                appLicense.findOneAndDelete({appId: req.params.id}).exec();
                appAssignment.deleteMany({appId: req.params.id}).exec();
                res.json(data);
            }
        });
    },
    getLicensesThatEnableApp: function(req,res){
        const appid = req.params.id;
        appLicense.find({appId: appid}).populate('licenseId').select('licenseId').exec(function(err,data){
            if(err)
                res.json({error: err});
            else
                res.json(data);
        });
    },
    getMyAssignments: function(req,res) {
        appAssignment.find({appId: req.params.id}).populate('appId').exec(function(err,myApps){
            if(err)
                res.json(err);
            else
                res.json({AppsAssignments: myApps});
        })
    },
    getAppInformation: function(req,res) {
        const id = new mongoose.Types.ObjectId(req.params.id);
        appInformation.find({appId: id}).populate('document1').populate('document2').populate('document3').exec(function(err,appinfo){
            if(err)
                res.json({error:err});
            else
                res.json({appInfo: appinfo});
        });
    },
    createAppInformation: function(req,res) {
        const appid = new mongoose.Types.ObjectId(req.params.id);
        var appInfo = new appInformation();
        appInfo.appId = appid;
        appInfo.accountID = new mongoose.Types.ObjectId(req.user.accountID);
        appInfo.text1 = req.body.text1;
        appInfo.text2 = req.body.text2;
        appInfo.document1 = new mongoose.Types.ObjectId(req.body.document1);
        appInfo.document2 = new mongoose.Types.ObjectId(req.body.document2);
        appInfo.document3 = new mongoose.Types.ObjectId(req.body.document3);
        appInfo.formUrl = req.body.formurl;
        appInfo.documentationUrl = req.body.docurl;
        appInfo.faqUrl = req.body.faqurl;
        appInfo.save(function(err,data){
            if(err)
                res.json(err);
            else
                res.json({newInfo: data});
        })
    }

};