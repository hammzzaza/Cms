var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const connectAccountModel = new Schema({
    accountID: {type: Schema.Types.ObjectId, ref: 'accounts'},
    domain: {type: Schema.Types.String, required: true},
    token: {type: Schema.Types.String},
    userID: {type: Schema.Types.ObjectId, ref:'User'}
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('connectAccount', connectAccountModel, 'connectAccount');
