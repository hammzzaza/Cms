var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const tags = new Schema({
    title: { type: Schema.Types.String},
    description: { type: Schema.Types.String},
    type: {type: Schema.Types.String},
    iconUrl: {type:Schema.Types.String}
},
{
    timestamps: true,
    versionKey: false
});
module.exports = mongoose.model('tags', tags,'tags');