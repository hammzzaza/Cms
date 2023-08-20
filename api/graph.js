var graph = require('@microsoft/microsoft-graph-client');

module.exports = {
  getUserDetails: async function(accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const user = await client.api('/me').version('beta').get();
    return user;
  },
  getUserDirectory: async function(accessToken) {
    const client = getAuthenticatedClient(accessToken);
    client.api('/me/memberOf').get((err,res)=> {
      if(err)
        console.log(err);
      //console.log(res);
      console.log(res);
      return res;
    });
  },
  getUsers: async function(accessToken){
    const client = getAuthenticatedClient(accessToken);
    client.api('/users').get((err,res) => {
      if(err){
        console.error(err);
        return null;
      }
      console.log(res);
      return res;
    });
  },
  getUserByID: async function(accessToken,userid){
    const client = getAuthenticatedClient(accessToken);
    client.api(`/users/${userid}`).get((err,res) => {
      if(err){
        console.error(err);
        return null;
      }
      return res;
    });
  },
  deleteUserByID: async function(accessToken,userid){
    const client = getAuthenticatedClient(accessToken);
    client.api(`/users/${userid}`).delete((err,res) => {
      if(err){
        console.error(err);
        return null;
      }
      return res;
    });
  },
  updateUserByID: async function(accessToken,userid){
    const client = getAuthenticatedClient(accessToken);
    client.api(`/users/${userid}`).patch((err,res) => {
      if(err){
        console.error(err);
        return null;
      }
      return res;
    });
  },
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