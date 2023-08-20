var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const licenseAssignmentModel = new Schema({
    licenseId: { type: Schema.Types.ObjectId, ref: 'license'},
    groupId: { type: Schema.Types.ObjectId, ref: 'group'},
    userId: {type: Schema.Types.ObjectId, ref: 'user'},
    status: {type: Schema.Types.String}
},
{
    timestamps: false,
    versionKey: false
});
module.exports = mongoose.model('licenseAssignment', licenseAssignmentModel, 'licenseAssignment');
