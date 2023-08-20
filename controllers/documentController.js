const documentsModel = require('../models/document');
const mongoose = require('mongoose');
module.exports = {
    getDocs: function(req,res){
        documentsModel.find({},function(err,data){
            if(err)
                throw err;
            else
                res.json(data);
        })
    },
    addDoc: function(req,res){
        const newDoc = new documentsModel();
        newDoc.title = req.body.title;
        newDoc.description = req.body.description;
        newDoc.url = req.body.url;
        newDoc.iconUrl = req.body.iconurl;
        newDoc.save(function(err,data){
            if(err)
                throw err;
            else
                res.json(data);
        })
    },
    updateDoc: function(req,res){
        documentsModel.findOneAndUpdate({_id: req.params.id}, {$set:{
            title: req.body.title,
            description: req.body.description,
            url: req.body.url,
            iconUrl: req.body.iconurl
            }
        },{new: true}, (err,data) => {
            if(err)
                throw err;
            else
                res.json(data);
        });
    },
    deleteDoc: function(req,res){
        documentsModel.findOneAndRemove({_id:req.params.id}, function(err,data){
            if(err)
                throw err;
            else
                res.json({success:true});
        });
    }
};