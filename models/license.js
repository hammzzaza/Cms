var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const licenseModel = new Schema({
    name: { type: Schema.Types.String, required: true},
    description: { type: Schema.Types.String},
    serviceId: { type: Schema.Types.ObjectId, ref:'service', required: true},
    tags: [{ type: Schema.Types.ObjectId, ref: 'tags'}],
    unit: {type: Schema.Types.String},
    peroid: {type: Schema.Types.String},
    minUsers: {type: Schema.Types.Number},
    maxUsers: {type: Schema.Types.Number},
    price: {type: Schema.Types.Number},
    renewPeriod: {type: Schema.Types.String}
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('license', licenseModel, 'license');
