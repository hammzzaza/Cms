var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const groupModel = new Schema({
    id: {type: Schema.Types.String},
    accountID: {type: Schema.Types.ObjectId, ref:'accounts'},
    email: { type: Schema.Types.String},
    description: { type: Schema.Types.String},
    name: { type: Schema.Types.String, required: true}
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('group', groupModel, 'group');
