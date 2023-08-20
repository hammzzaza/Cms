var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const appLicense = new Schema({
    appId: {type: Schema.Types.ObjectId, ref: 'apps'},
    licenseId: { type: Schema.Types.ObjectId, ref: 'license'}
},
{
    timestamps: false,
    versionKey: false
});
module.exports = mongoose.model('appLicense', appLicense,'appLicense');