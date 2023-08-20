var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userModel = new Schema({
    userID: {type: Schema.Types.String, unique: true},
    accountID: {type:Schema.Types.ObjectId, ref: 'accounts'},
    firstname: { type: Schema.Types.String},
    lastname: { type: Schema.Types.String},
    email: { type: Schema.Types.String, required:true},
    displayName: { type: Schema.Types.String},
    role: { type: Schema.Types.String},
    password: { type: Schema.Types.String},
    domain: {type: Schema.Types.String},
    accountRole: {type:Schema.Types.String},
    status: {type: Schema.Types.String},
    password: {type: Schema.Types.String},
    isAzure: {type: Schema.Types.Boolean}
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('user', userModel, 'users');
