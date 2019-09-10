var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

const credentials = require('../dbCredentials')

router.use(
    connection(mysql, credentials,'pool')
);
const validatorMiddleware = (req, res, next) => {
    let token = req.headers['authorization']
    if (token) {
        try{
            let decoded = jwt.decode(token, req.app.get('jwtTokenSecret'))
            req.getConnection(function (err, connection) {
                if (err) {
                    console.log(err)
                    res.sendStatus(500)
                } else {
                    connection.query('SELECT DISTINCT idproyecto FROM userproyecto WHERE iduser = ?', decoded.iduser, function (err, rows) {
                        if (err) {
                            console.log(err)
                            res.sendStatus(500)
                        } else {
                            req.user = {
                                ...decoded,
                                proyList: rows.map((item) => parseInt(item.idproyecto))
                            }
                            next()
                        }
                    })
                }
            })
        } catch(e) {
            res.sendStatus(400)
        }
    } else {
        res.sendStatus(401)
    }
}

router.options('/add', validatorMiddleware,  function(req,res){
    res.sendStatus(200)
})
router.post('/add', validatorMiddleware, function(req,res){
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

router.get("/getAll/:idproyecto/:len", validatorMiddleware,function(req,res){
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
                               var objAux
                               rows = rows.map(function(val){
                                   objAux = val
                                   arrayAux = val.ansToken.split('&&').map(function(string){
                                     string = string.split("@@");
                                     return string;
                                   });
                                   objAux.userToken = val.userToken.split('@@')
                                   objAux.ansToken = arrayAux
                                   return objAux;
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
//Embed from actualización pública
router.get("/get/:idavance",function(req,res){
    req.getConnection(function(err,connection){
        if(err){
            console.log(err);
            res.sendStatus(500);
        } else {
            connection.query("SELECT avance.*,GROUP_CONCAT(DISTINCT enunciado.enunciado,'@@',enunciado.archivo,'@@',respuesta.contenido SEPARATOR '&&') AS ansToken" +
              " ,GROUP_CONCAT(DISTINCT user.username,'@@',COALESCE(user.avatar_pat,'/assets/img/placeholder.png')) AS userToken,etapas.nro" +
              " FROM avance" +
              " LEFT JOIN respuesta ON respuesta.idavance = avance.idavance" +
              " LEFT JOIN enunciado ON enunciado.idenunciado = respuesta.idenunciado" +
              " LEFT JOIN user ON user.iduser = avance.iduser" +
              " LEFT JOIN etapas ON etapas.idetapa = enunciado.idetapa" +
              " WHERE avance.idavance = ? GROUP BY avance.idavance ORDER BY avance.fecha ",[req.params.idavance],function(err,rows){
                if(err){
                    console.log(err);
                    res.sendStatus(500);
                } else {
                    if(rows.length){
                        var arrayAux
                        var objAux
                        rows = rows.map(function(val){
                            objAux = val
                            arrayAux = val.ansToken.split('&&').map(function(string){
                                string = string.split("@@");
                                return string;
                            });
                            objAux.userToken = val.userToken.split('@@')
                            objAux.ansToken = arrayAux
                            return objAux;
                        });
                        res.header('status','200').send({idavance: rows[0].idavance, ansToken: rows[0].ansToken, userToken: rows[0].userToken});
                    } else {
                        console.log("no existe")
                        res.sendStatus(500)
                    }

                }
            });
        }
    })
});

//Añadir Like a avance
router.options('/addLike', validatorMiddleware, function (req, res) {
    res.sendStatus(200)
})
router.post('/addLike', validatorMiddleware,function (req, res) {
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
router.post('/preAprove', validatorMiddleware, function (req, res) {
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
//postular
router.options('/postulate', validatorMiddleware, function (req, res) {
    res.sendStatus(200)
})
router.post('/postulate', validatorMiddleware, function (req, res) {
    req.getConnection(function(err, connection){
        if(err){
            console.log(err)
            res.sendStatus(500)
        } else {
            connection.query('UPDATE avance SET estado = "pendiente" WHERE idavance = ?', req.body.idavance, function(err, rows){
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
