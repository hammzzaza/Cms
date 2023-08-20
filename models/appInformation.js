var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const appInformationModel = new Schema({
    appId: {type: Schema.Types.ObjectId, ref: 'apps'},
    accountID: {type: Schema.Types.ObjectId, ref: 'accounts'},
    text1: {type: Schema.Types.String},
    text2: { type: Schema.Types.String},
    contact: { type: Schema.Types.String},
    document1: { type: Schema.Types.ObjectId, ref:'documents'},
    document2: { type: Schema.Types.ObjectId, ref:'documents'},
    document3: { type: Schema.Types.ObjectId, ref:'documents'},
    formUrl: { type: Schema.Types.String},
    documentationUrl: {type: Schema.Types.String},
    faqUrl: {type: Schema.Types.String}
},
{
    timestamps: false,
    versionKey: false
});
module.exports = mongoose.model('appInformation', appInformationModel, 'appInformation');
