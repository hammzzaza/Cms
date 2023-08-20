var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var flash = require('connect-flash');
var mongoose = require('mongoose');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');
require('dotenv').config();
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(flash());
app.use(logger('dev'));
app.use(session({ secret: 'asdlkasdklasjdklajslkdjaksdjlkajsdkj' }));
var configDB = require('./config/mongodb');

mongoose.connect(configDB);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
require('./config/passport')(passport);

app.use(passport.initialize());
app.use(passport.session());
require('./routes/index')(app);
require('./routes/auth')(app,passport);
// require('./routes/connect')(app);
module.exports = app;
