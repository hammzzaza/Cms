var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var connectAccount = require('../models/connectAccount');
module.exports = {
    getGooglePlusApi: function(auth) {
        return google.plus({ version: 'v1', auth });
    },
    getOAuthClient: function() {
        return new OAuth2(process.env.GOOGLE_ID ,  process.env.GOOGLE_SECRET, process.env.GOOGLE_CALLBACK_SYNC);
    },
    getAuthUrl: function() {
        var oauth2Client = this.getOAuthClient();
        // generate a url that asks permissions for Google+ and Google Calendar scopes
        var scopes = [
            'https://www.googleapis.com/auth/admin.directory.user',
            'https://www.googleapis.com/auth/admin.directory.group',
            'https://www.googleapis.com/auth/admin.directory.domain',
            'https://www.googleapis.com/auth/admin.directory.rolemanagement',
            'https://www.googleapis.com/auth/admin.directory.orgunit',
            'profile',
        ];
    
        var url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes // If you only need one scope you can pass it as string
        });
    
        return url;
    },
    getGoogleService: async function(user) {
        var account = await connectAccount.findOne({accountID: user.accountID}).exec();
        var client = this.getOAuthClient();
        client.setCredentials({
            refresh_token: account.token
        });
        var tokens = await client.refreshAccessToken();
        client.setCredentials(tokens.credentials);
        const service = google.admin({version: 'directory_v1', auth: client});
        return service;
    }
};