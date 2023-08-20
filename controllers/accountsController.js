const accountsModel = require('../models/accounts');
const graphApi = require('../config/microsoft-graph');
const usersModel = require('../models/user');
const licenseAssignment = require('../models/licenseAssignment');
const appAssignment = require('../models/appAssignment');
const serviceAssignment = require('../models/serviceAssignment');
const googleApis = require('../config/googleapis');
const groupModel = require('../models/groups');
const licenseModel = require('../models/license');
const mongoose = require('mongoose');
module.exports = {
    getAccounts: function(req,res) {
        accountsModel.find({})
            .populate('connectAccount')
            .exec(function(err,acc){
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting Account.',
                    error: err
                });
            }
            if (!acc) {
                return res.status(404).json({
                    message: 'No such Account'
                });
            }
            return res.json(acc);
        });
    },
    saveAccountsInfo: function(req,res) {
        let email = req.user.email;
        let domain = email.substring(email.lastIndexOf("@") +1);
        const acc = new accountsModel({
            name: req.body.name,
            description: req.body.description,
            vatNumber: req.body.vatNumber,
            address1: req.body.address1,
            address2: req.body.address2,
            city: req.body.city,
            zip: req.body.zip,
            country: req.body.country,
            domain: domain
        });
        console.log(acc);
        acc.save(function(err,account){
            if(err) {
                return res.status(500).json({
                    message: 'Error when creating Account',
                    error: err
                });
            }
            else{
                usersModel.findOneAndUpdate({_id:req.user._id}, {$set: {accountID: account._id, accountRole: 'accountsAdmin'}}, (err1,data) => {
                    if(err1)
                        throw err1;
                    else
                        res.redirect('/completeregisteration');
                })
            }
        });
    },
    suspendAccount: function(req,res){
        const id = new mongoose.Types.ObjectId(req.params.accountid);
        usersModel.find({accountID: id}, function(err,users) {
            if(users) {
                if(users[0].isAzure) {
                    graphApi.suspendAccount(req.user,users,res);
                }
                else {
                    var i = 0;
                    googleApis.getGoogleService(req.user).then(service=> {
                        users.forEach(function(user){
                            if(user.userID !== '103741283322738150726' && user.userID !='115498192805678523289'){
                                service.users.patch({userKey: user.userID,requestBody:{suspended: true}}, (err5, d) => {
                                    if(err5)
                                        throw err5;
                                    else {
                                        i++;
                                        if(i === users.length){
                                            usersModel.update({accountID:id}, { status: 'pendingSuspension' }, { multi: true }, function(err6, rer) {
                                                if (err6) 
                                                    throw err;
                                                
                                                else
                                                    res.json(rer);
                                            });
                                        }
                                    }
                                });
                            }
                        });           
                    });
                }
            } else {
                res.json({error: 'Invalid AccountId given'});
            } 
        });
        
    },
    getListofUsers: function(req,res){
        const id = req.params.accountid;
        usersModel.find({accountID:id}, function(err,users){
            if(err)
                res.json({error:err});
            else
                res.json({users:users});
        });
    },
    //////////this is left
    deleteAccount: function(req,res){
        const id = new mongoose.Types.ObjectId(req.params.accountid);
        usersModel.find({accountID: id}, function(err,users) {
            if(users) {
                if(users[0].isAzure) {
                    graphApi.deleteAccount(req.user,users,res);
                }
                else {
                    var i = 0;
                    googleApis.getGoogleService(req.user).then(service=> {
                        users.forEach(function(user){
                            if(user.userID !== '103741283322738150726' && user.userID !='115498192805678523289'){
                                service.users.patch({userKey: user.userID,requestBody:{archived: true}}, (err5, d) => {
                                    if(err5)
                                        throw err5;
                                    else {
                                        i++;
                                        if(i == users.length) {
                                            usersModel.update({accountID:req.user.accountID}, { status: 'pendingDeletion' }, { multi: true }, function(err6, rer) {
                                                if (err6) 
                                                    throw err;
                                                else
                                                    res.json(rer);
                                            });
                                        }
                                    }
                                });
                            }
                            else i++;
                        });
                    });
                }
            } else {
                res.json({error: 'No users for account found, probably the accountId is invalid'});
            }
        });
        
    },
    getListOfLicenses: function(req,res){
        const id = req.params.accountid;
        var licenses = [];
        var i = 0;
        usersModel.find({accountID:id}, function(err,users){
            if(err)
                res.json({error:err});
            else {
                if(users) {
                    users.forEach(function(user){
                        licenseAssignment.find({userId: user._id}).populate('licenseId').exec(function(eer2,data){
                            if(data.length != 0) {
                                data.forEach(function(lic,index) {
                                    licenses.push(lic.licenseId);
                                    if(data.length - 1 === index) {
                                        console.log(i);
                                        i++;
                                    }
                                });
                            }
                            else {
                                i++;
                            } 
                            if(i === users.length) {
                                res.json(licenses);
                            }
                        });
                    });
                } else {
                    res.json({error: 'No users for account found, probably the accountId is invalid'});
                }
            }
        });
    },
    getListOfApps: function(req,res) {
        const id = req.params.accountid;
        var apps = [];
        var i = 0;
        usersModel.find({accountID:id}, function(err,users){
            if(err)
                res.json({error:err});
            else {
                if(users) {
                    users.forEach(function(user){
                        appAssignment.find({userId: user._id}).populate('appId').exec(function(eer2,data){
                            if(data.length != 0) {
                                data.forEach(function(lic,index) {
                                    apps.push(lic.appId);
                                    if(data.length - 1 === index) {
                                        console.log(i);
                                        i++;
                                    }
                                });
                            }
                            else {
                                i++;
                            } 
                            if(i === users.length) {
                                res.json(apps);
                            }
                        });
                    });
                } else {
                    res.json({message: 'Invalid AccountId given'});
                }
            }
        });
    },
    getMyServices: function(req,res){
        serviceAssignment.find({accountID:req.params.accountid}, function(err,myservices){
            if(err)
                throw err;
            else
                res.json({services: myservices});
        })
    },
    getMyLicensesCount: function(req,res) {
        var accountId = new mongoose.Types.ObjectId(req.params.accountid);
        var totalLicenses = [];
        var i = 0;
        var myLicensesCount = [];
        serviceAssignment.find({accountID: accountId}).populate('serviceId').exec(function(err,services){
            if(services.length != 0) {
                usersModel.find({accountID: accountId}, function(err,users){
                    groupModel.find({accountID: accountId}, function(err,groups){
                        users.forEach(function(userData){
                            licenseAssignment.find({userId: userData._id,groupId: null}).populate('licenseId').exec(function(er,userLicenses){
                                if(userLicenses.length != 0) {
                                    userLicenses.forEach(function(lic){
                                        totalLicenses.push(lic);
                                    });
                                }
                                i++;
                                if(i == users.length){
                                    i = 0;
                                    groups.forEach(function(groupData){
                                        licenseAssignment.find({groupId: groupData._id, userId: null}).populate('licenseId').exec(function(err,groupLicenses){
                                            if(groupLicenses.length != 0 ){
                                                groupLicenses.forEach(function(lic){
                                                    totalLicenses.push(lic);
                                                });
                                            }
                                            i++;
                                            if(i === groups.length){
                                                myUniqueLicenses = [];
                                                totalLicenses.forEach(function(mylic){
                                                    let unique = true;
                                                    myUniqueLicenses.forEach(function(lic2){
                                                        if(mylic._id.toString() === lic2._id.toString()) unique = false;
                                                    });
                                                    if(unique) myUniqueLicenses.push(mylic);
                                                });
                                                i = 0;
                                                let j = 0;
                                                services.forEach(function(myservices){
                                                    let x = 0;
                                                    let serviceCount = myservices.serviceId;
                                                    myUniqueLicenses.forEach(function(mylicenses){
                                                        if(mylicenses.licenseId.serviceId.toString() === myservices.serviceId._id.toString()){
                                                            x++;
                                                        }
                                                        j++;
                                                        if(j === myUniqueLicenses.length){
                                                            myLicensesCount.push({service: serviceCount, count: x});  
                                                            i++;
                                                            j = 0;
                                                            x = 0;
                                                        }
                                                        if(i===services.length) {
                                                            res.json({totalLicensesCount: myLicensesCount})
                                                        }
                                                    });
                                                });
                                            }
                                        });
                                    });
                                }
                            });
                        });
                    });
                });
            } else {
                res.json({error: 'No service found for account'});
            }
            
        });
    }
};