const groupsModel = require('../models/groups');
const mongoose = require('mongoose');
const googleApis = require('../config/googleapis');
const graphApi = require('../config/microsoft-graph');
const userGroups = require('../models/userGroup');
const licenseAssignmentModel = require('../models/licenseAssignment');
const licenseModel = require('../models/license');
const User = require('../models/user');
const appModel = require('../models/apps');
const serviceAssignmentModel = require('../models/serviceAssignment');
const appAssignmentModel = require('../models/appAssignment');
const appLicense = require('../models/appLicense');
module.exports = {
    getListOfGroups: function(req,res){
        groupsModel.find({}, function(err,result){
            if (err) res,json({error: err});
            res.json(result);
        });
    },
    getGroupsFromApi: function(req,res){
        if(req.user.isAzure) {
            graphApi.getGroups(req.user).then(data => {
                if(data.value.length != 0) {
                    var groups = data.value;
                    groupfromApiIds = [];
                        var xy = 0;
                        groups.forEach(function(group,index){
                            groupfromApiIds.push(group.id.toString());
                            groupsModel.findOne({id: group.id}, function(err3,groupData){
                                if(groupData) {
                                    groupsModel.findOneAndUpdate({id: group.id}, {$set: {
                                        name: group.displayName,
                                        description: group.description
                                    }}).exec();
                                    xy++;
                                }
                                else {
                                    let newGroup = new groupsModel();
                                    newGroup.accountID = new mongoose.Types.ObjectId(req.user.accountID);
                                    newGroup.id = group.id;
                                    newGroup.description = group.description;
                                    newGroup.name = group.displayName;
                                    newGroup.save();
                                    console.log('added');
                                    xy++;
                                }
                                if(xy === groups.length) {
                                    var i = 0;
                                    groupsModel.find({accountID: req.user.accountID}, function(err,groupsFromModel){
                                        if(groupsFromModel.length == 0) {
                                            res.json({success:true})
                                        } else {
                                            groupsFromModel.forEach(function(grModel){
                                                if(!groupfromApiIds.includes(grModel.id.toString())) {
                                                    licenseAssignmentModel.find({groupId: grModel._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err,groupActiveLicenses){
                                                        licenseAssignmentModel.deleteMany({groupId: grModel._id}).exec();
                                                        appAssignmentModel.deleteMany({groupId: grModel._id,userId: null}).exec();
                                                        groupsModel.findOneAndRemove({_id: grModel._id}).exec();
                                                        userGroups.find({group: grModel._id}, function(err,userFromGroups){
                                                            userGroups.deleteMany({group: grModel._id}).exec();
                                                            if(userFromGroups.length != 0) {
                                                                userFromGroups.forEach(function(user) {
                                                                    appAssignmentModel.find({userId: user.userid, groupId: grModel._id, status: 'active'}).exec(function(err,groupApps){
                                                                        appAssignmentModel.deleteMany({groupId: grModel._id, userId: user.userid}, function(appErr,deletedApps) {
                                                                            licenseAssignmentModel.find({userId: user.userid}).populate('licenseId').exec(function(err,userLicenses){
                                                                                appAssignmentModel.find({userId: user.userid}).populate('appId').exec(function(err,userApps){
                                                                                    let y = 0;
                                                                                    let userAppIds = [];
                                                                                    userApps.forEach(function(usApp){
                                                                                        userAppIds.push(usApp.appId._id.toString());
                                                                                    });
                                                                                    groupApps.forEach(function(grApp){
                                                                                        if(userAppIds.includes(grApp.appId.toString()))
                                                                                            appAssignmentModel.findOneAndUpdate({userId: user.userid, appId: grApp.appId}, {$set: {status : 'active'}}).exec();
                                                                                    });
                                                                                    if(groupActiveLicenses.length != 0) {
                                                                                        groupActiveLicenses.forEach(function(grLic) {
                                                                                            let sameSerUserLic = [];
                                                                                            userLicenses.forEach(function(usLic){
                                                                                                if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                                                                                    sameSerUserLic.push(usLic);
                                                                                            });
                                                                                            if(sameSerUserLic.length === 0 )
                                                                                                console.log('Do Nothing');
                                                                                            else if(sameSerUserLic.length === 1) {
                                                                                                if(sameSerUserLic[0].status !== 'active')
                                                                                                    licenseAssignmentModel.findOneAndUpdate({_id: sameSerUserLic[0]._id}, {$set: {status: 'active'}}).exec()
                                                                                            }
                                                                                            else {
                                                                                                let check = true;
                                                                                                sameSerUserLic.forEach(function(ssLic) {
                                                                                                    if(ssLic.status ==='active')
                                                                                                        check = false;
                                                                                                });
                                                                                                if(check) {
                                                                                                    let updateLic = sameSerUserLic[0];
                                                                                                    sameSerUserLic.shift();
                                                                                                    sameSerUserLic.forEach(function(ssLic) {
                                                                                                        if(ssLic.licenseId.price > updateLic.licenseId.price){
                                                                                                            updateLic = ssLic;
                                                                                                        }
                                                                                                    });
                                                                                                    licenseAssignmentModel.findOneAndUpdate({_id: updateLic._id}, {$set: {status:'active'}}).exec();
                                                                                                }
                                                                                            }
                                                                                            y++;
                                                                                            if(y === groupActiveLicenses.length) {
                                                                                                y = 0;
                                                                                                let userlicenseIds = [];
                                                                                                let userAppIds = [];
                                                                                                userLicenses.forEach(function(usLic){
                                                                                                    userlicenseIds.push(usLic.licenseId._id);
                                                                                                });
                                                                                                userApps.forEach(function(usApp){
                                                                                                    userAppIds.push(usApp.appId._id);
                                                                                                });
                                                                                                appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                                                    appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                                                        let mynewApps = [];
                                                                                                        myapps.forEach(function(a){
                                                                                                            mynewApps.push(a.appId.toString());
                                                                                                        });
                                                                                                        let apptoDelete = [];
                                                                                                        myappsLic.forEach(function(al){
                                                                                                            if(!userlicenseIds.includes(al.licenseId.toString())){
                                                                                                                apptoDelete.push(al);
                                                                                                            }
                                                                                                        });
                                                                                                        let deleteApp = [];
                                                                                                        apptoDelete.forEach(function(atd){
                                                                                                            if(!mynewApps.includes(atd.appId.toString()))
                                                                                                                deleteApp.push(atd.appId);
                                                                                                        });
                                                                                                        appIdstoDelete = [];
                                                                                                        deleteApp.forEach(function(a){
                                                                                                            let unique = true;
                                                                                                            appIdstoDelete.forEach(function(d){
                                                                                                                if(d.toString() === a.toString())
                                                                                                                    unique = false;
                                                                                                            });
                                                                                                            if(unique) appIdstoDelete.push(a);
                                                                                                        });
                                                                                                        if(appIdstoDelete.length === 0) {
                                                                                                            y++;
                                                                                                            if(y === userFromGroups.length) {
                                                                                                                i++;
                                                                                                            }
                                                                                                            if(i === groupsFromModel.length) {
                                                                                                                res.json({success:true});
                                                                                                            }
                                                                                                        }
                                                                                                        else {
                                                                                                            let x = 0;
                                                                                                            appIdstoDelete.forEach(function(appDel){
                                                                                                                appAssignmentModel.findOne({userId: user.userid, appId: appDel,groupId: null}, function(err,appCheck){
                                                                                                                    if(appCheck) {
                                                                                                                        appAssignmentModel.findOneAndRemove({userId: user.userid, appId: appDel, groupId: null}).exec();
                                                                                                                    }
                                                                                                                    x++;
                                                                                                                    if(x === appIdstoDelete.length) {
                                                                                                                        y++;
                                                                                                                    }
                                                                                                                    if(y === userFromGroups.length) {
                                                                                                                        i++;
                                                                                                                    }
                                                                                                                    if(i === groupsFromModel.length) {
                                                                                                                        res.json({success:true});
                                                                                                                    }
                                                                                                                });
                                                                                                            });
                                                                                                        }
                                                                                                    });
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    } else {
                                                                                        y++;
                                                                                        if(y === userFromGroups.length) {
                                                                                            i++;
                                                                                        }
                                                                                        if(i === groupsFromModel.length)
                                                                                            res.json({success: true});
                                                                                    }
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            } else {
                                                                i++;
                                                                if(i === groupsFromModel.length)
                                                                    res.json({message:'succesfull'});
                                                            }
                                                            
                                                        });
                                                    });
                                                } else {
                                                    i++;
                                                    console.log(i);
                                                    console.log(groupsFromModel.length);
                                                    if(i === groupsFromModel.length)
                                                        res.json({message:'succesfull'});
                                                }
                                            });
                                        }
                                    });
                                } 
                            });
                        });
                } else {
                    groupsModel.find({accountID: req.user.accountID}, function(err,groupsFromModel){
                        if(groupsFromModel.length == 0)
                            res.json({message: 'no groups found for an account'});
                        else {
                            var i = 0;
                            groupsFromModel.forEach(function(grModel){
                                console.log(grModel.id);
                                licenseAssignmentModel.find({groupId: grModel._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err,groupActiveLicenses){
                                    licenseAssignmentModel.deleteMany({groupId: grModel._id}).exec();
                                    appAssignmentModel.deleteMany({groupId: grModel._id,userId: null}).exec();
                                    groupsModel.findOneAndRemove({_id: grModel._id}).exec();
                                    userGroups.find({group: grModel._id}, function(err,userFromGroups){
                                        userGroups.deleteMany({group: grModel._id}).exec();
                                        if(userFromGroups.length != 0) {
                                            userFromGroups.forEach(function(user) {
                                                appAssignmentModel.find({userId: user.userid, groupId: grModel._id, status: 'active'}, function(err,groupApps){
                                                    appAssignmentModel.deleteMany({groupId: grModel._id, userId: user.userid}, function(appErr, deletedApps){
                                                        licenseAssignmentModel.find({userId: user.userid}).populate('licenseId').exec(function(err,userLicenses){
                                                            appAssignmentModel.find({userId: user.userid}).populate('appId').exec(function(err,userApps){
                                                                let y = 0;
                                                                let userAppIds = [];
                                                                userApps.forEach(function(usApp){
                                                                    userAppIds.push(usApp.appId._id.toString());
                                                                });
                                                                groupApps.forEach(function(grApp){
                                                                    if(userAppIds.includes(grApp.appId.toString()))
                                                                        appAssignmentModel.findOneAndUpdate({userId: user.userid, appId: grApp.appId}, {$set: {status : 'active'}}).exec();
                                                                });
                                                                if(groupActiveLicenses.length != 0) {
                                                                    groupActiveLicenses.forEach(function(grLic) {
                                                                        let sameSerUserLic = [];
                                                                        userLicenses.forEach(function(usLic){
                                                                            if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                                                                sameSerUserLic.push(usLic);
                                                                        });
                                                                        if(sameSerUserLic.length === 0 )
                                                                            console.log('Do Nothing');
                                                                        else if(sameSerUserLic.length === 1) {
                                                                            if(sameSerUserLic[0].status !== 'active')
                                                                                licenseAssignmentModel.findOneAndUpdate({_id: sameSerUserLic[0]._id}, {$set: {status: 'active'}}).exec()
                                                                        }
                                                                        else {
                                                                            let check = true;
                                                                            sameSerUserLic.forEach(function(ssLic) {
                                                                                if(ssLic.status ==='active')
                                                                                    check = false;
                                                                            });
                                                                            if(check) {
                                                                                let updateLic = sameSerUserLic[0];
                                                                                sameSerUserLic.shift();
                                                                                sameSerUserLic.forEach(function(ssLic) {
                                                                                    if(ssLic.licenseId.price > updateLic.licenseId.price){
                                                                                        updateLic = ssLic;
                                                                                    }
                                                                                });
                                                                                licenseAssignmentModel.findOneAndUpdate({_id: updateLic._id}, {$set: {status:'active'}}).exec();
                                                                            }
                                                                        }
                                                                        y++;
                                                                        if(y === groupActiveLicenses.length) {
                                                                            y = 0;
                                                                            let userlicenseIds = [];
                                                                            let userAppIds = [];
                                                                            userLicenses.forEach(function(usLic){
                                                                                userlicenseIds.push(usLic.licenseId._id);
                                                                            });
                                                                            userApps.forEach(function(usApp){
                                                                                userAppIds.push(usApp.appId._id);
                                                                            });
                                                                            appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                                appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                                    let mynewApps = [];
                                                                                    myapps.forEach(function(a){
                                                                                        mynewApps.push(a.appId.toString());
                                                                                    });
                                                                                    let apptoDelete = [];
                                                                                    myappsLic.forEach(function(al){
                                                                                        if(!userlicenseIds.includes(al.licenseId.toString())){
                                                                                            apptoDelete.push(al);
                                                                                        }
                                                                                    });
                                                                                    let deleteApp = [];
                                                                                    apptoDelete.forEach(function(atd){
                                                                                        if(!mynewApps.includes(atd.appId.toString()))
                                                                                            deleteApp.push(atd.appId);
                                                                                    });
                                                                                    appIdstoDelete = [];
                                                                                    deleteApp.forEach(function(a){
                                                                                        let unique = true;
                                                                                        appIdstoDelete.forEach(function(d){
                                                                                            if(d.toString() === a.toString())
                                                                                                unique = false;
                                                                                        });
                                                                                        if(unique) appIdstoDelete.push(a);
                                                                                    });
                                                                                    console.log(appIdstoDelete);
                                                                                    if(appIdstoDelete.length === 0) {
                                                                                        y++;
                                                                                        if(y === userFromGroups.length) {
                                                                                            i++;
                                                                                        }
                                                                                        if(i === groupsFromModel.length)
                                                                                            res.json({success: true});
                                                                                    }
                                                                                    else {
                                                                                        let x = 0;
                                                                                        appIdstoDelete.forEach(function(appDel){
                                                                                            appAssignmentModel.findOne({userId: user.userid, appId: appDel}, function(err,appCheck){
                                                                                                console.log(appCheck);
                                                                                                if(appCheck) {
                                                                                                    appAssignmentModel.findOneAndRemove({userId: user.userid, appId: appDel, groupId: null}).exec();
                                                                                                }
                                                                                                x++;
                                                                                                if(x === appIdstoDelete.length) {
                                                                                                    y++;
                                                                                                }
                                                                                                if(y === userFromGroups.length) {
                                                                                                    i++;
                                                                                                }
                                                                                                if(i === groupsFromModel.length)
                                                                                                    res.json({success: true});
                                                                                            });
                                                                                        });
                                                                                    }
                                                                                });
                                                                            });
                                                                        }
                                                                    });
                                                                } else {
                                                                    y++;
                                                                    if(y === userFromGroups.length) {
                                                                        i++;
                                                                    }
                                                                    if(i === groupsFromModel.length)
                                                                        res.json({success: true});
                                                                }
                                                                    
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        } else {
                                            i++;
                                            if(i === groupsFromModel.length)
                                                res.json({success: true});
                                        }
                                        
                                    });
                                });
                            });
                        }
                    });
                }
            });
        }
        else {
            googleApis.getGoogleService(req.user).then(service=>{
                service.groups.list({customer: 'my_customer'},(err4,info) => {
                    if(err4)
                        res.json(err4);
                    if(info.data.groups){
                        const groups = info.data.groups;
                        groupfromApiIds = [];
                        var xy = 0;
                        groups.forEach(function(group,index){
                            groupfromApiIds.push(group.id.toString());
                            groupsModel.findOne({id: group.id}, function(err3,groupData){
                                if(groupData) {
                                    groupsModel.findOneAndUpdate({id: group.id}, {$set: {
                                        email: group.email,
                                        name: group.name,
                                        description: group.description
                                    }}).exec();
                                    console.log('updated'); 
                                    xy++;
                                }
                                else {
                                    let newGroup = new groupsModel();
                                    newGroup.accountID = new mongoose.Types.ObjectId(req.user.accountID);
                                    newGroup.id = group.id;
                                    newGroup.email = group.email;
                                    newGroup.description = group.description;
                                    newGroup.name = group.name;
                                    newGroup.save();
                                    console.log('added');
                                    xy++;
                                }
                                if(xy === groups.length) {
                                    var i = 0;
                                    console.log('hello here');
                                    console.log(groupfromApiIds);
                                    groupsModel.find({accountID: req.user.accountID}, function(err,groupsFromModel){
                                        if(groupsFromModel.length == 0) {
                                            res.json({success:true})
                                        } else {
                                            groupsFromModel.forEach(function(grModel){
                                                if(!groupfromApiIds.includes(grModel.id.toString())) {
                                                    licenseAssignmentModel.find({groupId: grModel._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err,groupActiveLicenses){
                                                        licenseAssignmentModel.deleteMany({groupId: grModel._id}).exec();
                                                        appAssignmentModel.deleteMany({groupId: grModel._id, userId: null}).exec();
                                                        groupsModel.findOneAndRemove({_id: grModel._id}).exec();
                                                        userGroups.find({group: grModel._id}, function(err,userFromGroups){
                                                            userGroups.deleteMany({group: grModel._id}).exec();
                                                            console.log(userFromGroups.length);
                                                            if(userFromGroups.length != 0) {
                                                                userFromGroups.forEach(function(user) {
                                                                    appAssignmentModel.find({groupId: grModel._id,userId: user.userid, status:'active'}, function(err,groupApps){
                                                                        appAssignmentModel.deleteMany({groupId: grModel._id,userId: user.userid}, function(appErr, deletedApps){
                                                                            licenseAssignmentModel.find({userId: user.userid}).populate('licenseId').exec(function(err,userLicenses){
                                                                                appAssignmentModel.find({userId: user.userid}).populate('appId').exec(function(err,userApps){
                                                                                    let y = 0;
                                                                                    let userAppIds = [];
                                                                                    userApps.forEach(function(usApp){
                                                                                        userAppIds.push(usApp.appId._id.toString());
                                                                                    });
                                                                                    groupApps.forEach(function(grApp){
                                                                                        if (userAppIds.includes(grApp.appId.toString()))
                                                                                            appAssignmentModel.findOneAndUpdate({userId: user.userid, appId: grApp.appId}, {$set: {status: 'active'}}).exec();
                                                                                    });
                                                                                    if (groupActiveLicenses.length != 0) {
                                                                                        let userAppIds = [];
                                                                                        userApps.forEach(function(usApp){
                                                                                            userAppIds.push(usApp.appId._id.toString());
                                                                                        });
                                                                                        groupApps.forEach(function(grApp){
                                                                                            if(userAppIds.includes(grApp.appId.toString()))
                                                                                                appAssignmentModel.findOneAndUpdate({userId: user.userid, appId: grApp.appId}, {$set: {status : 'active'}}).exec();
                                                                                        });
                                                                                        groupActiveLicenses.forEach(function(grLic) {
                                                                                            let sameSerUserLic = [];
                                                                                            userLicenses.forEach(function(usLic){
                                                                                                if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                                                                                    sameSerUserLic.push(usLic);
                                                                                            });
                                                                                            if(sameSerUserLic.length === 0 )
                                                                                                console.log('Do Nothing');
                                                                                            else if(sameSerUserLic.length === 1) {
                                                                                                if(sameSerUserLic[0].status !== 'active')
                                                                                                    licenseAssignmentModel.findOneAndUpdate({_id: sameSerUserLic[0]._id}, {$set: {status: 'active'}}).exec()
                                                                                            }
                                                                                            else {
                                                                                                let check = true;
                                                                                                sameSerUserLic.forEach(function(ssLic) {
                                                                                                    if(ssLic.status ==='active')
                                                                                                        check = false;
                                                                                                });
                                                                                                if(check) {
                                                                                                    let updateLic = sameSerUserLic[0];
                                                                                                    sameSerUserLic.shift();
                                                                                                    sameSerUserLic.forEach(function(ssLic) {
                                                                                                        if(ssLic.licenseId.price > updateLic.licenseId.price){
                                                                                                            updateLic = ssLic;
                                                                                                        }
                                                                                                    });
                                                                                                    licenseAssignmentModel.findOneAndUpdate({_id: updateLic._id}, {$set: {status:'active'}}).exec();
                                                                                                }
                                                                                            }
                                                                                            y++;
                                                                                            if(y === groupActiveLicenses.length) {
                                                                                                y = 0;
                                                                                                let userlicenseIds = [];
                                                                                                let userAppIds = [];
                                                                                                userLicenses.forEach(function(usLic){
                                                                                                    userlicenseIds.push(usLic.licenseId._id);
                                                                                                });
                                                                                                userApps.forEach(function(usApp){
                                                                                                    userAppIds.push(usApp.appId._id);
                                                                                                });
                                                                                                appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                                                    appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                                                        let mynewApps = [];
                                                                                                        myapps.forEach(function(a){
                                                                                                            mynewApps.push(a.appId.toString());
                                                                                                        });
                                                                                                        let apptoDelete = [];
                                                                                                        myappsLic.forEach(function(al){
                                                                                                            if(!userlicenseIds.includes(al.licenseId.toString())){
                                                                                                                apptoDelete.push(al);
                                                                                                            }
                                                                                                        });
                                                                                                        let deleteApp = [];
                                                                                                        apptoDelete.forEach(function(atd){
                                                                                                            if(!mynewApps.includes(atd.appId.toString()))
                                                                                                                deleteApp.push(atd.appId);
                                                                                                        });
                                                                                                        appIdstoDelete = [];
                                                                                                        deleteApp.forEach(function(a){
                                                                                                            let unique = true;
                                                                                                            appIdstoDelete.forEach(function(d){
                                                                                                                if(d.toString() === a.toString())
                                                                                                                    unique = false;
                                                                                                            });
                                                                                                            if(unique) appIdstoDelete.push(a);
                                                                                                        });
                                                                                                        console.log(appIdstoDelete);
                                                                                                        if(appIdstoDelete.length === 0) {
                                                                                                            y++;
                                                                                                            if(y === userFromGroups.length) {
                                                                                                                i++;
                                                                                                            }
                                                                                                            if(i === groupsFromModel.length) {
                                                                                                                res.json({success:true});
                                                                                                            }
                                                                                                        }
                                                                                                        else {
                                                                                                            let x = 0;
                                                                                                            appIdstoDelete.forEach(function(appDel){
                                                                                                                appAssignmentModel.findOne({userId: user.userid, appId: appDel}, function(err,appCheck){
                                                                                                                    console.log(appCheck);
                                                                                                                    if(appCheck) {
                                                                                                                        appAssignmentModel.findOneAndRemove({userId: user.userid, appId: appDel, groupId: null}).exec();
                                                                                                                    }
                                                                                                                    x++;
                                                                                                                    if(x === appIdstoDelete.length) {
                                                                                                                        y++;
                                                                                                                    }
                                                                                                                    if(y === userFromGroups.length) {
                                                                                                                        i++;
                                                                                                                    }
                                                                                                                    if(i === groupsFromModel.length) {
                                                                                                                        res.json({success:true});
                                                                                                                    }
                                                                                                                });
                                                                                                            });
                                                                                                        }
                                                                                                    });
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    } else {
                                                                                        y++;
                                                                                        if(y === userFromGroups.length) {
                                                                                            i++;
                                                                                        }
                                                                                        if(i === groupsFromModel.length)
                                                                                            res.json({success: true});
                                                                                    }
                                                                                    
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                            } else {
                                                                i++;
                                                                console.log(i);
                                                                console.log(groupsFromModel.length);
                                                                if(i === groupsFromModel.length)
                                                                    res.json({message:'succesfull'});
                                                            }
                                                            
                                                        });
                                                    });
                                                } else {
                                                    i++;
                                                    console.log(i);
                                                    console.log(groupsFromModel.length);
                                                    if(i === groupsFromModel.length)
                                                        res.json({message:'succesfull'});
                                                }
                                            });
                                        }
                                    });
                                } 
                            });
                        });
                    } else {
                        groupsModel.find({accountID: req.user.accountID}, function(err,groupsFromModel){
                            if(groupsFromModel.length == 0)
                                res.json({message: 'no groups found for an account'});
                            else {
                                var i = 0;
                                groupsFromModel.forEach(function(grModel){
                                    console.log(grModel.id);
                                    licenseAssignmentModel.find({groupId: grModel._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err,groupActiveLicenses){
                                        appAssignmentModel.find({groupId: grModel._id, userId: null}, function(err,groupApps){
                                            licenseAssignmentModel.deleteMany({groupId: grModel._id}).exec();
                                            appAssignmentModel.deleteMany({groupId: grModel._id,userId: null}).exec();
                                            groupsModel.findOneAndRemove({_id: grModel._id}).exec();
                                            userGroups.find({group: grModel._id}, function(err,userFromGroups){
                                                userGroups.deleteMany({group: grModel._id}).exec();
                                                if(userFromGroups.length != 0) {
                                                    userFromGroups.forEach(function(user) {
                                                        licenseAssignmentModel.find({userId: user.userid}).populate('licenseId').exec(function(err,userLicenses){
                                                            appAssignmentModel.deleteMany({groupId: grModel._id,userId: user.userid}, function(appErr, deletedApp){
                                                                appAssignmentModel.find({userId: user.userid}).populate('appId').exec(function(err,userApps){
                                                                    let y = 0;
                                                                    let userAppIds = [];
                                                                    userApps.forEach(function(usApp){
                                                                        userAppIds.push(usApp.appId._id.toString());
                                                                    });
                                                                    groupApps.forEach(function(grApp){
                                                                        if(userAppIds.includes(grApp.appId.toString()))
                                                                            appAssignmentModel.findOneAndUpdate({userId: user.userid, appId: grApp.appId}, {$set: {status : 'active'}}).exec();
                                                                    });
                                                                    if(groupActiveLicenses.length != 0) {
                                                                        groupActiveLicenses.forEach(function(grLic) {
                                                                            let sameSerUserLic = [];
                                                                            userLicenses.forEach(function(usLic){
                                                                                if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                                                                    sameSerUserLic.push(usLic);
                                                                            });
                                                                            if(sameSerUserLic.length === 0 )
                                                                                console.log('Do Nothing');
                                                                            else if(sameSerUserLic.length === 1) {
                                                                                if(sameSerUserLic[0].status !== 'active')
                                                                                    licenseAssignmentModel.findOneAndUpdate({_id: sameSerUserLic[0]._id}, {$set: {status: 'active'}}).exec()
                                                                            }
                                                                            else {
                                                                                let check = true;
                                                                                sameSerUserLic.forEach(function(ssLic) {
                                                                                    if(ssLic.status ==='active')
                                                                                        check = false;
                                                                                });
                                                                                if(check) {
                                                                                    let updateLic = sameSerUserLic[0];
                                                                                    sameSerUserLic.shift();
                                                                                    sameSerUserLic.forEach(function(ssLic) {
                                                                                        if(ssLic.licenseId.price > updateLic.licenseId.price){
                                                                                            updateLic = ssLic;
                                                                                        }
                                                                                    });
                                                                                    licenseAssignmentModel.findOneAndUpdate({_id: updateLic._id}, {$set: {status:'active'}}).exec();
                                                                                }
                                                                            }
                                                                            y++;
                                                                            if(y === groupActiveLicenses.length) {
                                                                                y = 0;
                                                                                let userlicenseIds = [];
                                                                                let userAppIds = [];
                                                                                userLicenses.forEach(function(usLic){
                                                                                    userlicenseIds.push(usLic.licenseId._id);
                                                                                });
                                                                                userApps.forEach(function(usApp){
                                                                                    userAppIds.push(usApp.appId._id);
                                                                                });
                                                                                appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                                    appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                                        let mynewApps = [];
                                                                                        myapps.forEach(function(a){
                                                                                            mynewApps.push(a.appId.toString());
                                                                                        });
                                                                                        let apptoDelete = [];
                                                                                        myappsLic.forEach(function(al){
                                                                                            if(!userlicenseIds.includes(al.licenseId.toString())){
                                                                                                apptoDelete.push(al);
                                                                                            }
                                                                                        });
                                                                                        let deleteApp = [];
                                                                                        apptoDelete.forEach(function(atd){
                                                                                            if(!mynewApps.includes(atd.appId.toString()))
                                                                                                deleteApp.push(atd.appId);
                                                                                        });
                                                                                        appIdstoDelete = [];
                                                                                        deleteApp.forEach(function(a){
                                                                                            let unique = true;
                                                                                            appIdstoDelete.forEach(function(d){
                                                                                                if(d.toString() === a.toString())
                                                                                                    unique = false;
                                                                                            });
                                                                                            if(unique) appIdstoDelete.push(a);
                                                                                        });
                                                                                        console.log(appIdstoDelete);
                                                                                        if(appIdstoDelete.length === 0) {
                                                                                            y++;
                                                                                            if(y === userFromGroups.length) {
                                                                                                i++;
                                                                                            }
                                                                                            if(i === groupsFromModel.length)
                                                                                                res.json({success: true});
                                                                                        }
                                                                                        else {
                                                                                            let x = 0;
                                                                                            appIdstoDelete.forEach(function(appDel){
                                                                                                appAssignmentModel.findOne({userId: user.userid, appId: appDel}, function(err,appCheck){
                                                                                                    console.log(appCheck);
                                                                                                    if(appCheck) {
                                                                                                        appAssignmentModel.findOneAndRemove({userId: user.userid, appId: appDel, groupId: null}).exec();
                                                                                                    }
                                                                                                    x++;
                                                                                                    if(x === appIdstoDelete.length) {
                                                                                                        y++;
                                                                                                    }
                                                                                                    if(y === userFromGroups.length) {
                                                                                                        i++;
                                                                                                    }
                                                                                                    if(i === groupsFromModel.length)
                                                                                                        res.json({success: true});
                                                                                                });
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                });
                                                                            }
                                                                        });
                                                                    } else {
                                                                        y++;
                                                                        if(y === userFromGroups.length) {
                                                                            i++;
                                                                        }
                                                                        if(i === groupsFromModel.length)
                                                                            res.json({success: true});
                                                                    }
                                                                });
                                                            });
                                                        });
                                                    });
                                                } else {
                                                    i++;
                                                    if(i === groupsFromModel.length)
                                                        res.json({success: true});
                                                }
                                                
                                            });
                                        });
                                    });
                                });
                            }
                        });
                    }
                });
            });
        }
    },
    addGroup: function(req,res){
        if (req.user.isAzure) {
            data = {
                "name": req.body.name,
                "description": req.body.description,
                "email": req.body.email
            }
            graphApi.addGroup(req.user,data,res);
        }
        else {
            googleApis.getGoogleService(req.user).then(service=>{
                data = {
                    "email": req.body.email,
                    "name": req.body.name,
                    "description": req.body.description
                }
                service.groups.insert({requestBody: data}, (err2, response) => {
                    if (err2) 
                        res.json({message: err2.message});
                    else{
                        group = new groupsModel();
                        group.id = response.data.id;
                        group.accountID = new mongoose.Types.ObjectId(req.user.accountID);
                        group.email = response.data.email;
                        group.name = response.data.name;
                        group.description = response.data.description;
                        group.save(function(err3,result){
                            if(err3)
                                res.json(err3);
                            else
                                res.json(result);
                        })
                    }
                });
            });
        }
        
    },
    deleteGroup: function(req,res){
        if(req.user.isAzure) {
            graphApi.deleteGroup(req.user,req.params.id,res);
        }
        else {
            groupsModel.findOne({_id: req.params.id}, function(err,groupData){
                if(groupData) {
                    googleApis.getGoogleService(req.user).then(service=>{
                        service.groups.delete({groupKey: groupData.id}, (err3, d) => {
                            if (err3){
                                res.json({message: err3.message});
                            }
                            else {
                                var i = 0;
                                var j = 0;
                                licenseAssignmentModel.find({groupId: groupData._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err1,groupActiveLicenses){
                                    userGroups.find({group: groupData._id}, function(err, usersFromGroup){
                                        userGroups.deleteMany({group: groupData._id}).exec();
                                        appAssignmentModel.deleteMany({groupId: groupData._id, userId: null}).exec();
                                        groupsModel.findOneAndRemove({_id: groupData._id}).exec();
                                        licenseAssignmentModel.deleteMany({groupId: groupData._id}).exec();
                                        if(groupActiveLicenses.length != 0) {
                                                if(usersFromGroup.length != 0) {
                                                    usersFromGroup.forEach(function(userData){
                                                        appAssignmentModel.find({userId: userData.userid, groupId: groupData._id, status: 'active'}, function(err,groupApps){
                                                            appAssignmentModel.deleteMany({groupId: groupData._id, userId: userData.userid}, function(appErr, appDeleted){
                                                                if(appErr)
                                                                    res.json({error: appErr});
                                                                else {
                                                                    appAssignmentModel.find({userId: userData.userid}).populate('appId').exec(function(err1,userApps){
                                                                        licenseAssignmentModel.find({userId: userData.userid}).populate('licenseId').exec(function(err2,userLicenses){
                                                                            let userAppIds = [];
                                                                            userApps.forEach(function(usApp){
                                                                                userAppIds.push(usApp.appId._id.toString());
                                                                            });
                                                                            groupApps.forEach(function(grApp){
                                                                                if(userAppIds.includes(grApp.appId.toString()))
                                                                                    appAssignmentModel.findOneAndUpdate({userId: userData.userid, appId: grApp.appId}, {$set: {status : 'active'}}).exec();
                                                                            });
                                                                            if(groupActiveLicenses.length != 0) {
                                                                                groupActiveLicenses.forEach(function(grLic) {
                                                                                    let sameSerUserLic = [];
                                                                                    userLicenses.forEach(function(usLic){
                                                                                        if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                                                                            sameSerUserLic.push(usLic);
                                                                                    });
                                                                                    if(sameSerUserLic.length === 0 )
                                                                                        console.log('Do Nothing');
                                                                                    else if(sameSerUserLic.length === 1) {
                                                                                        if(sameSerUserLic[0].status !== 'active')
                                                                                            licenseAssignmentModel.findOneAndUpdate({_id: sameSerUserLic[0]._id}, {$set: {status: 'active'}}).exec()
                                                                                    }
                                                                                    else {
                                                                                        let check = true;
                                                                                        sameSerUserLic.forEach(function(ssLic) {
                                                                                            if(ssLic.status ==='active')
                                                                                                check = false;
                                                                                        });
                                                                                        if(check) {
                                                                                            let updateLic = sameSerUserLic[0];
                                                                                            sameSerUserLic.shift();
                                                                                            sameSerUserLic.forEach(function(ssLic) {
                                                                                                if(ssLic.licenseId.price > updateLic.licenseId.price){
                                                                                                    updateLic = ssLic;
                                                                                                }
                                                                                            });
                                                                                            licenseAssignmentModel.findOneAndUpdate({_id: updateLic._id}, {$set: {status:'active'}}).exec();
                                                                                        }
                                                                                    }
                                                                                    i++;
                                                                                    if(i === groupActiveLicenses.length) {
                                                                                        i = 0;
                                                                                        let userlicenseIds = [];
                                                                                        let userAppIds = [];
                                                                                        userLicenses.forEach(function(usLic){
                                                                                            userlicenseIds.push(usLic.licenseId._id);
                                                                                        });
                                                                                        userApps.forEach(function(usApp){
                                                                                            userAppIds.push(usApp.appId._id);
                                                                                        });
                                                                                        appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                                            appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                                                let mynewApps = [];
                                                                                                myapps.forEach(function(a){
                                                                                                    mynewApps.push(a.appId.toString());
                                                                                                });
                                                                                                let apptoDelete = [];
                                                                                                myappsLic.forEach(function(al){
                                                                                                    if(!userlicenseIds.includes(al.licenseId.toString())){
                                                                                                        apptoDelete.push(al);
                                                                                                    }
                                                                                                });
                                                                                                let deleteApp = [];
                                                                                                apptoDelete.forEach(function(atd){
                                                                                                    if(!mynewApps.includes(atd.appId.toString()))
                                                                                                        deleteApp.push(atd.appId);
                                                                                                });
                                                                                                appIdstoDelete = [];
                                                                                                deleteApp.forEach(function(a){
                                                                                                    let unique = true;
                                                                                                    appIdstoDelete.forEach(function(d){
                                                                                                        if(d.toString() === a.toString())
                                                                                                            unique = false;
                                                                                                    });
                                                                                                    if(unique) appIdstoDelete.push(a);
                                                                                                });
                                                                                                console.log(appIdstoDelete);
                                                                                                if(appIdstoDelete.length === 0) {
                                                                                                    j++;
                                                                                                    if(j === usersFromGroup.length) {
                                                                                                        res.json({success:true});
                                                                                                    }
                                                                                                }
                                                                                                else {
                                                                                                    let x = 0;
                                                                                                    appIdstoDelete.forEach(function(appDel){
                                                                                                        appAssignmentModel.findOne({userId: userData.userid, appId: appDel,groupId: null}, function(err,appCheck){
                                                                                                            console.log(appCheck);
                                                                                                            if(appCheck) {
                                                                                                                appAssignmentModel.findOneAndRemove({userId: userData.userid, appId: appDel, groupId: null}).exec();
                                                                                                                if(appCheck.status === 'active')
                                                                                                                    appAssignmentModel.findOneAndUpdate({userId: userData.userid, appId: appDel}, {$set: {status: 'active'}}).exec();
                                                                                                            }
                                                                                                            x++;
                                                                                                            if(x === appIdstoDelete.length) {
                                                                                                                j++;
                                                                                                            }
                                                                                                            if(j === usersFromGroup.length) {
                                                                                                                res.json({success:true});
                                                                                                            }
                                                                                                        });
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                        });
                                                                                    }
                                                                                });
                                                                            } else {
                                                                                j++;
                                                                                if(j === usersFromGroup.length) {
                                                                                    res.json({success:true});
                                                                                }
                                                                            }
                                                                        });
                                                                    });
                                                                }
                                                            });
                                                        });
                                                    });
                                                } else {
                                                    res.json({success: true, message: 'No Group Members Found'});
                                                }
                                            
                                        } else {
                                            res.json({success: true});
                                        }
                                    });
                                    
                                });
                            }
                        });
                    });
                } else {
                    res.json({error: 'Invalid Group Id, A group wasnt found'});
                }
                
            });
        }
    },
    updateGroup: function(req,res){
        if (req.user.isAzure) {
            let group = {
                name: req.body.name,
                description: req.body.description,
                email: req.body.email
            }
            graphApi.updateGroup(req.user,group,req.params.id,res);
        }
        else {
            groupsModel.findOne({_id: req.params.id}, function(err,groupData){
                if(groupData) {
                    googleApis.getGoogleService(req.user).then(service=>{
                        data = {
                            "email": req.body.email,
                            "name": req.body.name,
                            "description": req.body.description
                        }
                        console.log(groupData.id);
                        service.groups.update({groupKey: groupData.id,requestBody:data}, (err3, d) => {
                            if (err3) 
                                res.json({message: err3.message});
                            else{
                                groupsModel.findOneAndUpdate({_id: req.params.id},{$set: data},{new: true}, (err1, doc1) => {
                                    if (err1) {
                                        return res.status(500).json({
                                            message: 'Error when updating Group.',
                                            error: err1
                                        });
                                    }
                                    else
                                        res.json({message:data});
                                });
                            }
                        });
                    });
                } else {
                    res.json({error: 'group Not found'});
                }
                
            });
        }
    },
    addUserToGroup: function(req,res){
        const groupId = req.params.groupid;
        const userid = req.params.userid;
        if (req.user.isAzure) {
            graphApi.addUserToGroup(req.user,userid,groupId,res);
        } else {
            User.findOne({_id: userid}, function(err, userData){
                groupsModel.findOne({_id:groupId},function(err1,groupData){
                    if(groupData) {
                        if(userData) {
                            googleApis.getGoogleService(req.user).then(service=>{
                                service.members.insert({groupKey:groupData.id,requestBody:{id:userData.userID}}, (err3,result) => {
                                    if(err3)
                                        res.json({message: err3.response.data});
                                    else {
                                        let userLicensesthatAssigned = [];
                                        console.log('successful');
                                        licenseAssignmentModel.find({groupId: groupData._id, userId: null}).populate('licenseId').exec(function(err3,groupLicenses){
                                            appAssignmentModel.find({userId: userData._id}, function(err55,userApps){
                                                licenseAssignmentModel.find({userId: userData._id, status: 'active'}).populate('licenseId').exec(function(er,useractiveLicenses){
                                                    appAssignmentModel.find({groupId: groupData._id, userId: null}).populate('appId').exec(function(err4,groupApps){
                                                        let userAppIds = [];
                                                        userApps.forEach(function(usApp){
                                                            userAppIds.push(usApp.appId.toString());
                                                        })
                                                        userGroup = new userGroups();
                                                        userGroup.userid = userData._id;
                                                        userGroup.group = groupData._id;
                                                        userGroup.save();
                                                        groupLicenses.forEach(function(grLic){
                                                            let status = 'active';
                                                            let licAssign = new licenseAssignmentModel();
                                                            licAssign.groupId =  groupData._id;
                                                            licAssign.userId = userData._id;
                                                            licAssign.licenseId = grLic.licenseId._id;
                                                            if(grLic.status !== 'active')
                                                                status = 'inactive';
                                                            else {
                                                                useractiveLicenses.forEach(function(usLic){
                                                                    console.log('serviceid ', usLic.licenseId.serviceId);
                                                                    if(usLic.licenseId.serviceId.toString() === grLic.licenseId.serviceId.toString()) {
                                                                        if(usLic.licenseId.price >= grLic.licenseId.price)
                                                                            status = 'inactive';
                                                                        else
                                                                            licenseAssignmentModel.findOneAndUpdate({_id: usLic._id}, {$set:{status:'inactive'}}).exec();
                                                                    }
                                                                });
                                                            }
                                                            licAssign.status = status;
                                                            licAssign.save();
                                                            userLicensesthatAssigned.push(licAssign);
                                                        });
                                                        groupApps.forEach(function(grApp){
                                                            let appAssign = new appAssignmentModel();
                                                            appAssign.groupId = groupData._id;
                                                            appAssign.userId = userData._id;
                                                            appAssign.status = 'active';
                                                            if(userAppIds.includes(grApp.appId._id.toString()))
                                                                appAssign.status = 'inactive';
                                                            appAssign.appId = grApp.appId._id;
                                                            appAssign.save();
                                                        });
                                                        res.json({LicensesAssigned: userLicensesthatAssigned, AppsAssigned: groupApps});
                                                    });
                                                });
                                            });
                                            
                                        });
                                    }
                                });
                            });
                        } else {
                            res.json({error: 'Invalid UserID provided'});
                        }
                    } else {
                        res.json({error: 'invalid groupId provided'})
                    }
                });
            });
        }
    },
    deleteUserFromGroup: function(req,res){
        const groupId = req.params.groupid;
        const userid = req.params.userid;
        if(req.user.isAzure) {
            graphApi.deleteUserFromGroup(req.user,userid,groupId,res);
        }
        else {
            groupsModel.findOne({_id: groupId}, function(err,groupData){
                User.findOne({_id: userid}, function(err1,userData){
                    if(groupData) {
                        if(userData){
                            googleApis.getGoogleService(req.user).then(service=>{
                                service.members.delete({groupKey:groupData.id,memberKey:userData.userID}, (err3,result) => {
                                    if(err3)
                                        res.json({message: 'no such member for a group found'});
                                    else {
                                        var i = 0;
                                        licenseAssignmentModel.find({groupId: groupData._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err1,groupActiveLicenses){
                                            appAssignmentModel.find({groupId: groupData._id, userId: userData._id, status:'active'}, function(err, groupApps){
                                                appAssignmentModel.deleteMany({groupId: groupData._id,userId: userData._id}).exec();
                                                userGroups.findOneAndDelete({group: groupData._id,userid: userData._id}).exec();
                                                licenseAssignmentModel.deleteMany({groupId: groupData._id,userId: userData._id}).exec();
                                                appAssignmentModel.find({userId: userData._id}).populate('appId').exec(function(err,userApps){
                                                    licenseAssignmentModel.find({userId: userData._id}).populate('licenseId').exec(function(err2,userLicenses){
                                                        let userAppIds = [];
                                                        userApps.forEach(function(usApp){
                                                            userAppIds.push(usApp.appId._id.toString());
                                                        });
                                                        groupApps.forEach(function(grApp){
                                                            if(userAppIds.includes(grApp.appId.toString()))
                                                                appAssignmentModel.findOneAndUpdate({userId: userData._id, appId: grApp.appId}, {$set: {status : 'active'}}).exec();
                                                        });
                                                        if(groupActiveLicenses.length != 0) {
                                                            groupActiveLicenses.forEach(function(grLic) {
                                                                let sameSerUserLic = [];
                                                                userLicenses.forEach(function(usLic){
                                                                    if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                                                        sameSerUserLic.push(usLic);
                                                                });
                                                                if(sameSerUserLic.length === 0 )
                                                                    console.log('Do Nothing');
                                                                else if(sameSerUserLic.length === 1) {
                                                                    if(sameSerUserLic[0].status !== 'active') {
                                                                        licenseAssignmentModel.findOneAndUpdate({_id: sameSerUserLic[0]._id}, {$set: {status: 'active'}}).exec()
                                                                    }
                                                                }
                                                                else {
                                                                    let updateArray = {};
                                                                    updateArray = sameSerUserLic[0];
                                                                    sameSerUserLic.shift();
                                                                    sameSerUserLic.forEach(function(ssLic) {
                                                                        if(ssLic.licenseId.price > updateArray.licenseId.price){
                                                                            updateArray = ssLic;
                                                                        }
                                                                    });
                                                                    licenseAssignmentModel.findOneAndUpdate({_id: updateArray._id}, {$set: {status:'active'}}).exec();
                                                                }
                                                                i++;
                                                                if(i === groupActiveLicenses.length) {
                                                                    let userlicenseIds = [];
                                                                    let userAppIds = [];
                                                                    userLicenses.forEach(function(usLic){
                                                                        userlicenseIds.push(usLic.licenseId._id);
                                                                    });
                                                                    userApps.forEach(function(usApp){
                                                                        userAppIds.push(usApp.appId._id);
                                                                    });
                                                                    
                                                                    appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                        appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                            let mynewApps = [];
                                                                            myapps.forEach(function(a){
                                                                                mynewApps.push(a.appId.toString());
                                                                            });
                                                                            let apptoDelete = [];
                                                                            myappsLic.forEach(function(al){
                                                                                if(!userlicenseIds.includes(al.licenseId.toString())){
                                                                                    apptoDelete.push(al);
                                                                                }
                                                                            });
                                                                            let deleteApp = [];
                                                                            apptoDelete.forEach(function(atd){
                                                                                if(!mynewApps.includes(atd.appId.toString()))
                                                                                    deleteApp.push(atd.appId);
                                                                            });
                                                                            appIdstoDelete = [];
                                                                            deleteApp.forEach(function(a){
                                                                                let unique = true;
                                                                                appIdstoDelete.forEach(function(d){
                                                                                    if(d.toString() === a.toString())
                                                                                        unique = false;
                                                                                });
                                                                                if(unique) appIdstoDelete.push(a);
                                                                            });
                                                                            console.log(appIdstoDelete);
                                                                            if(appIdstoDelete.length == 0) {
                                                                                    res.json({status: true});
                                                                            }
                                                                            else {
                                                                                let j = 0;
                                                                                appIdstoDelete.forEach(function(appDel){
                                                                                    appAssignmentModel.findOne({userId: userData._id, appId: appDel}, function(err,appCheck){
                                                                                        console.log(appCheck);
                                                                                        if(appCheck) {
                                                                                            appAssignmentModel.findOneAndRemove({userId: userData._id, appId: appDel, groupId: null}).exec();
                                                                                        }
                                                                                        j++;
                                                                                        if(j == appIdstoDelete.length)
                                                                                            res.json({success: true});
                                                                                    });
                                                                                });
                                                                            }
                                                                        });
                                                                    });
                                                                }
                                                            });
                                                        } else {
                                                            res.json({success: true});
                                                        }
                                                        
                                                    });
                                                });
                                            });
                                            
                                        });
                                    }
                                });
                            });
                        } else
                            res.json({error: 'User Not Found'});
                    } else
                        res.json({error: 'Group Not Found'});
                    
                });
            });
        }
    },
    getGroupMembersFromApi: function(req,res) {
        if(req.user.isAzure) {
            graphApi.getUserGroups(req.user,res);
        }
        else {
            var i = 0;
            var j = 0;
            googleApis.getGoogleService(req.user).then(service=>{
                groupsModel.find({accountID: req.user.accountID}, function(err2,groups){
                    if(groups.length != 0) {
                        groups.forEach(function(group){
                            licenseAssignmentModel.find({groupId: group._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err,groupActiveLicenses){
                                licenseAssignmentModel.find({groupId: group._id, userId: null}).populate('licenseId').exec(function(err,groupLicenses){
                                    appAssignmentModel.find({groupId: group._id, userId: null}, function(err1,groupApps){
                                        service.members.list({groupKey: group.id}, (err5,groupMembers) => {
                                            if(err5)
                                                res.json(err5.message);
                                            if(groupMembers.data.members) {
                                                console.log('hello');
                                                let memberIds = [];
                                                let members = groupMembers.data.members;
                                                members.forEach(function(member) {
                                                    memberIds.push(member.id.toString());
                                                    User.findOne({userID: member.id}, function(err,userData){
                                                        licenseAssignmentModel.find({userId: userData._id, status: 'active'}).populate('licenseId').exec(function(err1,useractiveLicenses){
                                                            appAssignmentModel.find({userId: userData._id}, function(err2,userApps) {
                                                                userGroups.find({group: group._id, userid: userData._id}, function(err3,usergroup){
                                                                    if(err3)
                                                                        res.json(err3);
                                                                    else if (usergroup.length == 0 ){
                                                                        let userAppIds = [];
                                                                        userApps.forEach(function(usApp){
                                                                            userAppIds.push(usApp.appId.toString());
                                                                        });
                                                                        console.log('add');
                                                                        groupLicenses.forEach(function(grLic){
                                                                            let status = 'active';
                                                                            let licAssign = new licenseAssignmentModel();
                                                                            licAssign.groupId =  group._id;
                                                                            licAssign.userId = userData._id;
                                                                            licAssign.licenseId = grLic.licenseId._id;
                                                                            if(grLic.status !== 'active'){
                                                                                status = 'inactive';
                                                                            }  
                                                                            else {
                                                                                useractiveLicenses.forEach(function(usLic){
                                                                                    if(usLic.licenseId.serviceId.toString() === grLic.licenseId.serviceId.toString()) {
                                                                                        if(usLic.licenseId.price >= grLic.licenseId.price)
                                                                                            status = 'inactive';
                                                                                        else
                                                                                            licenseAssignmentModel.findOneAndUpdate({_id: usLic._id}, {$set:{status:'inactive'}}).exec();
                                                                                    }
                                                                                });
                                                                            }
                                                                            licAssign.status = status;
                                                                            licAssign.save();
                                                                        });
                                                                        groupApps.forEach(function(grApp){
                                                                            let newLic = new appAssignmentModel();
                                                                            newLic.groupId = group._id;
                                                                            newLic.userId = userData._id;
                                                                            newLic.appId = grApp.appId;
                                                                            newLic.status = 'active';
                                                                            if(userAppIds.includes(grApp.appId.toString()))
                                                                                newLic.status = 'inactive';
                                                                            newLic.save();
                                                                        });
                                                                        let newmember = new userGroups();
                                                                        newmember.group = new mongoose.Types.ObjectId(group._id);
                                                                        newmember.userid = userData._id;
                                                                        newmember.save();
                                                                    }
                                                                    i++;
                                                                    if(i===members.length) {
                                                                        i=0;
                                                                        userGroups.find({group: group._id}).populate('userid').exec(function(err,groupUsers){
                                                                            console.log(memberIds);
                                                                            if(groupUsers.length != 0) {
                                                                                groupUsers.forEach(function(userGroup){
                                                                                    if(!memberIds.includes(userGroup.userid.userID.toString())){
                                                                                        console.log('helllo');
                                                                                        userGroups.findOneAndRemove({userid: userGroup.userid._id, group: group._id}).exec();
                                                                                        licenseAssignmentModel.deleteMany({userId: userGroup.userid._id, groupId: group._id}).exec();
                                                                                        licenseAssignmentModel.find({userId: userGroup.userid._id}).populate('licenseId').exec(function(err,userLicenses){
                                                                                            appAssignmentModel.find({groupId: group._id, userId: userGroup.userid._id, status:'active'}, function(err, groupApps){
                                                                                                appAssignmentModel.find({userId: userGroup.userid._id}, function(err, userApps){
                                                                                                    appAssignmentModel.deleteMany({userId: userGroup.userid._id, groupId: group._id}).exec();
                                                                                                    let userAppIds = [];
                                                                                                    userApps.forEach(function(usApp){
                                                                                                        userAppIds.push(usApp.appId.toString());
                                                                                                    });
                                                                                                    groupApps.forEach(function(grApp){
                                                                                                        if(userAppIds.includes(grApp.appId.toString()))
                                                                                                            appAssignmentModel.findOneAndUpdate({userId:  userGroup.userid._id, appId: grApp.appId}, {$set: {status : 'active'}}).exec();
                                                                                                    });
                                                                                                    if(groupActiveLicenses.length != 0) {
                                                                                                        let x = 0;
                                                                                                        groupActiveLicenses.forEach(function(grLic) {
                                                                                                            let sameSerUserLic = [];
                                                                                                            userLicenses.forEach(function(usLic){
                                                                                                                if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                                                                                                    sameSerUserLic.push(usLic);
                                                                                                            });
                                                                                                            if(sameSerUserLic.length === 0 )
                                                                                                                console.log('Do Nothing');
                                                                                                            else if(sameSerUserLic.length === 1) {
                                                                                                                if(sameSerUserLic[0].status !== 'active') {
                                                                                                                    licenseAssignmentModel.findOneAndUpdate({_id: sameSerUserLic[0]._id}, {$set: {status: 'active'}}).exec()
                                                                                                                }
                                                                                                            }
                                                                                                            else {
                                                                                                                let updateArray = {};
                                                                                                                updateArray = sameSerUserLic[0];
                                                                                                                sameSerUserLic.shift();
                                                                                                                sameSerUserLic.forEach(function(ssLic) {
                                                                                                                    if(ssLic.licenseId.price > updateArray.licenseId.price){
                                                                                                                        updateArray = ssLic;
                                                                                                                    }
                                                                                                                });
                                                                                                                licenseAssignmentModel.findOneAndUpdate({_id: updateArray._id}, {$set: {status:'active'}}).exec();
                                                                                                            }
                                                                                                            x++;
                                                                                                            console.log(x);
                                                                                                            console.log(groupActiveLicenses.length);
                                                                                                            if(x === groupActiveLicenses.length) {
                                                                                                                console.log('inside groupactive');
                                                                                                                let userlicenseIds = [];
                                                                                                                let userAppIds = [];
                                                                                                                userLicenses.forEach(function(usLic){
                                                                                                                    userlicenseIds.push(usLic.licenseId._id);
                                                                                                                });
                                                                                                                userApps.forEach(function(usApp){
                                                                                                                    userAppIds.push(usApp.appId._id);
                                                                                                                });
                                                                                                                appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                                                                    appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                                                                        let mynewApps = [];
                                                                                                                        myapps.forEach(function(a){
                                                                                                                            mynewApps.push(a.appId.toString());
                                                                                                                        });
                                                                                                                        let apptoDelete = [];
                                                                                                                        myappsLic.forEach(function(al){
                                                                                                                            if(!userlicenseIds.includes(al.licenseId.toString())){
                                                                                                                                apptoDelete.push(al);
                                                                                                                            }
                                                                                                                        });
                                                                                                                        let deleteApp = [];
                                                                                                                        apptoDelete.forEach(function(atd){
                                                                                                                            if(!mynewApps.includes(atd.appId.toString()))
                                                                                                                                deleteApp.push(atd.appId);
                                                                                                                        });
                                                                                                                        appIdstoDelete = [];
                                                                                                                        deleteApp.forEach(function(a){
                                                                                                                            let unique = true;
                                                                                                                            appIdstoDelete.forEach(function(d){
                                                                                                                                if(d.toString() === a.toString())
                                                                                                                                    unique = false;
                                                                                                                            });
                                                                                                                            if(unique) 
                                                                                                                                appIdstoDelete.push(a);
                                                                                                                        });
                                                                                                                        if(appIdstoDelete.length == 0) {
                                                                                                                            i++;
                                                                                                                            if(i === groupUsers.length){
                                                                                                                                j++;
                                                                                                                            }
                                                                                                                            console.log(j);
                                                                                                                            console.log(groups.length);
                                                                                                                            if(j == groups.length){
                                                                                                                                res.json({success: true});
                                                                                                                            }
                    
                                                                                                                        } else {
                                                                                                                            let xy = 0;
                                                                                                                            appIdstoDelete.forEach(function(appDel){
                                                                                                                                appAssignmentModel.findOne({userId: userGroup.userid._id, appId: appDel}, function(err,appCheck){
                                                                                                                                    console.log(appCheck);
                                                                                                                                    if(appCheck) {
                                                                                                                                        appAssignmentModel.findOneAndRemove({userId: userGroup.userid._id, appId: appDel, groupId: null}).exec();
                                                                                                                                    }
                                                                                                                                    xy++;
                                                                                                                                    if(xy == appIdstoDelete.length)
                                                                                                                                        i++;
                                                                                                                                    if(i === groupUsers.length){
                                                                                                                                        j++;
                                                                                                                                    }
                                                                                                                                    if(j == groups.length){
                                                                                                                                        res.json({success: true});
                                                                                                                                    }
                                                                                                                                });
                                                                                                                            });
                                                                                                                        }
                                                                                                                    });
                                                                                                                });
                                                                                                            }
                                                                                                        });
                                                                                                    } else {
                                                                                                        i++;
                                                                                                        if(i === groupUsers.length){
                                                                                                            j++;
                                                                                                        }
                                                                                                        if(j == groups.length){
                                                                                                            res.json({success: true});
                                                                                                        }
                                                                                                    }
                                                                                                });
                                                                                            });
                                                                                        });
                                                                                    } else {
                                                                                        i++;
                                                                                        console.log(groupUsers.length);
                                                                                        if(i === groupUsers.length){
                                                                                            j++;
                                                                                        }
                                                                                        if(j == groups.length){
                                                                                            res.json({success: true});
                                                                                        }
                                                                                    }
                                                                                });
                                                                            } else {
                                                                                j++;
                                                                                if(j == groups.length)
                                                                                    res.json({success: true});

                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            } else {
                                                userGroups.find({group: group._id}).populate('userid').exec(function(err,groupUsers){
                                                    if(groupUsers.length !== 0 ) {
                                                        var yz = 0;
                                                        groupUsers.forEach(function(userGroup){
                                                            userGroups.findOneAndRemove({userid: userGroup.userid._id, group: group._id}).exec();
                                                            licenseAssignmentModel.deleteMany({userId: userGroup.userid._id, groupId: group._id}).exec();
                                                            appAssignmentModel.find({userId: userGroup.userid._id, groupId:group._id, status: 'active'}, function(err,groupApps) {
                                                                appAssignmentModel.deleteMany({userId: userGroup.userid._id, groupId: group._id}).exec();
                                                                licenseAssignmentModel.find({userId: userGroup.userid._id}).populate('licenseId').exec(function(err,userLicenses){
                                                                    appAssignmentModel.find({userId: userGroup.userid._id}, function(err, userApps){
                                                                        console.log(userLicenses.length);
                                                                        if(groupActiveLicenses.length != 0) {
                                                                            let userAppIds = [];
                                                                            userApps.forEach(function(usApp){
                                                                                userAppIds.push(usApp.appId.toString());
                                                                            });
                                                                            groupApps.forEach(function(grApp){
                                                                                if(userAppIds.includes(grApp.appId.toString()))
                                                                                    appAssignmentModel.findOneAndUpdate({userId: userGroup.userid._id, appId: grApp.appId}, {$set: {status: 'active'}}).exec();
                                                                            });
                                                                            let x = 0;
                                                                            groupActiveLicenses.forEach(function(grLic) {
                                                                                let sameSerUserLic = [];
                                                                                userLicenses.forEach(function(usLic){
                                                                                    if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                                                                        sameSerUserLic.push(usLic);
                                                                                });
                                                                                if(sameSerUserLic.length === 0 )
                                                                                    console.log('Do Nothing');
                                                                                else if(sameSerUserLic.length === 1) {
                                                                                    if(sameSerUserLic[0].status !== 'active') {
                                                                                        licenseAssignmentModel.findOneAndUpdate({_id: sameSerUserLic[0]._id}, {$set: {status: 'active'}}).exec()
                                                                                    }
                                                                                }
                                                                                else {
                                                                                    let updateArray = {};
                                                                                    updateArray = sameSerUserLic[0];
                                                                                    sameSerUserLic.shift();
                                                                                    sameSerUserLic.forEach(function(ssLic) {
                                                                                        if(ssLic.licenseId.price > updateArray.licenseId.price){
                                                                                            updateArray = ssLic;
                                                                                        }
                                                                                    });
                                                                                    licenseAssignmentModel.findOneAndUpdate({_id: updateArray._id}, {$set: {status:'active'}}).exec();
                                                                                }
                                                                                x++;
                                                                                if(x === groupActiveLicenses.length) {
                                                                                    console.log('inside groupactive');
                                                                                    let userlicenseIds = [];
                                                                                    let userAppIds = [];
                                                                                    userLicenses.forEach(function(usLic){
                                                                                        userlicenseIds.push(usLic.licenseId._id);
                                                                                    });
                                                                                    userApps.forEach(function(usApp){
                                                                                        userAppIds.push(usApp.appId._id);
                                                                                    });
                                                                                    appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                                        appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                                            let mynewApps = [];
                                                                                            myapps.forEach(function(a){
                                                                                                mynewApps.push(a.appId.toString());
                                                                                            });
                                                                                            let apptoDelete = [];
                                                                                            myappsLic.forEach(function(al){
                                                                                                if(!userlicenseIds.includes(al.licenseId.toString())){
                                                                                                    apptoDelete.push(al);
                                                                                                }
                                                                                            });
                                                                                            let deleteApp = [];
                                                                                            apptoDelete.forEach(function(atd){
                                                                                                if(!mynewApps.includes(atd.appId.toString()))
                                                                                                    deleteApp.push(atd.appId);
                                                                                            });
                                                                                            appIdstoDelete = [];
                                                                                            deleteApp.forEach(function(a){
                                                                                                let unique = true;
                                                                                                appIdstoDelete.forEach(function(d){
                                                                                                    if(d.toString() === a.toString())
                                                                                                        unique = false;
                                                                                                });
                                                                                                if(unique) 
                                                                                                    appIdstoDelete.push(a);
                                                                                            });
                                                                                            if(appIdstoDelete.length == 0) {
                                                                                                yz++;
                                                                                                if(yz === groupUsers.length){
                                                                                                    j++;
                                                                                                }
                                                                                                if(j == groups.length){
                                                                                                    res.json({success: true});
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                let xy = 0;
                                                                                                appIdstoDelete.forEach(function(appDel){
                                                                                                    appAssignmentModel.findOne({userId: userGroup.userid._id, appId: appDel}, function(err,appCheck){
                                                                                                        console.log(appCheck);
                                                                                                        if(appCheck) {
                                                                                                            appAssignmentModel.findOneAndRemove({userId: userGroup.userid._id, appId: appDel, groupId: null}).exec();
                                                                                                        }
                                                                                                        xy++;
                                                                                                        if(xy == appIdstoDelete.length)
                                                                                                            yz++;
                                                                                                        if(yz === groupUsers.length){
                                                                                                            j++;
                                                                                                        }
                                                                                                        if(j == groups.length){
                                                                                                            res.json({success: true});
                                                                                                        }
                                                                                                    });
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    });
                                                                                }
                                                                            });
                                                                        } else {
                                                                            j++;
                                                                            if(j == groups.length){
                                                                                res.json({success: true});
                                                                            }
                                                                        }
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    } else {
                                                      console.log('hello');
                                                      j++;
                                                      if(j == groups.length)
                                                      res.json({success: true});
                                                    }
                                                });
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    } else {
                        res.json({message: 'groups Not Found'});
                    }
                });
            });
        }
    },
    addLicenseToGroup: function(req,res){
        var i = 0;
        var groupId = new mongoose.Types.ObjectId(req.params.groupid);
        var licenseid = new mongoose.Types.ObjectId(req.params.licenseid);
        licenseModel.findOne({_id: licenseid}, function(err,licensetoAdd){
            groupsModel.findOne({_id: groupId}, function(er,groupData){
                if(licensetoAdd) {
                    if(groupData) {
                        licenseAssignmentModel.findOne({groupId: groupData._id, licenseId: licensetoAdd._id,userId: null}, function(err,data){
                            if(data) {
                                res.json({error: 'license Already Assigned'});
                            } else {
                                var licenseStatus = '';
                                var lictoUpdate = null;
                                var newLic = new licenseAssignmentModel();
                                var groupLicenseIds = [];
                                var licAssignedSameSer = [];
                                var canAdd = false;
                                var serviceStatus = false;
                                licenseAssignmentModel.find({groupId: groupData._id, userId: null,status:'active'}).populate('licenseId').exec(function(err,groupLicenses){
                                    licenseModel.find({serviceId: licensetoAdd.serviceId}, function(err1,correspondingLicenses){
                                        newLic.groupId = groupData._id;
                                        newLic.licenseId = licensetoAdd._id;
                                        groupLicenses.forEach(function(d){
                                            groupLicenseIds.push(d.licenseId._id.toString());
                                        });
                                        correspondingLicenses.forEach(function(a){
                                            if(groupLicenseIds.includes(a._id.toString()))
                                                licAssignedSameSer.push(a);
                                        });
                                        if(licAssignedSameSer.length == 0) {
                                            licenseStatus = 'No license Found. Adding a new License';
                                            canAdd = true;
                                        }
                                        else if(licAssignedSameSer.length == 1) {
                                            if(licAssignedSameSer[0].price < licensetoAdd.price) {
                                                lictoUpdate = licAssignedSameSer[0]._id;
                                                licenseStatus = 'Newer License Higher than the old, Old License set to Inactive, licenseId = ' + lictoUpdate._id;
                                                canAdd = true;
                                                licenseAssignmentModel.updateMany({groupId: groupData._id,licenseId: lictoUpdate._id}, {$set:{status:'inactive'}}).exec();
                                            } else {
                                                canAdd = false;
                                                //licenseStatus = 'Newer License lower than the old, Newer license set to inactive';
                                            }
                                        }
                                        if(canAdd) {
                                            newLic.status = 'active';
                                        }
                                        else {
                                            licenseStatus = 'Newer License Lower than the old, New Set to Inactive';
                                            newLic.status = 'inactive'
                                        }
                                        newLic.save();
                                        userGroups.find({group: groupData._id}, function(err,usersFromGroups){
                                            if(usersFromGroups.length == 0) {
                                                serviceAssignmentModel.findOne({serviceId: licensetoAdd.serviceId, accountID: groupData.accountID}, function(err,service){
                                                    if(service) {
                                                        serviceStatus = false;
                                                    } else {
                                                        newSer = new serviceAssignmentModel();
                                                        newSer.serviceId = licensetoAdd.serviceId;
                                                        newSer.accountID = groupData.accountID;
                                                        newSer.status = 'active';
                                                        newSer.save();
                                                        serviceStatus = true;
                                                    }
                                                    res.json({licenseAssigned: newLic, licenseStatus: licenseStatus,usersCounted: usersFromGroups.length,newServiceAssigned: serviceStatus});
                                                });
                                            } else {
                                                usersFromGroups.forEach(function(user){
                                                    licenseAssignmentModel.find({userId: user.userid, status:'active'}).populate('licenseId').exec(function(er,userLicenses){
                                                        let newUserLic = new licenseAssignmentModel();
                                                        let assignUserLic = [];
                                                        newUserLic.userId = user.userid;
                                                        newUserLic.groupId = groupData._id;
                                                        newUserLic.licenseId = licensetoAdd._id;
                                                        if(newLic.status !=='active') {
                                                            newUserLic.status = newLic.status;
                                                        }
                                                        else {
                                                            userLicenses.forEach(function(usLic){
                                                                if(usLic.licenseId.serviceId.toString() === licensetoAdd.serviceId.toString() ){
                                                                    assignUserLic.push(usLic);
                                                                }
                                                            });
                                                            if(assignUserLic.length == 0) {
                                                                newUserLic.status = newLic.status;
                                                            }
                                                            else {
                                                                if(assignUserLic[0].licenseId.price >= licensetoAdd.price) {
                                                                    newUserLic.status = 'inactive';
                                                                } else {
                                                                    newUserLic.status = 'active';
                                                                    console.log(assignUserLic[0]._id);
                                                                    licenseAssignmentModel.findOneAndUpdate({_id: assignUserLic[0]._id}, {$set: {status: 'inactive'}}).exec();
                                                                }
                                                            }
                                                        }
                                                        newUserLic.save();
                                                        i++;
                                                        if(i===usersFromGroups.length) {
                                                            serviceAssignmentModel.findOne({serviceId: licensetoAdd.serviceId, accountID: groupData.accountID}, function(err,service){
                                                                if(service) {
                                                                    serviceStatus = false;
                                                                } else {
                                                                    newSer = new serviceAssignmentModel();
                                                                    newSer.serviceId = licensetoAdd.serviceId;
                                                                    newSer.accountID = groupData.accountID;
                                                                    newSer.status = 'active';
                                                                    newSer.save();
                                                                    serviceStatus = true;
                                                                }
                                                                res.json({licenseAssigned: newLic, licenseStatus: licenseStatus,usersCounted: usersFromGroups.length,newServiceAssigned: serviceStatus});
                                                            });
                                                        }
                                                    });        
                                                });
                                            }
                                            
                                        });
                                        
                                    });
                                });
                            }
                        });
                    } else
                        res.json({error: 'Group Not Found'});
                } else
                    res.json({error: 'License Not Found'});
            });
        });
    },
    removeLicenseFromGroup: function(req,res){
        var groupId = req.params.groupid;
        var licenseid = new mongoose.Types.ObjectId(req.params.licenseid);
        licenseModel.findOne({_id: licenseid}, function(err,licenseData){
            groupsModel.findOne({_id: groupId}, function(er,groupData){
                if(licenseData) {
                    if(groupData) {
                        licenseAssignmentModel.findOne({licenseId: licenseData._id, groupId: groupData._id,userId: null}, function(er,licensetoDelete){
                            if(licensetoDelete) {
                                licenseAssignmentModel.deleteMany({licenseId: licenseData._id, groupId: groupData._id}).exec();
                                licenseModel.find({serviceId: licenseData.serviceId, _id:  {$ne: licenseid}}, function(err,correspondingLic){
                                    licenseAssignmentModel.find({groupId: groupData._id, licenseId: {$ne: licenseid}, userId: null}).populate('licenseId').exec(function(err,data){
                                        appAssignmentModel.find({groupId: groupData._id,userId: null}).populate('appId').exec(function(err,apps){
                                            myAppIds = [];
                                            apps.forEach(function(itm){
                                                myAppIds.push(itm.appId._id.toString());
                                            });
                                            myLicenses = [];
                                            data.forEach(function(itm){
                                                myLicenses.push(itm.licenseId._id.toString());
                                            });
                                            licenseReAssign = [];
                                            correspondingLic.forEach(function(d) {
                                                if(myLicenses.includes(d._id.toString())) {
                                                    licenseReAssign.push(d);
                                                }
                                            });
                                            console.log(licenseReAssign.length);
                                            var licenseStatus = '';
                                            if(licenseReAssign.length == 0) {
                                                licenseStatus= 'No Corresponding License Found that can be set to active';
                                            }
                                            else if(licenseReAssign.length == 1) {
                                                data.forEach(function(a){
                                                    if(a.licenseId._id.toString() === licenseReAssign[0]._id.toString()) {
                                                        if(a.status !=='active'){
                                                            licenseStatus = 'License Removed & ' + a.licenseId._id +' was reAssigned';
                                                            licenseAssignmentModel.findOneAndUpdate({licenseId: a.licenseId._id, groupId: groupData._id,userId: null}, {$set:{status:'active'}}).exec(); 
                                                        }
                                                        else{
                                                            licenseStatus = 'License Removed. Higher was present';
                                                        }
                                                    }
                                                });
                                            } else {
                                                toUpdate = licenseReAssign[0];
                                                licenseReAssign.forEach(function(a){
                                                    if(toUpdate.price < a.price) {
                                                        toUpdate = a;
                                                    }
                                                });
                                                console.log(toUpdate);
                                                data.forEach(function(a){
                                                    if(a.licenseId._id.toString() === toUpdate._id.toString()) {
                                                        if(a.status !=='active'){
                                                                licenseStatus = 'License Removed & ' + a.licenseId._id +' was reAssigned';
                                                                licenseAssignmentModel.findOneAndUpdate({licenseId: a.licenseId._id,groupId: groupData._id, userID: null}, {$set:{status:'active'}}).exec();
                                                        }
                                                        else {
                                                            licenseStatus = 'License Removed. Higher was present';
                                                        }
                                                    }
                                                });
                                            }
                                            appLicense.find({licenseId: {$in: myLicenses}}, function(err,myapps){
                                                appLicense.find({appId: {$in: myAppIds}}, function(err,myappsLic){
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
                                                        i = 0;
                                                        userGroups.find({group: groupData._id}, function(err,usersFromGroups){
                                                            if(usersFromGroups.length !=0) {
                                                                usersFromGroups.forEach(function(userData){
                                                                    licenseAssignmentModel.find({userId: userData.userid}).populate('licenseId').exec(function(err1,userLicenses){
                                                                        let licensesofSameService = [];
                                                                        userLicenses.forEach(function(usLic){
                                                                            if(usLic.licenseId.serviceId.toString() === licenseData.serviceId.toString())
                                                                                licensesofSameService.push(usLic);
                                                                        });
                                                                        if(licensesofSameService.length === 0)
                                                                            console.log('No license found for user: ', userData.userid);
                                                                        else if(licensesofSameService.length === 1 ) {
                                                                            if(licensesofSameService[0].status !=='active')
                                                                                licenseAssignmentModel.findOneAndUpdate({_id: licensesofSameService[0]._id}, {$set: {status:'active'}}).exec();
                                                                        } else {
                                                                            let toUpdate = licensesofSameService[0];
                                                                            licensesofSameService.shift();
                                                                            licensesofSameService.forEach(function(usLic){
                                                                                if(usLic.licenseId.price > toUpdate.licenseId.price)
                                                                                    toUpdate = usLic;
                                                                            });
                                                                            licenseAssignmentModel.findOneAndUpdate({_id: toUpdate._id}, {$set: {status:'active'}}).exec();
                                                                        }
                                                                        i++;
                                                                        if(i === usersFromGroups.length)
                                                                            res.json({licenseStatus: licenseStatus, appStatus: 'No App Was Found to Be Removed', usersFound: usersFromGroups.length});
                                                                    });
                                                                }); 
                                                            } else {
                                                                res.json({licenseStatus: licenseStatus, appStatus: 'No App Was Found to Be Removed', usersFound: null});
                                                            }
                                                        });
                                                    } else {
                                                        appIdstoDelete.forEach(function(appDel){
                                                            appAssignmentModel.findOne({groupId: groupData._id, appId: appDel, userId: null}, function(err,appCheck){
                                                                if(appCheck) {
                                                                    appStatus.push('App Removed of ID: ' + appDel);
                                                                    appAssignmentModel.deleteMany({groupId: groupData._id, appId: appDel}).exec();
                                                                } else {
                                                                    appStatus.push('Didnt Delete App of id '+ appDel + ' Either User Assigned, or Active License of that service Remains')
                                                                }
                                                                i++;
                                                                if(i == appIdstoDelete.length) {
                                                                    i = 0;
                                                                    userGroups.find({group: groupData._id}, function(err,usersFromGroups){
                                                                        if(usersFromGroups.length !=0) {
                                                                            usersFromGroups.forEach(function(userData){
                                                                                licenseAssignmentModel.find({userId: userData.userid}).populate('licenseId').exec(function(err1,userLicenses){
                                                                                    appAssignmentModel.find({userId: userData.userid}).populate('appId').exec(function(err,userapps){
                                                                                        appIdstoDelete.forEach(function(appIdtoDelete){
                                                                                            let toUpdateApp = true;
                                                                                            let appExists = false;
                                                                                            userapps.forEach(function(usApp){
                                                                                                if(usApp.appId._id.toString() === appIdtoDelete.toString()) {
                                                                                                    appExists = true;
                                                                                                    if(usApp.status === 'active') {
                                                                                                        toUpdateApp = false;
                                                                                                    }
                                                                                                }
                                                                                            });
                                                                                            console.log('curent loop app', appIdtoDelete);
                                                                                            console.log('canUpdate? ', toUpdateApp);
                                                                                            console.log('appExists? ', appExists);
                                                                                            if(appExists) {
                                                                                                if(toUpdateApp)
                                                                                                    appAssignmentModel.findOneAndUpdate({userId: userData.userid, appId: appIdtoDelete}, {$set: {status: 'active'}}).exec();
                                                                                            }
                                                                                        });
                                                                                        let userAppIds = [];
                                                                                        let licensesofSameService = [];
                                                                                        let userlicenseIds = [];
                                                                                        userLicenses.forEach(function(usLic){
                                                                                            userlicenseIds.push(usLic.licenseId._id);
                                                                                            if(usLic.licenseId.serviceId.toString() === licenseData.serviceId.toString()) {
                                                                                                licensesofSameService.push(usLic);
                                                                                            }
                                                                                        });
                                                                                        userapps.forEach(function(app){
                                                                                            userAppIds.push(app.appId._id);
                                                                                        });
                                                                                        if(licensesofSameService.length === 0)
                                                                                            console.log('No license found for user: ', userData.userid);
                                                                                        else if(licensesofSameService.length === 1 ) {
                                                                                            if(licensesofSameService[0].status !=='active')
                                                                                                licenseAssignmentModel.findOneAndUpdate({_id: licensesofSameService[0]._id}, {$set: {status:'active'}}).exec();
                                                                                        } else {
                                                                                            let toUpdate = licensesofSameService[0];
                                                                                            licensesofSameService.shift();
                                                                                            licensesofSameService.forEach(function(usLic){
                                                                                                if(usLic.licenseId.price > toUpdate.licenseId.price)
                                                                                                    toUpdate = usLic;
                                                                                            });
                                                                                            licenseAssignmentModel.findOneAndUpdate({_id: toUpdate._id}, {$set: {status:'active'}}).exec();
                                                                                        }
                                                                                        appLicense.find({licenseId: {$in: userlicenseIds}}, function(err,myapps){
                                                                                            appLicense.find({appId: {$in: userAppIds}}, function(err,myappsLic){
                                                                                                ////
                                                                                                let mynewApps = [];
                                                                                                myapps.forEach(function(a){
                                                                                                    mynewApps.push(a.appId.toString());
                                                                                                });
                                                                                                let apptoDelete = [];
                                                                                                myappsLic.forEach(function(al){
                                                                                                    if(!myLicenses.includes(al.licenseId.toString())){
                                                                                                            apptoDelete.push(al);
                                                                                                    }
                                                                                                });
                                                                                                let deleteApp = [];
                                                                                                apptoDelete.forEach(function(atd){
                                                                                                    if(!mynewApps.includes(atd.appId.toString()))
                                                                                                        deleteApp.push(atd.appId);
                                                                                                });
                                                                                                appIdstoDelete = [];
                                                                                                deleteApp.forEach(function(a){
                                                                                                    let unique = true;
                                                                                                    appIdstoDelete.forEach(function(d){
                                                                                                        if(d.toString() === a.toString())
                                                                                                            unique = false;
                                                                                                    });
                                                                                                    if(unique) appIdstoDelete.push(a);
                                                                                                });
                                                                                                if(appIdstoDelete.length == 0) {
                                                                                                    i++;
                                                                                                    if(i === usersFromGroups.length)
                                                                                                        res.json({licenseStatus: licenseStatus, appStatus: appStatus});
                                                                                                }
                                                                                                else {
                                                                                                    let j = 0;
                                                                                                    appIdstoDelete.forEach(function(appDel){
                                                                                                        appAssignmentModel.findOne({userId: userData.userid, appId: appDel, groupId: null}, function(err,appCheck){
                                                                                                            console.log(appCheck);
                                                                                                            if(appCheck) {
                                                                                                                appAssignmentModel.findOneAndRemove({userId: userData.userid, appId: appDel, groupId: null}).exec();
                                                                                                                if(appCheck.status ==='active')
                                                                                                                    appAssignmentModel.findOneAndUpdate({userid: userData.userid, appId: appDel}, {$set: {status: 'active'}}).exec();
                                                                                                            }
                                                                                                            j++;
                                                                                                            if(j == appIdstoDelete.length)
                                                                                                                i++;
                                                                                                            if(i === usersFromGroups.length)
                                                                                                                res.json({licenseStatus: licenseStatus, appStatus: appStatus});
                                                                                                        });
                                                                                                    });
                                                                                                }
                                                                                            });
                                                                                        });
                                                                                    });
                                                                                });
                                                                            });
                                                                        } else {
                                                                                res.json({licenseStatus: licenseStatus, appStatus: appStatus,usersFound: null});
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        });
                                                    }
                                                });
                                            });
                                        }); 
                                    });
                                });
                            } else {
                                res.json({error: 'License Not Found for a group'});
                            }
                        });
                    } else {
                        res.json({error: 'Group Not Found'});
                    }
                } else {
                    res.json({error: 'License Not Found'});  
                }
            });
        });
    },
    suspendUsersFromGroup: function(req,res){
        var groupId = new mongoose.Types.ObjectId(req.params.groupid);
        if(req.user.isAzure) {
            graphApi.suspendUsers(req.user,groupId,res);
        }
        else {
            var i = 0;
            groupsModel.findOne({_id: groupId}, function(er,groupCheck){
                if(groupCheck) {
                    googleApis.getGoogleService(req.user).then(service=>{
                        userGroups.find({group: groupId}, function(err,userFromGroups){
                            if(err) res.json({error: err});
                            if(userFromGroups.length != 0) {
                                
                                userFromGroups.forEach(function(user){
                                    User.findOne({_id: user.userid}, function(err,userData){
                                        service.users.patch({userKey: userData.userID,requestBody: { suspended: true}}, (err3,data) => {
                                            if(err3)
                                                res.json(err3);
                                            else {
                                                User.findOneAndUpdate({_id: user.userid},{$set: {
                                                    status: 'pendingSuspension'
                                                }}).exec();
                                                i++;
                                                if(i === userFromGroups.length) {
                                                    res.json({success: true})
                                                }
                                            }
                                        });
                                    });
                                });
                            } else {
                                res.json({message: 'A group does not have active members'});
                            }
                        });
                    });
                } else {
                    res.json({error: 'Group Not Found'});
                }
            });
        }
    },
    addAppToGroup: function(req,res){
        var groupId = new mongoose.Types.ObjectId(req.params.groupid);
        var appid = new mongoose.Types.ObjectId(req.params.appid);
        var i = 0;
        groupsModel.findOne({_id: groupId}, function(er, groupCheck){
            appModel.findOne({_id: appid}, function(er1,appCheck){
                if(appCheck) {
                    if(groupCheck) {
                        appAssignmentModel.find({groupId: groupId, appId: appid, userId: null}, function(er,checkApp){
                            if(checkApp.length != 0) {
                                res.json({message: 'App Already Assigned'});
                            } else {
                                userGroups.find({group: groupId}, function(err, userData){
                                    var appsAssigned = [];
                                    if(userData.length != 0) {
                                        userData.forEach(function(users){
                                            appAssignmentModel.find({userId: users.userid}).select('appId').exec(function(err,apps){
                                                var appsUsers = [];
                                                var userApps = [];
                                                licenseAssignmentModel.find({userId: users.userid})
                                                .populate('licenseId')
                                                .select('licenseId')
                                                .exec(function(err,data) {
                                                    if(err)
                                                        res.json({error:err});
                                                    else if(data.length != 0) {
                                                        var j = 0;
                                                        var licenses = data;
                                                        licenses.forEach(function(license) {
                                                            appLicense.find({licenseId: license.licenseId}).populate('appId').exec(function(err2,app){
                                                                if(err2)
                                                                    throw err2;
                                                                else if(app) {
                                                                        app.forEach(function(a){
                                                                            appsUsers.push(a.appId._id.toString());
                                                                        });
                                                                }
                                                                j++;
                                                                if(j === licenses.length) {
                                                                    console.log(appsUsers);
                                                                    console.log(appid);
                                                                    if(appsUsers.includes(appid.toString())) {
                                                                        appAssignmentModel.findOne({userId: users.userid,appId: appid}, function(err3,app){
                                                                            console.log('userappp', app);
                                                                            let appAssigned = new appAssignmentModel();
                                                                            appAssigned.userId = users.userid;
                                                                            appAssigned.groupId = groupId;
                                                                            appAssigned.appId = appid;
                                                                            if(app === null)
                                                                                appAssigned.status = 'active';
                                                                            else
                                                                                appAssigned.status = 'inactive'
                                                                            appAssigned.save();
                                                                            appsAssigned.push(users.userid);
                                                                            i++;
                                                                            console.log(i);
                                                                            if(i === userData.length) {
                                                                                console.log('checkapp ', checkApp.length);
                                                                                if(checkApp.length == 0) {
                                                                                    let newApp = new appAssignmentModel();
                                                                                    newApp.groupId = groupId;
                                                                                    newApp.appId = appid;
                                                                                    newApp.status = 'active';
                                                                                    newApp.save();
                                                                                }
                                                                                res.json({appsAssignedtoMembers: appsAssigned});
                                                                            }
                                                                        }); 
                                                                    } else {
                                                                        console.log('hello')
                                                                        i++;
                                                                        if(i === userData.length)
                                                                            res.json({message: 'App Not Assigned to Group Since no license present' });
                                                                    }
                                                                }
                                                            });
                                                        });
                                                    }
                                                });
                                            });
                                            
                                        });
                                    } else {
                                        appAssignmentModel.findOne({groupId: groupId, appId: appid, userId: null}).select('appId').exec(function(err,apps){
                                            if(apps) {
                                                res.json({message: 'A group does not have active members', status: 'App Already assigned to a group'});
                                            }
                                            else {
                                                licenseAssignmentModel.find({groupId: groupId}, function(err,groupLicenses){
                                                    if(groupLicenses.length == 0) {
                                                        console.log('grouplice 0');
                                                        res.json({message: 'Cant add the application, Required license that enables the app not found'});
                                                    } else {
                                                        licenseIds = [];
                                                        groupLicenses.forEach(function(grLic){
                                                            licenseIds.push(grLic.licenseId);
                                                        });
                                                        appLicense.find({licenseId: {$in: licenseIds}}, function(err,appLicenses){
                                                            appId = [];
                                                            let canAdd = false;
                                                            appLicenses.forEach(function(appLic){
                                                                if(appLic.appId.toString() === appid.toString())
                                                                    canAdd = true;
                                                            });
                                                            if(canAdd) {
                                                                let appAssigned = appAssignmentModel();
                                                                appAssigned.groupId = groupId;
                                                                appAssigned.appId = appid;
                                                                appAssigned.status = 'active';
                                                                appAssigned.save();
                                                                res.json({message: 'A group does not have active members', status: 'App Assigned'});
                                                            } else {
                                                                res.json({message: 'Cant add the application, Required license that enables the app not found'});
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    } else {
                        res.json({error: 'Group Not Found'});
                    }
                } else {
                    res.json({error: 'App Not Found'});
                }
            });
        });
        
    },
    removeAppFromGroup: function(req,res){
        var groupId = new mongoose.Types.ObjectId(req.params.groupid);
        var appid = new mongoose.Types.ObjectId(req.params.appid);
        groupsModel.findOne({_id: groupId}, function(er, groupCheck){
            appModel.findOne({_id: appid}, function(er1,appCheck){
                appAssignmentModel.findOne({groupId: groupId, appId: appid, userId: null}, function(err,appDeleteTest){
                    if(appCheck) {
                        if(groupCheck) {
                            if(appDeleteTest) {
                                userGroups.find({group: groupId}, function(err,usersFromGroup){
                                    let i = 0;
                                    if(usersFromGroup.length != 0) {
                                            usersFromGroup.forEach(function(user) {
                                                appAssignmentModel.findOne({appId: appid, groupId: groupId, userId: user.userid}, function(err,groupApp){
                                                    appAssignmentModel.find({appId: appid, userId: user.userid}, function(err4,userApps){
                                                        let filtered = userApps.filter(function(usApp){return usApp._id.toString() != groupApp._id.toString()});
                                                        appAssignmentModel.findOneAndRemove({appId: appid, groupId: groupId, userId: user.userid}).exec();
                                                        if(groupApp.status === 'active') {
                                                            if(filtered.length != 0)
                                                                appAssignmentModel.findOneAndUpdate({_id: filtered[0]._id}, {$set: {status: 'active'}}).exec();
                                                        }
                                                        i++;
                                                        if(i === usersFromGroup.length) {
                                                            appAssignmentModel.findOneAndRemove({appId: appid, groupId: groupId, userId: null}).exec();
                                                            res.json({success: 'App Succesfully Deleted'});
                                                        }
                                                    });
                                                    
                                                });
                                            });
                                        } else {
                                            appAssignmentModel.findOneAndRemove({appId: appid, groupId: groupId,userId: null}).exec();
                                            res.json({message: 'Users not Found for A group, App Deleted'});
                                        }
                                    });
                            } else {
                                res.json({message: 'Application not found that needs to be deleted'});
                            }
                            
                        } else {
                            res.json({error: 'Group Not Found'});
                        }
                    } else {
                        res.json({error: 'App Not Found'});
                    }
                    
                });
                
            });
        });
        
    },
    appsThatCanbeAssigned: function(req,res){
        const groupId = new mongoose.Types.ObjectId(req.params.groupid);
        var appsGroups = [];
        var i = 0;
        groupsModel.findOne({_id: groupId}, function(er,groupCheck){
            if(groupCheck) {
                appAssignmentModel.find({}).exec(function(err,apps){
                    licenseAssignmentModel.find({groupId: groupId, status: 'active',userId: null})
                    .populate('licenseId')
                    .select('licenseId')
                    .exec(function(err,data){
                        console.log(data);
                        if(err)
                            res.json({error:err});
                        else if(data.length != 0){
                            var licenses = data;
                            licenses.forEach(function(license) {
                                appLicense.find({licenseId: license.licenseId._id}).populate('appId').exec(function(err2,app){
                                    console.log(app.length)
                                    if(err2)
                                        throw err2;
                                    else if(app) {
                                            app.forEach(function(a){
                                                if(apps.length != 0) {
                                                    userApps = apps.map(function(item) {
                                                        if(item.groupId) {
                                                            console.log('hello');
                                                            return item.appId._id.toString();
                                                        }
                                                    });
                                                    if(!userApps.includes(a.appId._id.toString())) {
                                                        appsGroups.push(a.appId);
                                                    }
                                                } else {
                                                    appsGroups.push(a.appId);
                                                }
                                            });
                                    }
                                    i++;
                                    if(i === licenses.length) {
                                        let groupApps = [];
                                        appsGroups.forEach(function(itm){
                                            let unique = true;
                                            groupApps.forEach(function(itm2) {
                                                if (itm2._id.toString() === itm._id.toString()) unique = false;
                                            });
                                            if(unique) groupApps.push(itm);
                                        })
                                        
                                        res.json({appsThatCanBeAssigned: groupApps});
                                    }
                                });
                            });
                        }
                        else {
                            res.json({appsThatCanBeAssigned: null});
                        }
                    });
                });
            } else {
                res.json({error: 'Group Not Found'});
            }
        });
        
    },
    getMyApps: function(req,res) {
        groupsModel.findOne({_id: req.params.id}, function(er,groupCheck){
            if(groupCheck) {
                appAssignmentModel.find({groupId: req.params.id, userId: null}).populate('appId').exec(function(err,apps){
                    uniqueapps = [];
                    let assignedApps = [];
                    apps.forEach(function(itm) {
                        let unique = true;
                        uniqueapps.forEach(function(itm2){
                            if(!itm2.appId._id.toString().includes(itm2.appId._id.toString())){
                                unique = false;
                            }
                        })
                        if(unique) {uniqueapps.push(itm); assignedApps.push(itm.appId)}
                    });
                    
                    res.json({myapps: assignedApps});
                });
            } else {
                res.json({error: 'Group Not Found'});
            }
        });
    },
    getMyMembers: function(req,res) {
        var groupId = new mongoose.Types.ObjectId(req.params.id);
        groupsModel.find({group: groupId}).exec(function(er,groupData){
            if(groupData) {
                userGroups.find({group: groupId}).populate('userid').exec(function(err,users){
                    if(users.length != 0) {
                        var groupMembers = [];
                        var i = 0;
                        users.forEach(function(us) {
                            groupMembers.push(us.userid);
                            i++;
                            if(i == users.length) {
                                res.json({Users: groupMembers});
                            }
                        });
                    } else {
                        res.json({Message: 'No Members Found For a Group'});
                    }
                });
            } else
                res.json({Error: 'No Group Found'});
        });
    },
    getMyLicenses: function(req,res) {
        licenseAssignmentModel.find({groupId: req.params.id, userId: null}).populate('licenseId').exec(function(err,data){
            if(err)
                res.json(err);
            else
                res.json(data);
        });
    }
};
