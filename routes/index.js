var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{

        host: '127.0.0.1',
        user: 'obs',
        password : 'observaproyecta',
        port : 3306,
        database:'Observapp'
    },'pool')
);

router.get("/", function(req, res){
  res.redirect("/lab/proy");
});

module.exports = router;