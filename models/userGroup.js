var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userGroups = new Schema({
    userid: {type: Schema.Types.ObjectId, ref: 'user'},
    group: { type: Schema.Types.ObjectId, ref: 'group'}
},
{
    timestamps: false,
    versionKey: false
});
module.exports = mongoose.model('userGroups', userGroups,'userGroups');