var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{

        host: '127.0.0.1',
        user: 'root',
        password : 'observaproyecta',
        port : 3306,
        database:'Observapp',
        insecureAuth : true

    },'pool')
);

router.options('/add', function(req,res){
    res.sendStatus(200)
})
router.post('/add',function(req,res){
    var input = req.body;
    console.log(input);
    req.getConnection(function(err,connection){
        if(err){
            console.log(err);
            res.sendStatus(500);
        } else connection.query("INSERT INTO avance SET ?",[{estado:'propuesto',idproyecto:input.idproyecto, iduser: req.body.iduser}],function(err,rows){
            if(err){
                console.log(err);
                res.sendStatus(500);
            } else {
                input.answers.map(function(val){
                    val.push(rows.insertId);
                    return val;
                });
                connection.query("INSERT INTO respuesta (`idenunciado`,`contenido`,`idavance`) VALUES ?",[input.answers],function(err,rows){
                    if(err){
                        console.log(err);
                        res.sendStatus(500);
                    } else {
                        res.header('status', '200').send({id: input.idproyecto});
                    }
                });

            }
        });
    });
});

router.get("/getAll/:idproyecto/:len",function(req,res){
   req.getConnection(function(err,connection){
       if(err){
           console.log(err);
           res.sendStatus(500);
       } else {
           connection.query("SELECT GROUP_CONCAT(etapas.nombre ORDER BY etapas.nro ASC SEPARATOR '@@') as etapas FROM proyecto RIGHT JOIN etapas ON proyecto.idevento = etapas.idevento WHERE proyecto.idproyecto = ? GROUP BY proyecto.idproyecto",req.params.idproyecto,function(err,etapas) {
               if (err){
                   console.log("Error Selecting : %s ", err);
                   res.sendStatus(500);
               } else {
                   connection.query("SELECT avance.*,GROUP_CONCAT(DISTINCT enunciado.enunciado,'@@',enunciado.archivo,'@@',respuesta.contenido SEPARATOR '&&') AS ansToken, COUNT(DISTINCT avancelike.iduser) AS lenlaik" +
                       " ,GROUP_CONCAT(DISTINCT user.username,'@@',COALESCE(user.avatar_pat,'/assets/img/placeholder.png')) AS userToken,etapas.nro," +
                       " LOCATE(CONCAT('&', CAST( ? AS CHAR), '&')  , CONCAT('&', GROUP_CONCAT(DISTINCT avancelike.iduser SEPARATOR '&&'), '&')) as laiked" +
                       " FROM avance" +
                       " LEFT JOIN respuesta ON respuesta.idavance = avance.idavance" +
                       " LEFT JOIN enunciado ON enunciado.idenunciado = respuesta.idenunciado" +
                       " LEFT JOIN user ON user.iduser = avance.iduser" +
                       " LEFT JOIN avancelike ON avancelike.idavance = avance.idavance" +
                       " LEFT JOIN etapas ON etapas.idetapa = enunciado.idetapa" +
                       " WHERE avance.idproyecto = ? GROUP BY avance.idavance ORDER BY avance.fecha DESC LIMIT ?,5",["1", req.params.idproyecto, parseInt(req.params.len)],function(err,rows){
                       if(err){
                           console.log(err);
                           res.sendStatus(500);
                       } else {
                           var hasMore
                           if(rows.length){
                               var arrayAux
                               rows = rows.map(function(val){
                                   arrayAux = val.ansToken.split('&&').map(function(string){
                                     string = string.split("@@");
                                     return string;
                                   });
                                   return ({...val, userToken: val.userToken.split('@@'), ansToken: arrayAux});
                               });
                           }
                           rows.length < 5 ? hasMore = false : hasMore = true
                           res.header('status','200').send({rows: rows, hasMore: hasMore});

                       }
                   });
               }
           });
       }
   })
});

//Añadir Like a avance
router.options('/addLike', function (req, res) {
    res.sendStatus(200)
})
router.post('/addLike', function (req, res) {
    req.getConnection(function (err, connection) {
        if (err) {
            console.log(err)
            res.sendStatus(500)
        } else {
            connection.query('SELECT * FROM avancelike WHERE idavance = ? AND iduser = ?', [req.body.idavance, req.body.iduser], function (err, rows) {
                if (err) {
                    console.log('Error selecting : %s ', err)
                    res.sendStatus(500)
                } else {
                    if (rows.length) {
                        connection.query('DELETE FROM avancelike WHERE idavance = ? AND iduser = ?', [req.body.idavance, req.body.iduser], function (err, rows) {
                            if (err) {
                                console.log('Error deleting : %s ', err)
                                res.sendStatus(500)
                            } else {
                                connection.query('SELECT COUNT(DISTINCT avancelike.iduser) AS lenlaik, avance.iduser as iduser FROM avancelike' +
                                  ' LEFT JOIN avance ON avance.idavance = avancelike.idavance WHERE avancelike.idavance = ?', req.body.idavance, function (err, rows) {
                                    if (err) {
                                        console.log('Error selecting : %s ', err)
                                        res.sendStatus(500)
                                    } else {
                                        res.send({ count: rows[0].lenlaik, iduser: rows[0], type: 'notlaiked', idavance: req.body.idavance})
                                    }
                                })
                            }
                        })
                    } else {
                        connection.query('INSERT INTO avancelike SET ?', { idavance: req.body.idavance, iduser: req.body.iduser }, function (err, rows) {
                            if (err) {
                                console.log('Error inserting : %s ', err)
                                res.sendStatus(500)
                            } else {
                                connection.query('SELECT COUNT(DISTINCT iduser) AS lenlaik FROM avancelike WHERE idavance = ?', req.body.idavance, function (err, rows) {
                                    if (err) {
                                        console.log('Error selecting : %s ', err)
                                        res.sendStatus(500)
                                    } else {
                                        res.send({ count: rows[0].lenlaik, type: 'laiked', idavance: req.body.idavance})
                                    }
                                })
                            }
                        })
                    }
                }
            })
        }
    })
})
//preaprovar
router.options('/preAprove', function (req, res) {
    res.sendStatus(200)
})
router.post('/preAprove', function (req, res) {
    req.getConnection(function(err, connection){
        if(err){
            console.log(err)
            res.sendStatus(500)
        } else {
            connection.query('UPDATE avance SET estado = "preaprobado" WHERE idavance = ?', req.body.idavance, function(err, rows){
                if (err) {
                    console.log(err)
                    res.sendStatus(500)
                } else {
                    res.sendStatus(200)
                }
            })
        }
    })
})

module.exports = router;
