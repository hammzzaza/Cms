var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const accountsModel = new Schema({
    status: {type: Schema.Types.String},
    domain: {type:Schema.Types.String},
    name: { type: Schema.Types.String, required: true},
    description: { type: Schema.Types.String},
    vatNumber: { type: Schema.Types.String},
    address1: { type: Schema.Types.String},
    address2: { type: Schema.Types.String},
    city: { type: Schema.Types.String},
    zip: {type: Schema.Types.String},
    country: {type: Schema.Types.String},
    serviceAssignment: {type:Schema.Types.ObjectId, ref: 'serviceAssignments'},
    connectAccount: {type:Schema.Types.ObjectId, ref: 'connectAccount'},
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('accounts', accountsModel, 'accounts');
