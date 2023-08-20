var mongoose = require('mongoose');
const Schema = mongoose.Schema;
const provider = new Schema({
    name: {type: Schema.Types.String},
},
{
    timestamps: false,
    versionKey: false
});
module.exports = mongoose.model('provider', provider,'provider');