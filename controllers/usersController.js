const User = require('../models/user');
const mongoose = require('mongoose');
const googleApis = require('../config/googleapis');
const graphApis = require('../config/microsoft-graph');
const licenseAssignmentModel = require('../models/licenseAssignment');
const appAssignmentModel = require('../models/appAssignment');
const serviceAssignmentModel = require('../models/serviceAssignment');
const licenseModel = require('../models/license');
const appLicense = require('../models/appLicense');
const userGroup = require('../models/userGroup');
const appModel = require('../models/apps');
module.exports = {
    getListOfUsers: function(req,res){
        User.find({}, function(err,result){
            if(err)
                res.json(err);
            else
                res.json({users: result});
        })
    },
    getUsersFromApi: function(req,res){
        if(req.user.isAzure) {
            graphApis.getUsers(req.user).then(data=>{
                if(data.value.length != 0) {
                    var usersFromApi = data.value;
                    userIdsFromApi = [];
                    usersFromApi.forEach(function(user,index){
                        userIdsFromApi.push(user.id.toString())
                        User.findOne({userID: user.id}, function(err2,userData){
                            if(err2) {
                                res.json({error: err2});
                            }
                            else if(userData) {
                                let status = 'Active';
                                if(user.accountEnabled)
                                    status = 'pendingSuspension';
                                else if(userData.deletedDateTime)
                                    status = 'pendingDeletion';
                                User.findOneAndUpdate({userID: user.id}, {$set: {
                                    firstname: user.givenName,
                                    lastname: user.surname,
                                    status: status,
                                    isAzure: true
                                }}).exec();
                                console.log('updated');
                            }
                            else {   
                                let accountRole = 'user';
                                if (user.userPrincipalName.includes('#EXT#')){
                                    accountRole = 'externalUser';
                                }
                                let status = 'Active';
                                let email = user.userPrincipalName.replace('#EXT#','');
                                if(user.accountEnabled == false)
                                    status = 'pendingSuspension';
                                else if(user.deletedDateTime)
                                    status = 'pendingDeletion';
                                let newUser = new User();
                                newUser.accountRole = accountRole;
                                newUser.accountID = req.user.accountID;
                                newUser.userID = user.id;
                                newUser.firstname = user.givenName;
                                newUser.lastname = user.surname;
                                newUser.email = email; 
                                newUser.status = status;
                                newUser.isAzure = true;
                                newUser.save();
                                console.log('added');
                            }
                            console.log(index);
                            console.log(usersFromApi.length);
                            if(index == usersFromApi.length - 1){
                                var i = 0;
                                User.find({accountID: req.user.accountID}, function(err,usersData){
                                    usersData.forEach(function(userData){
                                        if(!userIdsFromApi.includes(userData.userID.toString())) {
                                            licenseAssignmentModel.deleteMany({userId: userData._id}).exec();
                                            appAssignmentModel.deleteMany({userId: userData._id}).exec();
                                            userGroup.deleteMany({userid: userData._id}).exec();
                                            User.findOneAndRemove({_id: userData._id}).exec();
                                            i++;
                                            if(i === usersData.length){
                                                res.json({success: true});
                                            }
                                        } else {
                                            i++;
                                            if(i === usersData.length){
                                                res.json({success: true});
                                            }
                                        }
                                    });
                                });
                            }
                        });
                    });
                } else {
                    var i = 0;
                    User.find({accountID: req.user.userID}, function(err,usersData){
                        usersData.forEach(function(userData){
                            if(!userIdsFromApi.includes(userData.id.toString())) {
                                licenseAssignmentModel.deleteMany({userId: userData._id}).exec();
                                appAssignmentModel.deleteMany({userId: userData._id}).exec();
                                userGroup.deleteMany({userid: userData._id}).exec();
                                i++;
                                if(i === usersData.length){
                                    res.json({success: true});
                                }
                            } else {
                                i++;
                                if(i === usersData.length){
                                    res.json({success: true});
                                }
                            }
                        });
                    });
                }
            });
        }
        else {
            googleApis.getGoogleService(req.user).then(service=>{
                service.users.list({customer: 'my_customer'}, (err3,info) => {
                    if(err3)
                        res.json(err3);
                    else {
                        if(info.data.users) {
                            let userIdsFromApi = [];
                            const apiusers = info.data.users;
                            apiusers.forEach(function(usersFromApi, index){
                                userIdsFromApi.push(usersFromApi.id.toString());
                                User.findOne({userID: usersFromApi.id}, function(err2,userData){
                                    if(err2)
                                        res.json(err2);
                                    else if(userData) {
                                        let status = 'Active';
                                        if(usersFromApi.suspended)
                                            status = 'pendingSuspension';
                                        else if(usersFromApi.archived)
                                            status = 'pendingDeletion';
                                        User.findOneAndUpdate({userID: usersFromApi.id}, {$set: {
                                            firstname: usersFromApi.name.givenName,
                                            lastname: usersFromApi.name.familyName,
                                            status: status,
                                            isAzure: false
                                        }}).exec();
                                        console.log('updated');
                                    } 
                                    else {
                                        let status = 'Active';
                                        if(usersFromApi.suspended)
                                            status = 'pendingSuspension';
                                        else if(usersFromApi.archived)
                                            status = 'pendingDeletion';
                                        let user = new User();
                                        user.accountID = req.user.accountID;
                                        user.userID = usersFromApi.id;
                                        user.firstname = usersFromApi.name.givenName;
                                        user.lastname = usersFromApi.name.familyName;
                                        user.email = usersFromApi.primaryEmail;
                                        user.accountRole = 'user';
                                        user.isAzure = false;
                                        console.log('added');
                                        if(usersFromApi.isAdmin)
                                            user.accountRole = 'accountAdmin';
                                        user.status = status;
                                        user.save();
                                        console.log('added');
                                    }
                                    if(index == apiusers.length -1){
                                        var i = 0;
                                        User.find({accountID: req.user.accountID}, function(err,usersData){
                                            usersData.forEach(function(userData){
                                                if(!userIdsFromApi.includes(userData.userID.toString())) {
                                                    licenseAssignmentModel.deleteMany({userId: userData._id}).exec();
                                                    appAssignmentModel.deleteMany({userId: userData._id}).exec();
                                                    userGroup.deleteMany({userid: userData._id}).exec();
                                                    User.findOneAndRemove({_id: userData._id}).exec();
                                                    i++;
                                                    if(i === usersData.length){
                                                        res.json({success: true});
                                                    }
                                                } else {
                                                    i++;
                                                    if(i === usersData.length){
                                                        res.json({success: true});
                                                    }
                                                }
                                            });
                                        });
                                    }
                                });
                            });
                        }  else {
                            var i = 0;
                            User.find({accountID: req.user.userID}, function(err,usersData){
                                usersData.forEach(function(userData){
                                    if(!userIdsFromApi.includes(userData.id.toString())) {
                                        licenseAssignmentModel.deleteMany({userId: userData._id}).exec();
                                        appAssignmentModel.deleteMany({userId: userData._id}).exec();
                                        userGroup.deleteMany({userid: userData._id}).exec();
                                        i++;
                                        if(i === usersData.length){
                                            res.json({success: true});
                                        }
                                    } else {
                                        i++;
                                        if(i === usersData.length){
                                            res.json({success: true});
                                        }
                                    }
                                });
                            });
                        }
                        
                    }
                });
            });
        }
    },
    addUser: function(req,res){
        if(req.user.isAzure) {
            let user = {
                "accountEnabled": true,
                "givenName": req.body.givenName,
                "passwordProfile": {
                  "password": "Asdasd123",
                  "forceChangePasswordNextSignIn": true
                },
                "surname": req.body.familyName,
                "displayName": req.body.givenName + ' ' + req.body.familyName,
                "mailNickName": req.body.givenName,
                "userPrincipalName": req.body.email
            }
            graphApis.addUser(req.user,user, res);
        } 
        else {
            googleApis.getGoogleService(req.user).then(service=>{
                data = {
                    "name": {
                        "familyName": req.body.familyName,
                        "givenName": req.body.givenName,
                    },
                    "password": "qweasdzxc", //randompassword
                    "primaryEmail": req.body.email
                }
                service.users.insert({requestBody:data}, (err3,result) => {
                    if(err3)
                        res.json(err3.message);
                    else {
                        let user = new User();
                        user.accountID = req.user.accountID;
                        user.userID = result.data.id;
                        user.firstname = result.data.name.givenName;
                        user.lastname = result.data.name.familyName;
                        user.email = result.data.primaryEmail;
                        user.isAdmin = result.data.isAdmin;
                        if(result.data.suspended)
                            user.status = 'pendingSuspension';
                        if(result.data.archived)
                            user.status = 'pendingDeletion';
                        user.status = 'Active';
                        user.accountRole = 'user';
                        user.isDelegatedAdmin = result.data.isDelegatedAdmin;
                        user.save();
                        res.json(user);
                    }
                });
            });
        }
    },
    updateUser: function(req,res){
        if(req.user.isAzure) {
            let user = {
                "givenName": req.body.givenName,
                "surname": req.body.familyName,
                "displayName": req.body.givenName + ' ' + req.body.familyName
            };
            graphApis.updateUser(req.user,user,req.params.id,res);
        }
        else {
            User.findOne({_id: req.params.id}, function(err,userData){
                if(userData) {
                    googleApis.getGoogleService(req.user).then(service=>{
                        data = {
                            "name": {
                                "familyName": req.body.familyName,
                                "givenName": req.body.givenName
                            }
                        }
                        console.log(userData.userID);
                        service.users.patch({userKey: userData.userID,requestBody:data}, (err, d) => {
                            if (err)
                                res.json(err.message);
                            else{
                                User.findOneAndUpdate({userID: userData.userID},{$set: {
                                    lastname: req.body.familyName,
                                    firstname: req.body.givenName,
                                    accountRole: req.body.accountRole
                                }},{new: true}, (err1, doc1) => {
                                    if (err1) {
                                        return res.status(500).json({
                                            message: 'Error when updating User.',
                                            error: err1
                                        });
                                    }
                                    else
                                        res.json({message:doc1});
                                });
                            }
                        });
                    });
                } else {
                    res.json({error: 'user not found'});
                }
            })
            
        } 
    },
    resetPassword: function(req,res){
        if(req.user.isAzure) {
            graphApis.resetPassword(req.user,req.params.id,{
                "passwordProfile":{
                  "forceChangePasswordNextSignIn": true,
                  "password" : "insert=password=here"
                }
            },res);
        } else {
            User.findOne({_id: req.params.id}, function(err,data){
                if(data){
                    googleApis.getGoogleService(req.user).then(service=>{
                        service.users.patch({userKey: data.userID,requestBody:{
                            changePasswordAtNextLogin: true
                        }}, (err5, d) => {
                            if(err5)
                                res.json(err5.message);
                            else
                                res.json(d);
                        });
                    });
                } else {
                    res.json({error: 'user not found'});
                }
            });
        }
    },
    suspendUser: function(req,res){
        if(req.user.isAzure) {
            graphApis.suspendUser(req.user,req.params.id,{accountEnabled: false},res);
        }
        else {
            User.findOne({_id: req.params.id}, function(err,data){
                if(data) {
                    googleApis.getGoogleService(req.user).then(service=>{
                        service.users.patch({userKey: data.userID,requestBody: {
                            suspended: true
                        }}, (err3,data) => {
                            if(err3)
                                res.json(err3.message);
                            else {
                                User.findOneAndUpdate({_id: req.params.id},{$set: {
                                    status: 'pendingSuspension'
                                }},{new: true}, (err1, doc1) => {
                                    if (err1) {
                                        return res.status(500).json({
                                            message: 'Error when updating User.',
                                            error: err1
                                        });
                                    }
                                    else
                                        res.json({message:doc1});
                                });
                            }
                        });
                    });
                } else {
                    res.json({error: 'User Not found'});
                }
                
            });
        }
        
    },
    deleteUser: function(req,res){
        if(req.user.isAzure) {
            graphApis.deleteUser(req.user,req.params.id,res);
        }
        else {
            User.findOne({_id: req.params.id}, function(err,data){
                if(data) {
                    googleApis.getGoogleService(req.user).then(service=>{
                        service.users.patch({userKey: data.userID,requestBody: {
                            archived: true
                        }}, (err3,data) => {
                            if(err3)
                                res.json(err3.message);
                            else {
                                User.findOneAndUpdate({_id: req.params.id},{$set: {
                                    status: 'pendingDeletion'
                                }},{new: true}, (err1, doc1) => {
                                    if (err1) {
                                        return res.status(500).json({
                                            message: 'Error when updating User.',
                                            error: err1
                                        });
                                    }
                                    else
                                        res.json({message:doc1});
                                });
                            }
                        });
                    });
                } else
                    res.json({error: 'User not found'});
            });
        }
    },
    assignAppsToUser: function(req,res){
        var userid = new mongoose.Types.ObjectId(req.params.userid);
        var appid = new mongoose.Types.ObjectId(req.params.appid);
        var appsUsers = [];
        var userApps = [];
        var i = 0;
        appModel.findOne({_id: appid}, function(er1,appCheck){
            User.findOne({_id: userid}, function(er2, userCheck){
                if(appCheck) {
                    if(userCheck) {
                        appAssignmentModel.findOne({userId: userid, appId: appid,groupId: null}, function(err1,appCheck){
                            if(appCheck)
                                res.json({message: 'App Already Assigned'});
                            else {
                                appAssignmentModel.find({userId: userid,groupId: null}).select('appId').exec(function(err1,apps){
                                    licenseAssignmentModel.find({userId: userid})
                                    .populate('licenseId')
                                    .select('licenseId')
                                    .exec(function(err,data){
                                        if(err)
                                            res.json({error:err});
                                        else if(data.length != 0){
                                            var licenses = data;
                                            licenses.forEach(function(license) {
                                                appLicense.find({licenseId: license.licenseId}).populate('appId').exec(function(err2,app){
                                                    if(err2)
                                                        throw err2;
                                                    else if(app) {
                                                            app.forEach(function(a){
                                                                if(apps.length != 0) {  
                                                                    userApps = apps.map(function(item) {
                                                                        return item.appId._id.toString();
                                                                    });
                                                                    if(!userApps.includes(a.appId._id.toString()))
                                                                        appsUsers.push(a.appId._id.toString());
                                                                } else {
                                                                    appsUsers.push(a.appId._id.toString());
                                                                }
                                                            });
                                                    }
                                                    i++;
                                                    if(i === licenses.length) {
                                                        console.log(appsUsers);
                                                        if(appsUsers.includes(appid.toString())) {
                                                            appAssignmentModel.find({appId: appid, userId: userid}, function(err,appAssigned){
                                                                var appAssign = new appAssignmentModel();
                                                                appAssign.userId = userid;
                                                                appAssign.appId = appid;
                                                                if(appAssigned.length != 0)
                                                                    appAssign.status = 'inactive';
                                                                else
                                                                    appAssign.status = 'active';
                                                                appAssign.save();
                                                                res.json({suceess: true});
                                                            });
                                                        }
                                                        else {
                                                            res.json({message: "App cannot be assigned since the required license not found on the user"});
                                                        }
                                                    }
                                                });
                                            });
                                        }
                                        else
                                            res.json({error: 'App cant be assigned since no license found for a user'});
                                    });
                                });
                            }
                            
                        });
                        
                    } else {
                        res.json({error: 'User not Found'});
                    }
                } else
                    res.json({error: 'App not Found'});
            });
        });
        
    },
    deleteAppsFromUser: function(req,res) {
        var userid = req.params.userid;
        var appid = new mongoose.Types.ObjectId(req.params.appid);
        appModel.findOne({_id: appid}, function(er1,appCheck){
            User.findOne({_id: userid}, function(er2, userCheck){
                if(appCheck) {
                    if(userCheck) {
                        appAssignmentModel.findOne({userId: userCheck._id, appId: appid,groupId: null}, function(err1,userApp){
                            if(userApp) {
                                appAssignmentModel.deleteOne({userId: userid, appId: appid, groupId: null}).exec();
                                appAssignmentModel.find({userId: userid, appId: appid}, function(err,appsFound){
                                    var filtered = appsFound.filter(function(el){ return el._id.toString() != userApp._id.toString() });
                                    console.log(filtered);
                                    let appStatus = 'No app was found to be updated';
                                    if(filtered.length != 0) {
                                        if(userApp.status === 'active') {
                                            appAssignmentModel.findOneAndUpdate({_id: filtered[0]._id}, {$set: {status: 'active'}}).exec();
                                            appStatus = 'App was updated';
                                        } else {
                                            appStatus = 'The removed app was already inactive';
                                        }
                                    }
                                    res.json({message: appStatus});
                                    
                                });
                            } else {
                                res.json({message: 'app Not found for a user'});
                            }
                        });
                    } else {
                        res.json({error: 'User not Found'});
                    }
                } else
                    res.json({error: 'App not Found'});
            });
        });
    },
    assignLicensesToUser: function(req,res){
        var userid = req.params.userid;
        var licenseid = new mongoose.Types.ObjectId(req.params.licenseid);
        licenseModel.findOne({_id: licenseid}, function(er1,licenseToAdd){
            User.findOne({_id: userid}, function(er2, userData){
                if(licenseToAdd) {
                    if(userData) {
                        licenseAssignmentModel.findOne({userId: userid, licenseId: licenseid, groupId: null}, function(err,data){
                            if(data) {
                                res.json({error: 'license Already Assigned'});
                            } else {
                                var serviceStatus = false;
                                var licenseStatus = '';
                                var lictoUpdate = null;
                                var newLic = new licenseAssignmentModel();
                                var userLicenseIds = [];
                                var canAdd = true;
                                var licAssignedSameSer = [];
                                licenseAssignmentModel.find({userId: userid, status: 'active'}).populate('licenseId').exec(function(err,userLicenses){
                                    licenseModel.find({serviceId: licenseToAdd.serviceId}, function(err1,correspondingLicenses){
                                        newLic.userId = userData._id;
                                        newLic.licenseId = licenseToAdd._id;
                                        userLicenses.forEach(function(d){
                                            userLicenseIds.push(d.licenseId._id.toString());
                                        });
                                        correspondingLicenses.forEach(function(a){
                                            if(userLicenseIds.includes(a._id.toString()))
                                                licAssignedSameSer.push(a);
                                        });
                                        if(licAssignedSameSer.length == 1) {
                                            if(licAssignedSameSer[0].price < licenseToAdd.price) {
                                                lictoUpdate = licAssignedSameSer[0]._id;
                                                licenseStatus = 'Newer License Higher than the old, Old License set to Inactive, licenseId = ' + lictoUpdate;
                                                licenseAssignmentModel.findOneAndUpdate({userId: userData._id, licenseId: lictoUpdate}, {$set:{status:'inactive'}}).exec();
                                            } else {
                                                canAdd = false;
                                            }
                                        } else {
                                            licenseStatus = 'No license found for the service, Assigning a new license';
                                        }
                                        if(canAdd) {
                                            newLic.status = 'active';
                                            newLic.save();
                                        } else {
                                            licenseStatus = 'Newer License Lower than the old, license set to inactive';
                                            newLic.status = 'inactive';
                                            newLic.save();
                                        }
                                        serviceAssignmentModel.findOne({serviceId: licenseToAdd.serviceId, accountID: userData.accountID}, function(err,service){
                                            if(service)
                                                serviceStatus = false;
                                            else {
                                                newSer = new serviceAssignmentModel();
                                                newSer.serviceId = licenseToAdd.serviceId;
                                                newSer.accountID = userData.accountID;
                                                newSer.status = 'active';
                                                newSer.save();
                                                serviceStatus = true;
                                            }
                                            res.json({licenseAssigned: canAdd, licenseStatus: licenseStatus,newServiceAssigned: serviceStatus});
                                        });
                                    });
                                });
                            }
                        });
                    } else {
                        res.json({error: 'User not Found'});
                    }
                } else
                    res.json({error: 'License not Found'});
            });
        });
    },
    deleteLicenseFromUser: function(req,res){
        var userid = new mongoose.Types.ObjectId(req.params.userid);
        var licenseid = new mongoose.Types.ObjectId(req.params.licenseid);
        licenseModel.findOne({_id: licenseid}, function(er1,licenseData){
            User.findOne({_id: userid}, function(er2, userData){
                if(licenseData) {
                    if(userData) {
                        licenseAssignmentModel.findOne({licenseId: licenseData._id, userId: userData._id,groupId: null}, function(er,licenseCheck){
                            if(licenseCheck) {
                                licenseAssignmentModel.findOneAndRemove({licenseId: licenseData._id, userId: userData._id,groupId: null}).exec();
                                appAssignmentModel.find({userId: userid, groupId: null}).populate('appId').exec(function(err,apps){
                                    licenseAssignmentModel.find({userId: userid}).populate('licenseId').exec(function(err,data){
                                        if(licenseCheck.status !== 'active') {
                                            res.json({licenseStatus: 'License was inactive so got removed.', appStatus: 'No App was deleted'});
                                        }
                                        else {
                                            myAppIds = [];
                                            apps.forEach(function(itm){
                                                myAppIds.push(itm.appId._id.toString());
                                            });
                                            myLicenses = [];
                                            data.forEach(function(itm){
                                                myLicenses.push(itm.licenseId._id.toString());
                                            });
                                            licenseReAssign = [];
                                            data.forEach(function(a){
                                                if(a.licenseId.serviceId.toString() === licenseData.serviceId.toString())
                                                    licenseReAssign.push(a);
                                            });
                                            console.log(licenseReAssign.length);
                                            var licenseStatus = '';
                                            if(licenseReAssign.length == 0) {
                                                licenseStatus= 'No Corresponding License Found that can be set to active';
                                            }
                                            else if(licenseReAssign.length == 1) {
                                                if(licenseReAssign[0].groupId)
                                                    licenseStatus = 'License ' + licenseReAssign[0].licenseId._id +' belongs to a group and reAssigned';
                                                else{
                                                    licenseStatus = 'License Removed & ' + licenseReAssign[0].licenseId._id +' was reAssigned';
                                                }
                                                console.log(licenseReAssign[0]);
                                                licenseAssignmentModel.findOneAndUpdate({_id: licenseReAssign[0]._id}, {$set:{status:'active'}}).exec();
                                            }
                                            else {
                                                toUpdate = licenseReAssign[0];
                                                licenseReAssign.forEach(function(a){
                                                    if(a.licenseId.price > toUpdate.licenseId.price) {
                                                        if(a.groupId) {
                                                            licenseStatus = 'License ' + a.licenseId._id +' belongs to a group and reAssigned';
                                                        }
                                                        else {
                                                            licenseStatus = 'License Removed & ' + a.licenseId._id +' was reAssigned';
                                                        }
                                                        toUpdate = a;
                                                    } else {
                                                        licenseStatus = 'License Removed & ' + toUpdate.licenseId._id +' was reAssigned';
                                                    }
                                                });
                                                licenseAssignmentModel.findOneAndUpdate({_id: toUpdate._id}, {$set:{status:'active'}}).exec();
                                                // data.forEach(function(a){
                                                //     if(a.licenseId._id.toString() === toUpdate._id.toString()) {
                                                //         if(a.status !=='active'){
                                                //             if(a.groupId) {
                                                //                 licenseStatus = 'License ' + a.licenseId._id +' belongs to a group and reAssigned';
                                                //             } else {
                                                //                 licenseStatus = 'License Removed & ' + a.licenseId._id +' was reAssigned';
                                                //             }
                                                //             licenseAssignmentModel.findOneAndUpdate({_id: a._id}, {$set:{status:'active'}}).exec();
                                                //         }
                                                //         else {
                                                //             licenseStatus = 'License Removed. Higher was present';
                                                //         }
                                                //     }
                                                // });
                                            }
                                            console.log(licenseStatus);
                                            appLicense.find({licenseId: {$in: myLicenses}}, function(err,myapps){
                                                appLicense.find({appId: {$in: myAppIds}}, function(err,myappsLic){
                                                    ////
                                                    mynewApps = [];
                                                    myapps.forEach(function(a){
                                                        mynewApps.push(a.appId.toString());
                                                    });
                                                    apptoDelete = [];
                                                    myappsLic.forEach(function(al){
                                                        if(!myLicenses.includes(al.licenseId.toString())){
                                                                apptoDelete.push(al);
                                                        }
                                                    });
                                                    deleteApp = [];
                                                    apptoDelete.forEach(function(atd){
                                                        if(!mynewApps.includes(atd.appId.toString()))
                                                            deleteApp.push(atd.appId);
                                                    });
                                                    var i = 0;
                                                    appIdstoDelete = [];
                                                    deleteApp.forEach(function(a){
                                                        let unique = true;
                                                        appIdstoDelete.forEach(function(d){
                                                            if(d.toString() === a.toString())
                                                                unique = false;
                                                        });
                                                        if(unique) appIdstoDelete.push(a);
                                                    });
                                                    appStatus = [];
                                                    if(appIdstoDelete.length == 0) {
                                                        res.json({licenseStatus: licenseStatus, appStatus: 'No App Was Found to Be Removed'});
                                                    } else {
                                                        appIdstoDelete.forEach(function(appDel){
                                                            appAssignmentModel.findOne({userId: userid, appId: appDel, groupId: null}, function(err,appCheck){
                                                                appAssignmentModel.find({userId: userid, appId: appDel}, function(err3, appToUpdateCheck){
                                                                    console.log(appCheck);
                                                                    if(appCheck) {
                                                                        appStatus.push('App Removed of ID: ' + appDel);
                                                                        appAssignmentModel.findOneAndRemove({userId: userid, appId: appDel, groupId: null}).exec();
                                                                        if(appCheck.status === 'active') {
                                                                            let filtered = appToUpdateCheck.filter(function(el) { return el._id != appCheck._id; });
                                                                            if(filtered.length != 0) {
                                                                                appAssignmentModel.findOneAndUpdate({_id: filtered[0]._id}, {$set: {status: 'active'}}).exec();
                                                                            }
                                                                        }
                                                                    } else {
                                                                        appStatus.push('Didnt Delete App of id '+ appDel + ' Either Group Assigned, or Active License of that service Remains')
                                                                    }
                                                                    i++;
                                                                    if(i == appIdstoDelete.length)
                                                                        res.json({licenseStatus: licenseStatus, appStatus: appStatus});
                                                                });
                                                            });
                                                        });
                                                    }
                                                    ////
                                                });
                                            });
                                        }
                                    }); 
                                });
                            } else {
                                res.json({error: 'License Not Found for a user or is group Assigned'});
                            }
                            
                        });
                    } else {
                        res.json({error: 'User not Found'});
                    }
                } else
                    res.json({error: 'License not Found'});
            });
        });
    },
    getUserGroups: function(req,res) {
        var userId = new mongoose.Types.ObjectId(req.params.userid);
        User.findOne({_id: userId}, function(err,data){
            if(data) {
                userGroup.find({userid: data._id})
                .populate('group')
                .exec(function(err,response){
                    if(err)
                        throw err;
                    else
                        res.json(response);
                });
            } else {
                res.json({message: 'User Not Found'});
            }
        });
    },
    appsThatCanBeAssigned: function(req,res) {
        const userid = new mongoose.Types.ObjectId(req.params.userid);
        var appsUsers = [];
        var groupApps = [];
        var userApps = [];
        var i = 0;
        User.findOne({_id: userid}, function(er, userData){
            if(userData) {
                appAssignmentModel.find({userId: userid}).select('appId').exec(function(err,apps){
                    licenseAssignmentModel.find({userId: userid, status: 'active'})
                    .populate('licenseId')
                    .select('licenseId')
                    .select('groupId')
                    .exec(function(err,data){
                        console.log(data);
                        if(err)
                            res.json({error:err});
                        else if(data.length != 0){
                            var licenses = data;
                            console.log(licenses);
                            licenses.forEach(function(license) {
                                appLicense.find({licenseId: license.licenseId}).populate('appId').exec(function(err2,app){
                                    console.log(license);
                                    if(license.groupId) {
                                        if(err2)
                                            throw err2;
                                        else if(app) {
                                            app.forEach(function(a){
                                                if(apps.length != 0) {  
                                                    userApps = apps.map(function(item) {
                                                        return item.appId._id.toString();
                                                    });
                                                    if(!userApps.includes(a.appId._id.toString()))
                                                        groupApps.push(a.appId);
                                                } else {
                                                    groupApps.push(a.appId);
                                                }
                                            });
                                        }
                                        i++;
                                        if(i === licenses.length) {
                                            res.json({CanBeAssignedFromGroup: groupApps, canBeAssignedFromUser: appsUsers});
                                        }
                                        } else {
                                            if(err2)
                                                throw err2;
                                            else if(app) {
                                                app.forEach(function(a){
                                                    if(apps.length != 0) {  
                                                        userApps = apps.map(function(item) {
                                                            return item.appId._id.toString();
                                                        });
                                                        if(!userApps.includes(a.appId._id.toString()))
                                                            appsUsers.push(a.appId);
                                                    } else {
                                                        appsUsers.push(a.appId);
                                                    }
                                                });
                                            }
                                            i++;
                                            if(i === licenses.length) {
                                                res.json({CanBeAssignedFromGroup: groupApps, canBeAssignedFromUser: appsUsers});
                                            }
                                        }
                                });
                            });
                        }
                        else {
                            res.json({CanBeAssignedFromGroup: null, canBeAssignedFromUser: null});
                        }
                    });
                });
            } else 
                res.json({error: 'User not Found'});
        });      
    },
    myAssignedApps: function(req,res) {
        var id = req.params.id;
        User.findOne({_id: id}, function(er, userData){
            if(userData) {
                appAssignmentModel.find({userId: id}).populate('appId').select('appId').select('groupId').select('status').exec(function(err,result){
                    if(err)
                        res.json(err);
                    else{
                        let apps = [];
                        let groupApps = [];
                        result.forEach(function(ap){
                            if(ap.groupId) 
                                groupApps.push(ap);
                            else
                                apps.push(ap)
                        });
                        res.json({myApps: apps,appsFromGroup: groupApps });
                    }     
                });
            } else 
            res.json({error: 'User not Found'});
        });
    },
    myAssignedLicenses: function(req,res) {
        var id = req.params.id;
        User.findOne({_id: id}, function(er, userData){
            if(userData) {
                licenseAssignmentModel.find({userId: id}).populate('licenseId').select('licenseId').select('groupId').select('status').exec(function(err,result){
                    let groupAssigned = [];
                    let userAssigned = [];
                    result.forEach(function(data){
                        if(data.groupId) {
                            groupAssigned.push(data);
                        }
                        else {
                            userAssigned.push(data);
                        }
                    });
                    res.json({userAssigned: userAssigned, groupAssigned: groupAssigned});
                });
            } else 
            res.json({error: 'User not Found'});
        });
    }
};