const tagsModel = require('../models/tags');
const mongoose = require('mongoose');
module.exports = {
    getTags: function(req,res){
        tagsModel.find({},function(err,data){
            if(err)
                throw err;
            else
                res.json(data);
        })
    },
    addTags: function(req,res){
        const newTag = new tagsModel();
        newTag.title = req.body.title;
        newTag.iconUrl = req.body.iconUrl;
        newTag.description = req.body.description;
        newTag.type = req.body.type;
        newTag.save(function(err,data){
            if(err)
                throw err;
            else
                res.json(data);
        })
    },
    updateTag: function(req,res){
        tagsModel.findOneAndUpdate({_id: req.params.id}, {$set:{
            title: req.body.title,
            description: req.body.description,
            type: req.body.type,
            iconUrl: req.body.iconUrl,
            }
        },{new: true}, (err,data) => {
            if(err)
                throw err;
            else
                res.json(data);
        });
    },
    deleteTag: function(req,res){
        tagsModel.findByIdAndDelete(req.params.id, function(err,data){
            if(err)
                throw err;
            else
                res.json(data);
        });
    }
};