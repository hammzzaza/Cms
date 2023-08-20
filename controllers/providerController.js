const providerModel = require('../models/provider');

module.exports = {
    addProvider: function(req,res){
        let newPro = new providerModel();
        newPro.name = req.body.name;
        newPro.save(function(err,data){
            if(err)
            res.json({error: err});
            else
                res.json({success: true, newProvider: data});
        });
    },
    getProviders: function(req,res){
        providerModel.find({}, function(err,data){
            if(err)
                res.json({error: err});
            else  
                res.json(data);
        })
    },
    updateProvider: function(req,res){
        const id = req.params.id;
        providerModel.findOneAndUpdate({_id: id}, {$set:{name: req.body.name}}, {new: true}, function(err,data){
            if(err)
                res.json({error: err});
            else  
                res.json(data);
        });
    },
    deleteProvider: function(req,res){
        providerModel.findOneAndRemove({_id:req.params.id}, function(err,data){
            if(err)
                res.json({error: err});
            else  
                res.json(data);
        })
    },
}