var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const serviceAssignment = new Schema({
    serviceId: {type: Schema.Types.ObjectId, ref: 'service'},
    accountID: {type:Schema.Types.ObjectId, ref: 'accounts', required: true},
    status: { type: Schema.Types.String},
    tenantId: {type: Schema.Types.String}
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('serviceAssignment', serviceAssignment, 'serviceAssignment');
