var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const appsModel = new Schema({
    accountID: {type: Schema.Types.String},
    serviceId: { type: Schema.Types.ObjectId, ref: 'service', required: true},
    name: { type: Schema.Types.String, required: true},
    licenseIds: { type: Schema.Types.ObjectId, ref: 'license'},
    description: {type: Schema.Types.String},
    tags: { type: Schema.Types.ObjectId, ref:'tags' },
    type: { type: Schema.Types.String },
    url: {type: Schema.Types.String},
    signInUrl: {type: Schema.Types.String},
    iconUrl1: {type: Schema.Types.String},
    iconUrl2: {type: Schema.Types.String},
    iconUrl3: {type: Schema.Types.String},
    iconUrl4: {type: Schema.Types.String}
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('apps', appsModel, 'apps');
