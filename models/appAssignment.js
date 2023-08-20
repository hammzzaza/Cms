var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const appAssignmentModel = new Schema({
    appId: { type: Schema.Types.ObjectId, ref: 'apps'},
    userId: {type: Schema.Types.ObjectId, ref: 'user'},
    groupId: { type: Schema.Types.ObjectId, ref: 'group'},
    status: {type: Schema.Types.String}
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('appAssignment', appAssignmentModel, 'appAssignment');
