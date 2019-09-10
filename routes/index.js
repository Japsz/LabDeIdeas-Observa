var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

const credentials = require('../dbCredentials')

router.use(
    connection(mysql, credentials, 'pool')
);

router.get("/", function(req, res){
  res.redirect("/lab/proy");
});

module.exports = router;