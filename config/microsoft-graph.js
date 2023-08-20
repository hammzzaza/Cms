const graph = require('@microsoft/microsoft-graph-client');
const connectAccount = require('../models/connectAccount');
const userModel = require('../models/user');
const groupModel = require('../models/groups');
const userGroups = require('../models/userGroup');
const licenseAssignmentModel = require('../models/licenseAssignment');
const appAssignmentModel = require('../models/appAssignment');
const request = require('request');
const appLicense = require('../models/appLicense');
const mongoose = require('mongoose');
module.exports = {
  getAccessToken: async function(user) {
    try {
      let account = await connectAccount.findOne({accountID: user.accountID}).exec();
      if (account) {
        let options = {
          url: Process.env.graphTokenUrl,
          form:    {  client_id: process.env.OAUTH_APP_ID,
                      client_secret:  process.env.OAUTH_APP_PASSWORD,
                      resource: Process.env.graphResourceURL,
                      grant_type: REFRESH_TOKEN,
                      refresh_token: account.token },
          json: true
        };
        let response = await asyncRequest(options);
        const client = getAuthenticatedClient(response.body.access_token);
        return client;
      } else {
        return null;
      }
    } catch (err) {
      return null;
    }
  },
  getUsers: async function(user) {
    const client = await this.getAccessToken(user);
    return (await client.api('/users').get());
  },
  addUser: async function(user,body,res) {
    const client = await this.getAccessToken(user);
    client.api('/users').post(body, (err,response) => {
      if(err){
        res.json({success: err});
      }
      else {
        console.log(response);
        var newUser = new userModel();
        newUser.accountID = user.accountID;
        newUser.userID = response.id;
        newUser.firstname = response.givenName;
        newUser.lastname = response.surname;
        newUser.email = response.userPrincipalName;
        newUser.status = 'Active';
        newUser.accountRole = 'user';
        newUser.isAzure = true;
        newUser.save();
        res.json({success: true});
      }
    })
  },
  updateUser: async function(user,body,id,res) {
    const client = await this.getAccessToken(user);
    const user = await userModel.findOne({_id: id}).exec();
    if (user) {
      const url = '/users/' + user.userID;
      client.api(url).version('beta').patch(body, (err,response) => {
        if(err) {
          console.log('helllllooooo');
          console.log (err);
          res.json({success: false});
        }
        else{
          userModel.findOneAndUpdate({_id: id}, {$set:{
            firstname: body.givenName,
            lastname: body.surname,
  
          }}).exec();
          res.json({success: true});
        }
      });
    } else {
      res.json({error: 'Invalid User ID given'});
    }
  },
  deleteUser: async function(user,id,res) {
    const client = await this.getAccessToken(user);
    const user = await userModel.findOne({_id: id}).exec();
    if (user ){
      const url = '/users/' + user.userID;
      client.api(url).delete((err,response) => {
        if(err) {
          console.log('helllllooooo');
          console.log (err);
          res.json({success: false});
        }
        else {
          userModel.findOneAndUpdate({_id: id}, {$set:{
            status: 'pendingDeletion'
          }}).exec();
          res.json({success: true});
        }
      });
    } else {
      res.json({error: 'Invalid User ID given'});
    }
    
  },
  suspendUser: async function(user,id,body,res) {
    const client = await this.getAccessToken(user);
    const user = await userModel.findOne({_id: id}).exec();
    if(user ) {
      const url = '/users/' + user.userID;
      client.api(url).version('beta').patch(body, (err,response) => {
        if(err) {
          console.log('helllllooooo');
          console.log (err);
          res.json({success: false});
        }
        else{
          userModel.findOneAndUpdate({userID: id}, {$set:{
            status: 'pendingSuspension'
          }}).exec();
          res.json({success: true});
        }
      });
    } else {
      res.json({error: 'Invalid User ID given'});
    }
    
  },
  resetPassword: async function(user,id,body,res) {
    const client = await this.getAccessToken(user);
    const user = await userModel.findOne({_id: id}).exec();
    if (user) {
      const url = '/users/' + user.userID;
      client.api(url).version('beta').patch(body, (err,response) => {
        if(err) {
          console.log('helllllooooo');
          console.log (err);
          res.json({success: false});
        }
        else{
          res.json({success: true})
        }
      });
    } else {
      res.json({error: 'Invalid User ID given'});
    }
  },
  /////////////////////////////////////////////
  ////////////////////group////////////////////
  /////////////////////////////////////////////
  getGroups: async function(user) {
    const client = await this.getAccessToken(user);
    const groups = await client.api('/groups').get();
    return groups;
  },
  addGroup: async function(user, body, res) {
    const client = await this.getAccessToken(user);
    client.api('/groups').post({
      "displayName": body.name,
      "description": body.description,
      "mailEnabled": false,
      "mailNickname": (body.name).replace(/\s/g, ''),
      "securityEnabled": true}, (err,response) => {
      if(err){
        res.json({success: err});
      }
      else {
        console.log(response);
        group = new groupModel();
        group.id = response.id;
        group.accountID = new mongoose.Types.ObjectId(user.accountID);
        group.email = body.email;
        group.name = body.name;
        group.description = body.description;
        group.save();
        res.json({success: true});
      }
    });
  },
  updateGroup: async function(user,body,id,res) {
    const client = await this.getAccessToken(user);
    const group = await groupModel.findOne({_id: id}).exec();
    if(group) {
      const url = '/groups/' + group.id;
      client.api(url).update({
        displayName: body.name,
        description: body.description
      }, (err,response) => {
        if(err) {
          console.log (err);
          res.json({success: false});
        }
        else{
          groupModel.findOneAndUpdate({_id: id}, {$set:{
            name: body.name,
            description: body.description,
            email: body.email
          }}).exec();
          res.json({success: true});
        }
      });
    } else {
      res.json({error: 'Invalid group ID given'});
    }
    
  },
  deleteGroup: async function(user,id,res) {
    const client = await this.getAccessToken(user);
    const groupData = await groupModel.findOne({_id: id}).exec();
    console.log(groupData._id);
    if(groupData){
      const url = '/groups/' + groupData.id;
      client.api(url).delete((err,response) => {
        if(err) {
          console.log (err);
          res.json({success: false});
        }
        else{
          var i = 0;
          licenseAssignmentModel.find({groupId: groupData._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err1,groupActiveLicenses){
            userGroups.find({group: groupData._id}, function(err, usersFromGroup){  
              licenseAssignmentModel.deleteMany({groupId: groupData._id}).exec();
              groupModel.findOneAndRemove({_id: groupData._id}).exec();
              appAssignmentModel.deleteMany({groupId: groupData._id, userId: null}).exec();
              userGroups.deleteMany({group: groupData._id}).exec();
              if(groupActiveLicenses.length != 0) {
                if(usersFromGroup.length != 0) {
                    usersFromGroup.forEach(function(userData){
                      appAssignmentModel.find({userId: userData.userid, groupId: groupData._id, status: 'active'}, function(err,groupApps){
                        appAssignmentModel.deleteMany({groupId: groupData._id, userId: userData.userid}, function(appErr,deletedApps){
                          if(appErr)
                            res.json({error: appError});
                          else {
                            appAssignmentModel.find({userId: userData.userid}).populate('appId').exec(function(err1,userApps){
                              let userAppIds = [];
                              userApps.forEach(function(usApp){
                                  userAppIds.push(usApp.appId._id.toString());
                              });
                              console.log(userAppIds);
                              groupApps.forEach(function(grApp){
                                  if(userAppIds.includes(grApp.appId.toString()))
                                      appAssignmentModel.findOneAndUpdate({userId: userData.userid, appId: grApp.appId}, {$set: {status : 'active'}}).exec();
                              });
                              licenseAssignmentModel.find({userId: userData.userid}).populate('licenseId').exec(function(err2,userLicenses){
                                groupActiveLicenses.forEach(function(grLic) {
                                  let sameSerUserLic = [];
                                  userLicenses.forEach(function(usLic){
                                      if(grLic.licenseId.serviceId.toString() === usLic.licenseId.serviceId.toString())
                                          sameSerUserLic.push(usLic);
                                  });
                                  console.log(sameSerUserLic);
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
                                          console.log('licensetoUpdate', updateLic._id, 'licenseId ', updateLic.licenseId._id);
                                          licenseAssignmentModel.findOneAndUpdate({_id: updateLic._id}, {$set: {status:'active'}}).exec();
                                      }
                                  }
                                  i++;
                                  if(i === usersFromGroup.length)
                                      res.json({success: true});
                                });
                              });
                            });
                          }
                        });
                        
                      });
                    });
                } else {
                    licenseAssignmentModel.deleteMany({groupId: groupData._id}).exec();
                    appAssignmentModel.deleteMany({groupId: groupData._id}).exec();
                    res.json({success: true, message: 'No Group Members Found'});
                }
              } else {
                res.json({success: true, message: 'No licenses found to be deleted'});
              }
            });
          });
        }
      });
    } else {
      res.json({error: 'Invalid group ID given'});
    }
  },
  addUserToGroup : async function(user,userid,groupid,res) {
    const client = await this.getAccessToken(user);
    const groupData = await groupModel.findOne({_id: groupid}).exec();
    const userData = await userModel.findOne({_id: userid}).exec();
    if(groupData) {
      if(userData) {
          const url = '/groups/' + groupData.id + '/members/$ref';
          client.api(url).post({ "@odata.id": "https://graph.microsoft.com/v1.0/directoryObjects/" + userData.userID }, (err,response) => {
              if(err)
                res.json({status: false,message: 'wrong api call'});
              else {
                let userLicensesthatAssigned = [];
                licenseAssignmentModel.find({groupId: groupData._id, userId: null}).populate('licenseId').exec(function(err3,groupLicenses){
                  licenseAssignmentModel.find({userId: userData._id, status: 'active'}).populate('licenseId').exec(function(er,useractiveLicenses){
                    appAssignmentModel.find({userId: userData._id}, function(er4,userApps){
                        appAssignmentModel.find({groupId: groupData._id, userId: null}).populate('appId').exec(function(err4,groupApps){
                          let userAppIds = [];
                          userApps.forEach(function(usApp){
                            userAppIds.push(usApp.appId.toString());
                          });
                          let xyz = [];
                          groupApps.forEach(function(grApp){
                            xyz.push(grApp.appId._id.toString())
                          })
                          console.log(userAppIds);
                          console.log('////////////////////');
                          console.log(xyz);
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
                          let userAppsAssigned = [];
                          groupApps.forEach(function(grApp){
                              let appAssign = new appAssignmentModel();
                              appAssign.groupId = groupData._id;
                              appAssign.userId = userData._id;
                              appAssign.status = 'active';
                              if(userAppIds.includes(grApp.appId._id.toString())) {
                                appAssign.status = 'inactive';
                              }
                              appAssign.appId = grApp.appId._id;
                              appAssign.save();
                              userAppsAssigned.push(appAssign);
                          });
                          res.json({LicensesAssigned: userLicensesthatAssigned, AppsAssigned: userAppsAssigned});
                      });
                    });
                  });
                });
            }
        });
      } else {
        res.json({error: 'Invalid User ID provided'});
      }
    } else {
      res.json({error: 'Invalid group ID provided'});
    }
  },
  deleteUserFromGroup : async function(user,userid,groupid,res) {
    const client = await this.getAccessToken(user);
    const groupData = await groupModel.findOne({_id: groupid}).exec();
    const userData = await userModel.findOne({_id: userid}).exec();
    if(groupData){
      if(userData){
          const url = '/groups/' + groupData.id + '/members/' + userData.userID + '/$ref';
          client.api(url).delete((err,response) => {
            if(err)
              res.json({status: false});
            else {
              var i = 0;
              licenseAssignmentModel.find({groupId: groupData._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err1,groupActiveLicenses){
                appAssignmentModel.find({groupId: groupData._id, userId: userData._id, status: 'active'}, function(err, groupApps){
                appAssignmentModel.deleteMany({groupId: groupData._id,userId: userData._id}).exec();
                userGroups.findOneAndDelete({group: groupData._id,userid: userData._id}).exec();
                licenseAssignmentModel.deleteMany({groupId: groupData._id,userId: userData._id}).exec();
                  appAssignmentModel.find({userId: userData._id}).populate('appId').exec(function(err,userApps){
                    licenseAssignmentModel.find({userId: userData._id}).populate('licenseId').exec(function(err2,userLicenses){
                        let userAppIds = [];
                        userApps.forEach(function(usApp){
                            userAppIds.push(usApp.appId._id.toString());
                        });
                        console.log(userAppIds);
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
                                                appAssignmentModel.findOne({userId: userData._id, appId: appDel,groupId: null}, function(err,appCheck){
                                                  appAssignmentModel.find({userId: userData._id}, function(err,appToDelete){
                                                    console.log(appCheck);
                                                    if(appCheck) {
                                                        appAssignmentModel.findOneAndRemove({userId: userData._id, appId: appDel, groupId: null}).exec();
                                                        let filtered = appToDelete.filter(function(el){ return el.appId.toString() != appCheck._id });
                                                    }
                                                    j++;
                                                    if(j == appIdstoDelete.length)
                                                        res.json({success: true});
                                                  });
                                                    
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
      } else {
        res.json({error: 'Invalid User ID given'});
      }
    }
    else {
      res.json({error: 'Invalid group ID given'});
    }
  },
  getUserGroups: async function(user,res) {
    const client = await this.getAccessToken(user);
    const groups = await groupModel.find({accountID: user.accountID}).exec();
    var i = 0;
    var j = 0;
    if (groups.length != 0) {
      groups.forEach(function(group){
        licenseAssignmentModel.find({groupId: group._id, userId: null, status: 'active'}).populate('licenseId').exec(function(err,groupActiveLicenses){
          licenseAssignmentModel.find({groupId: group._id, userId: null}).populate('licenseId').exec(function(err,groupLicenses){
              appAssignmentModel.find({groupId: group._id, userId: null}, function(err1,groupApps){
                let url = '/groups/' + group.id + '/members';
                client.api(url).get(function(err,data){
                  console.log(data.value);
                  if(data.value.length != 0) {
                    console.log('length not 0');
                    let members = data.value;
                    let memberIds = [];
                    members.forEach(function(member) {
                      memberIds.push(member.id.toString());
                      userModel.findOne({userID: member.id}, function(err,userData){
                          licenseAssignmentModel.find({userId: userData._id, status: 'active'}).populate('licenseId').exec(function(err,useractiveLicenses){
                            appAssignmentModel.find({userId: userData._id}, function(err2,userApps) {
                              userGroups.find({group: group._id, userid: userData._id}, function(err3,usergroup){
                                  if(err3)
                                      res.json(err3);
                                  else if (usergroup.length == 0 ){
                                      console.log('add');
                                      let userAppIds = [];
                                      userApps.forEach(function(usApp){
                                          userAppIds.push(usApp.appId.toString());
                                      });
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
                                                      appAssignmentModel.deleteMany({userId: userGroup.userid._id, groupId: group._id}, function(errApp, deletedApps){
                                                        licenseAssignmentModel.find({userId: userGroup.userid._id}).populate('licenseId').exec(function(err,userLicenses){
                                                          appAssignmentModel.find({userId: userGroup.userid._id}, function(err, userApps){
                                                              let userAppIds = [];
                                                              userApps.forEach(function(usApp){
                                                                userAppIds.push(usApp.appId.toString());
                                                              });
                                                              groupApps.forEach(function(grApp) {
                                                                if(userAppIds.includes(grApp.appId.toString()))
                                                                  if(grApp.status === 'active')
                                                                    appAssignmentModel.findOneAndUpdate({userId:userGroup.userid._id, appId: grApp.appId}, {$set: {status: 'active'}}).exec();
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
                                                  }
                                                  else {
                                                      i++;
                                                      // console.log('/////////')
                                                      // console.log(i);
                                                      console.log(groupUsers.length);
                                                      if(i === groupUsers.length){
                                                          j++;
                                                      }
                                                      // console.log('j ', j);
                                                      // console.log(groups.length);
                                                      if(j == groups.length){
                                                          res.json({success: true});
                                                      }
                                                  }
                                              });
                                          } else {
                                              console.log('no members found');
                                              j++;
                                              if(j == groups.length)
                                                  res.json({success: true});

                                          }
                                      });
                                      //memberIds
                                      //j++; increment after deleted; // if i == userGroups.length
                                  }
                                  // if(j == groups.length){
                                  //     res.json({success: true});
                                  // }
                              });
                            });
                          });
                      });
                  });
                  } else {
                    console.log('groupmembers0');
                    userGroups.find({group: group._id}).populate('userid').exec(function(err,groupUsers){
                      if(groupUsers.length !== 0 ) {
                        var yz = 0;
                        groupUsers.forEach(function(userGroup){
                          userGroups.findOneAndRemove({userid: userGroup.userid._id, group: group._id}).exec();
                          licenseAssignmentModel.deleteMany({userId: userGroup.userid._id, groupId: group._id}).exec();
                          licenseAssignmentModel.find({userId: userGroup.userid._id}).populate('licenseId').exec(function(err,userLicenses){
                            appAssignmentModel.deleteMany({userId: userGroup.userid._id, groupId: group._id}, function(errApp, deletedApps) {
                              appAssignmentModel.find({userId: userGroup.userid._id}, function(err, userApps){
                                  if(groupActiveLicenses.length != 0) {
                                      let userAppIds = [];
                                      userApps.forEach(function(usApp){
                                        userAppIds.push(usApp.appId.toString());
                                      });
                                      groupApps.forEach(function(grApp) {
                                        if(userAppIds.includes(grApp.appId.toString()))
                                          if(grApp.status === 'active')
                                            appAssignmentModel.findOneAndUpdate({userId:userGroup.userid._id, appId: grApp.appId}, {$set: {status: 'active'}}).exec();
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
      res.json({error: 'No groups found for an account'});
    }
  },
  suspendUsers: async function(user,groupid,res) {
    const client = await this.getAccessToken(user);
    const users  = userGroups.find({group: groupid}).exec();
    if (users.length != 0) {
      var i = 0;
      users.forEach(function(userData){
        userModel.findOne({_id: userData.userid}, function(err,user){
          let url = '/users/' + user.userID;
          client.api(url).version('beta').patch({accountEnabled: false}, (err,response) => {
            if(err) {
              console.log (err);
              throw err;
            }
            else {
              userModel.findOneAndUpdate({userID: user.userID}, {$set:{
                status: 'pendingSuspension'
              }}).exec();
              i++;
              if(i === users.length) {
                res.json({success: true});
              }
            }
          });
        });
        
      });
    } else {
      res.json({error: 'No users found for a group'});
    }
    
  },
  suspendAccount: async function(user,users,res) {
    const client = await this.getAccessToken(user);
    var i = 0;
    users.forEach(function(user){
      let url = '/users/' + user.userID;
      client.api(url).version('beta').patch({accountEnabled: false}, (err,response) => {
        if(err) {
          console.log (err);
          throw err;
        }
        else {
          i++;
          if(i === users.length) {
            usersModel.update({accountID:user.accountID}, { status: 'pendingSuspension' }, { multi: true }, function(err6, rer) {
              if (err6) 
                  throw err;
              else
                  res.json(rer);
          });
          }
        }
      });
    });
  },
  deleteAccount: async function(user,users,res) {
    const client = await this.getAccessToken(user);
    var i = 0;
    users.forEach(function(user){
      let url = '/users/' + user.userID;
      client.api(url).version('beta').delete((err,response) => {
        if(err) {
          console.log (err);
          throw err;
        }
        else {
          i++;
          if(i === users.length) {
            usersModel.update({accountID:user.accountID}, { status: 'pendingDeletion' }, { multi: true }, function(err6, rer) {
              if (err6) 
                  throw err;
              else
                  res.json(rer);
          });
          }
        }
      });
    });
  }
};

function getAuthenticatedClient(accessToken) {
  // Initialize Graph client
  const client = graph.Client.init({
    // Use the provided access token to authenticate
    // requests
    authProvider: (done) => {
      done(null, accessToken);
    }
  });

  return client;
}
async function asyncRequest(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => resolve({ error, response, body }));
  });
}