const serviceModel = require('../models/service');
const appsModel = require('../models/apps');
const licenseModel = require('../models/license');
const mongoose = require('mongoose');
module.exports = {
    getServices: function(req,res) {
        serviceModel.find({}).populate('provider').exec(function(err,services){
            if(err)
                res.json({error: err});
            else
                res.json({services: services})
        });
    },
    addService: function(req,res) {
        const service = new serviceModel();
        service.name = req.body.name;
        service.provider = new mongoose.Types.ObjectId(req.body.provider);
        service.description = req.body.description;
        service.save(function(err,response){
            if(err)
                res.json({error: err});
            else
                res.json({service: response});
        });
    },
    updateService: function(req,res) {
        const id = mongoose.Types.ObjectId(req.params.id);
        serviceModel.findByIdAndUpdate(id, {$set:{
        name: req.body.name,
        provider: new mongoose.Types.ObjectId(req.body.provider),
        description: req.body.description
        }},{new:true}, function(err,result){
            if(err)
                res.json({error: err});
            else
                res.json({updatedService: result});
        });
    },
    deleteService: function(req,res) {
        const id = mongoose.Types.ObjectId(req.params.id);
        serviceModel.findByIdAndDelete(id, function(err,result){
            if(err)
                res.json({error: err});
            else
                res.json({deletedService: result});
        })
    },
    findAppsRegisteredtoService: function(req,res){
        const id = mongoose.Types.ObjectId(req.params.serviceid);
        appsModel.find({serviceId: id}, function(err,apps){
            if(err)
                res.json({error: err});
            else
                res.json({apps: apps});
        });
    },
    findLicensesRegisteredtoService: function(req,res){
        const id = mongoose.Types.ObjectId(req.params.serviceid);
        licenseModel.find({serviceId: id}, function(err,licenses){
            if(err)
                res.json({error: err});
            else
                res.json({licenses: licenses});
        });
    },
};