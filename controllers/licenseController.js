const licenseModel = require('../models/license');
const mongoose = require('mongoose');
const appLicense = require('../models/appLicense');
const appModel = require('../models/apps');
module.exports = {
    getLicense: function(req,res){
        licenseModel.find()
        .populate('appIds')
        .populate('tags')
        .exec(function(err,data){
            if(err)
                throw err;
            else
                res.json(data);
        });
    },
    addLicense: function(req,res){
        const newLicense = new licenseModel();
        newLicense.name = req.body.name;
        newLicense.description = req.body.description;
        newLicense.unit = req.body.unit;
        newLicense.period = req.body.period;
        newLicense.minUsers = req.body.minUsers;
        newLicense.maxUsers = req.body.maxUsers;
        newLicense.price = req.body.price;
        newLicense.serviceId = new mongoose.Types.ObjectId(req.body.serviceId);
        newLicense.renewPeriod = req.body.renewPeriod;
        newLicense.save(function(err,data){
            if(err)
                throw err;
            else
                res.json(data);
        });
    },
    updateLicense: function(req,res){
        licenseModel.findOneAndUpdate({_id: req.params.id}, {$set:{
            name: req.body.name,
            description: req.body.description,
            unit: req.body.unit,
            period: req.body.period,
            minUsers: req.body.minUsers,
            maxUsers: req.body.maxUsers,
            price: req.body.price,
            renewPeriod: req.body.renewPeriod,
            serviceId: new mongoose.Types.ObjectId(req.body.serviceId)
            }
        },{new: true}, (err,data) => {
            if(err)
                throw err;
            else
                res.json(data);
        });
    },
    deleteLicence: function(req,res){
        licenseModel.findByIdAndDelete(req.params.id, function(err,data){
            if(err)
                throw err;
            else
                res.json({success: true});
        });
    },
    addAppsInLicense: function(req,res){
        var licenseid = new mongoose.Types.ObjectId(req.params.licenseid);
        var appid = new mongoose.Types.ObjectId(req.params.appid);
        var licenseid = req.params.licenseid;
        var appid = req.params.appid;
        licenseModel.findOne({_id:licenseid}, function(err,license){
            appModel.findOne({_id: appid}, function(err2, app){
                if(app && license) {
                    applic = new appLicense();
                    applic.appId = new mongoose.Types.ObjectId(appid);
                    applic.licenseId = new mongoose.Types.ObjectId(licenseid);
                    if(license.serviceId.toString() === app.serviceId.toString()) {
                        applic.save();
                        res.json({success: true});
                    }
                    else {
                        res.json({success: true, message: 'app and license dont belong to the same service'})
                    }
                }
                else {
                    res.json({success: false, message: 'invalid ids provided'});
                }
            });
        });
    },
    deleteAppsFromLicense: function(req,res){
        var licenseid = new mongoose.Types.ObjectId(req.params.licenseid);
        var appid = new mongoose.Types.ObjectId(req.params.appid);
        appLicense.findOneAndRemove({licenseId: licenseid, appId: appid}, function(err,data){
            if(err)
                res.json({error: err});
            else
                res.json({result: data});
        });
    },
    addTagsinLicense: function(req,res){
        var licenseid = new mongoose.Types.ObjectId(req.params.licenseid);
        var tagid = new mongoose.Types.ObjectId(req.params.tagid);
        licenseModel.findOne({_id: licenseid},function(err,licenseData) {
            if(licenseData.tags){
                let ids = licenseData.tags;
                ids.push(tagid);
                licenseModel.findOneAndUpdate({_id:licenseid}, {$set: {
                    tags: ids
                }},{new:true}, (err,response) =>{
                    if(err)
                        throw err;
                    res.json({message:'SuccesfullyAdded', result: response});
                });
            }
            else {
                let ids = [];
                ids.push(tagid)
                licenseModel.findOneAndUpdate({_id:licenseid}, {$set: {
                    tags: ids
                }},{new:true}, (err,response) =>{
                    if(err)
                        throw err;
                    res.json({message: 'Succesfully Added', result: response});
                });
            }

        });
    },
    removeTagsFromLicense: function(req,res){
        var licenseid = new mongoose.Types.ObjectId(req.params.licenseid);
        var tagid = new mongoose.Types.ObjectId(req.params.tagid);
        licenseModel.findOne({_id: licenseid},function(err,licenseData) {
            if(licenseData.tags){
                let ids = licenseData.tags;
                ids.remove(tagid);
                licenseModel.findOneAndUpdate({_id:licenseid}, {$set: {
                    tags: ids
                }},{new:true}, (err,response) =>{
                    if(err)
                        throw err;
                    res.json({message:'SuccesfullyAdded', result: response});
                });
            }
            else{
                res.json({data: 'empty'})
            }
        });
    },
    getAppsThatLicenseEnables: function(req,res){
        const licenseId = req.params.id;
        appLicense.find({licenseId: licenseId}).populate('appId').select('appId').exec(function(err,data){
            if(err)
                res.json({error: err});
            else
                res.json(data);
        });
    }
}