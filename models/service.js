var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const serviceModel = new Schema({
    name: { type: Schema.Types.String, required: true},
    provider: { type: Schema.Types.ObjectId, ref: 'provider'},
    description: {type: Schema.Types.String},
    tags: [{ type: Schema.Types.ObjectId, ref:'tags'}],
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('service', serviceModel,'services');