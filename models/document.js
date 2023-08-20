var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const documentModel = new Schema({
    title: {type: Schema.Types.String},
    description: {type: Schema.Types.String},
    url: { type: Schema.Types.String},
    iconUrl: { type: Schema.Types.String},
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('documents', documentModel, 'documents');
