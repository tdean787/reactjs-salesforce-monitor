const httpClient = require('request');
const express = require('express');
const jsforce = require('jsforce');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
require("dotenv").config();

// Setup HTTP server
const app = express();
//initialize session
app.use(session({secret: 'S3CRE7', resave: true, saveUninitialized: true}));
//bodyParser
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

//jsForce connection
const oauth2 = new jsforce.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  loginUrl : 'https://login.salesforce.com',
  //clientId and Secret will be provided when you create a new connected app in your SF developer account
  clientId : process.env.CLIENTID,
  clientSecret : process.env.SECRET,
  //redirectUri : 'http://localhost:' + port +'/token'
  redirectUri : 'http://localhost:3030/token'
});

app.get("/auth/login", function(req, res) {
  // Redirect to Salesforce login/authorization page
  res.redirect(oauth2.getAuthorizationUrl({scope: 'api id web refresh_token'}));
});

app.get('/token', function(req, res) {
  const conn = new jsforce.Connection({oauth2: oauth2});
      const code = req.query.code;
      conn.authorize(code, function(err, userInfo) {
          if (err) { return console.error("This error is in the auth callback: " + err); }
  console.log('Access Token: ' + conn.accessToken);
          console.log('Instance URL: ' + conn.instanceUrl);
          console.log('refreshToken: ' + conn.refreshToken);
          console.log('User ID: ' + userInfo.id);
          console.log('Org ID: ' + userInfo.organizationId);
          req.session.accessToken = conn.accessToken;
          req.session.instanceUrl = conn.instanceUrl;
          req.session.refreshToken = conn.refreshToken;
  var string = encodeURIComponent('true');
          // res.redirect('http://localhost:3030/?valid=' + string);
      // })
      res.redirect('/')
  });
})

app.get('/api/accounts', function(req, res) {
  // if auth has not been set, redirect to index
      if (!req.session.accessToken || !req.session.instanceUrl) { res.redirect('/'); }
  //SOQL query
      let q = 'SELECT id, name FROM account LIMIT 10';
  //instantiate connection
      let conn = new jsforce.Connection({
          oauth2 : {oauth2},
          accessToken: req.session.accessToken,
          instanceUrl: req.session.instanceUrl
     });
  //set records array
      let records = [];
      let query = conn.query(q)
         .on("record", function(record) {
           records.push(record);
         })
         .on("end", function() {
           console.log("total in database : " + query.totalSize);
           console.log("total fetched : " + query.totalFetched);
           res.json(records);
         })
         .on("error", function(err) {
           console.error(err);
         })
         .run({ autoFetch : true, maxFetch : 4000 });
  });
  
module.exports = app;
