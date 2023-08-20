const accountsController = require('../controllers/accountsController');
const groupController = require('../controllers/groupsController');
const appsController = require('../controllers/appsController');
const usersController = require('../controllers/usersController');
const tagsController = require('../controllers/tagsController');
const licenseController = require('../controllers/licenseController');
const connectController = require('../controllers/connectController');
const serviceController = require('../controllers/serviceController');
const providerController = require('../controllers/providerController');
const documentController = require('../controllers/documentController');
const appAssignmentModel = require('../models/appAssignment');
const userModel = require('../models/user');
module.exports = function(app) {
  app.get('/', function(req, res) {
    if(req.user){
      res.render('index.ejs', { title: req.user.firstname, check: true, user:req.user });
    } else {
    res.render('index.ejs', { title: 'Test App', check: false });
    }
  });
  app.get('/error', function(req,res){
    res.render('error.ejs',{error: req.body.error})
  });
  /////////////connectgoogle//////////
  app.get('/connect-gsuite/authorize', connectController.syncAuthorizeGoogle)
  app.use('/google/syncauth', connectController.syncAuthGoogle)
  
  ///////providerRoutes///////

  app.route('/provider')
    .get(providerController.getProviders)
    .post(providerController.addProvider)
  app.route('/provider/:id')
    .put(providerController.updateProvider)
    .delete(providerController.deleteProvider)  
  ///////accountsRoutes//////
  app.route('/accounts')
    .get(accountsController.getAccounts)
    .post(accountsController.saveAccountsInfo)
  
  app.route('/accounts/:accountid')
    .put(accountsController.suspendAccount)
    .delete(accountsController.deleteAccount)
  app.route('/accounts/:accountid/licenses')
    .get(accountsController.getListOfLicenses)
  app.route('/accounts/:accountid/apps')
    .get(accountsController.getListOfApps)
  app.route('/accounts/:accountid/services')
    .get(accountsController.getMyServices)
  app.route('/accounts/:accountid/mylicensescount')
    .get(accountsController.getMyLicensesCount)
    ////group//////
  app.route('/group')
    .get(groupController.getListOfGroups)
    .post(groupController.addGroup)
  app.route('/group/api')
    .get(groupController.getGroupsFromApi)
  app.route('/groupmembers/api')
    .get(groupController.getGroupMembersFromApi)
  app.route('/group/:id')
    .delete(groupController.deleteGroup)
    .put(groupController.updateGroup)
  app.route('/group/:groupid/user/:userid')
    .post(groupController.addUserToGroup)
    .delete(groupController.deleteUserFromGroup)
  app.route('/group/:groupid/license/:licenseid')
    .put(groupController.addLicenseToGroup)
    .delete(groupController.removeLicenseFromGroup)
  app.route('/group/:groupid/app/:appid')
    .put(groupController.addAppToGroup)
    .delete(groupController.removeAppFromGroup)
  app.route('/group/:groupid/assignapp')
    .get(groupController.appsThatCanbeAssigned)
  app.route('/group/:id/apps')
    .get(groupController.getMyApps)
  app.route('/group/:id/mymembers')
    .get(groupController.getMyMembers)
  app.route('/group/:id/licenses')
    .get(groupController.getMyLicenses)
    ////usersDirectory////

  app.route('/users/api')
    .get(usersController.getUsersFromApi)
  app.route('/users')
    .get(usersController.getListOfUsers)
    .post(usersController.addUser)
  app.route('/users/:id')
    .delete(usersController.deleteUser)
    .put(usersController.updateUser)
  app.route('/users/:userid/app/:appid')
    .post(usersController.assignAppsToUser)
    .delete(usersController.deleteAppsFromUser)
  app.route('/users/:userid/license/:licenseid')
    .post(usersController.assignLicensesToUser)
    .delete(usersController.deleteLicenseFromUser)
  app.route('/users/:id/apps')
    .get(usersController.myAssignedApps)
  app.route('/users/:id/license')
    .get(usersController.myAssignedLicenses)


  app.route('/users/:userid/assignapp')
    .get(usersController.appsThatCanBeAssigned)
  app.route('/users/:id/suspend')
    .put(usersController.suspendUser)
    app.route('/users/:id/reset')
    .put(usersController.resetPassword)

  app.route('/users/:userid/groups')
    .get(usersController.getUserGroups)
  ////apps////
  
  app.route('/apps')
    .get(appsController.getApps)
    .post(appsController.addApp)
  app.route('/apps/:id')
    .put(appsController.updateApp)
    .delete(appsController.deleteApp)
  app.route('/apps/:id/licenses')
    .get(appsController.getLicensesThatEnableApp)
  app.route('/apps/:id/assignments')
    .get(appsController.getMyAssignments)
  app.route('/apps/:id/information')
    .get(appsController.getAppInformation)
    .put(appsController.createAppInformation)
  /////tags/////

  app.route('/tags')
    .get(tagsController.getTags)
    .post(tagsController.addTags)
  app.route('/tags/:id')
    .put(tagsController.updateTag)
    .delete(tagsController.deleteTag)
  
  app.route('/license')
    .get(licenseController.getLicense)
    .post(licenseController.addLicense)
  app.route('/license/:id')
    .put(licenseController.updateLicense)
    .delete(licenseController.deleteLicence)

  app.route('/license/:id/apps')
    .get(licenseController.getAppsThatLicenseEnables)

  app.route('/license/:licenseid/app/:appid')
    .post(licenseController.addAppsInLicense)
    .delete(licenseController.deleteAppsFromLicense)
  app.route('/license/:licenseid/tag/:tagid')
    .post(licenseController.addTagsinLicense)
    .delete(licenseController.removeTagsFromLicense)
    ////////////////serviceee///////////////

  app.route('/service')
    .get(serviceController.getServices)
    .post(serviceController.addService)
  app.route('/service/:id')
    .put(serviceController.updateService)
    .delete(serviceController.deleteService)
  app.route('/service/:serviceid/apps')
    .get(serviceController.findAppsRegisteredtoService)
  app.route('/service/:serviceid/licenses')
    .get(serviceController.findLicensesRegisteredtoService)

  app.route('/documents')
    .get(documentController.getDocs)
    .post(documentController.addDoc)
  app.route('/documents/:id')
    .put(documentController.updateDoc)
    .delete(documentController.deleteDoc)  
  
  app.get('/test', function(req,res){
    userModel.findOne({_id: '5cb593705958ad3460d9bd11'}, function(err,appToDelete){
      res.json(appToDelete);
      // if(appToDelete.status !=='active') {
      //   console.log('hello just delete the app');
      //   appAssignmentModel.findOneAndRemove({_id: req.params.id}).exec();
      // } else {
      //   appAssignmentModel.findOneAndRemove({_id: req.params.id}).exec();
      //   appAssignmentModel.findOneAndUpdate({userId: appToDelete.userId, appId: appToDelete.appId}, {$set: {status: 'active'}}).exec();
      // }
      // res.json(appToDelete);
    });
  });
};