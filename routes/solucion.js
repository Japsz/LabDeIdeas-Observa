var express = require('express')
var router = express.Router()
var connection = require('express-myconnection')
var mysql = require('mysql')

router.use(
  connection(mysql, {

    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    port: 3306,
    database: 'Observapp',
    insecureAuth: true

  }, 'pool')
)
//Conseguir Soluciones
router.get('/getAll/:idproyecto/:len', function (req,res) {
  req.getConnection(function (err, connection) {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      connection.query('SELECT solucion.*,user.username,COALESCE(user.avatar_pat,"/assets/img/placeholder.png") as iconouser, COUNT(DISTINCT solucionlike.iduser) AS lenlaik' +
        ' ,LOCATE(CONCAT("&", CAST( ? AS CHAR), "&")  , CONCAT("&", GROUP_CONCAT(DISTINCT solucionlike.iduser SEPARATOR "&&"), "&")) as laiked' +
        ' FROM solucion' +
        ' LEFT JOIN user ON user.iduser = solucion.iduser' +
        ' LEFT JOIN solucionlike ON solucionlike.idsolucion = solucion.idsolucion' +
        ' WHERE solucion.idproyecto = ? GROUP BY solucion.idsolucion ORDER BY solucion.fecha DESC LIMIT ?,5', ["1", req.params.idproyecto, parseInt(req.params.len)], function (err, rows) {
        if (err) {
          console.log('Error Selecting : %s ', err)
          res.sendStatus(500);
        } else {
          var hasMore
          if(rows) {
            console.log(rows[0])
            rows.length < 5 ? hasMore = false : hasMore = true
            res.header('status','200').send({rows: rows, hasMore: hasMore});
          } else {
            res.header('status','200').send({rows: [], hasMore: false});
          }
        }
      });
    }
  });
});

//Crear Solucion
router.options('/add',function (req, res) {
  res.sendStatus(204)
})
router.post('/add', function (req, res) {
  var data = {
    iduser: req.body.iduser,
    idproyecto: req.body.idproyecto,
    etapa: req.body.etapa,
    contenido: req.body.contenido,
  }
  req.getConnection(function (err, connection) {
    connection.query('INSERT INTO solucion SET ?', [data], function (err, rows) {
      if (err) {
        console.log('Error Selecting : %s ', err)
        res.sendStatus(500)
      } else {
        res.sendStatus(200)
      }
      // console.log(query.sql);
    })
  })
})

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
      connection.query('SELECT * FROM solucionlike WHERE idsolucion = ? AND iduser = ?', [req.body.idsolucion, req.body.iduser], function (err, rows) {
        if (err) {
          console.log('Error selecting : %s ', err)
          res.sendStatus(500)
        } else {
          if (rows.length) {
            connection.query('DELETE FROM solucionlike WHERE idsolucion = ? AND iduser = ?', [req.body.idsolucion, req.body.iduser], function (err, rows) {
              if (err) {
                console.log('Error deleting : %s ', err)
                res.sendStatus(500)
              } else {
                connection.query('SELECT COUNT(DISTINCT solucionlike.iduser) AS lenlaik, solucion.iduser as iduser FROM solucionlike' +
                  ' LEFT JOIN solucion ON solucion.idsolucion = solucionlike.idsolucion WHERE solucionlike.idsolucion = ?', req.body.idsolucion, function (err, rows) {
                  if (err) {
                    console.log('Error selecting : %s ', err)
                    res.sendStatus(500)
                  } else {
                    res.send({ count: rows[0].lenlaik, iduser: rows[0], type: 'notlaiked', idsolucion: req.body.idsolucion})
                  }
                })
              }
            })
          } else {
            connection.query('INSERT INTO solucionlike SET ?', { idsolucion: req.body.idsolucion, iduser: req.body.iduser }, function (err, rows) {
              if (err) {
                console.log('Error inserting : %s ', err)
                res.sendStatus(500)
              } else {
                connection.query('SELECT COUNT(DISTINCT iduser) AS lenlaik FROM solucionlike WHERE idsolucion = ?', req.body.idsolucion, function (err, rows) {
                  if (err) {
                    console.log('Error selecting : %s ', err)
                    res.sendStatus(500)
                  } else {
                    res.send({ count: rows[0].lenlaik, type: 'laiked', idsolucion: req.body.idsolucion})
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

router.options('/joinUser', function (req, res) {
  res.sendStatus(200)
})
router.post('/joinUser', function (req, res) {
  req.getConnection(function (err, connection) {
    if (err) {
      console.log(err)
      res.sendStatus(500)
    } else {
      console.log(req.body)
      connection.query('SELECT solucion.*, COALESCE(userproyecto.flag, "none") AS isMember, proyecto.etapa AS etapaProyecto,proyecto.titulo, user.correo' +
        ' FROM solucion' +
        ' LEFT JOIN userproyecto ON userproyecto.idproyecto = solucion.idproyecto AND solucion.iduser = userproyecto.iduser' +
        ' LEFT JOIN user ON user.iduser = solucion.iduser' +
        ' LEFT JOIN proyecto ON proyecto.idproyecto = solucion.idproyecto' +
        ' WHERE solucion.idsolucion = ?', [req.body.idsolucion], function (err, rows) {
        if (err) {
          console.log('Error selecting : %s ', err)
          res.sendStatus(500)
        } else {
          if (rows.length) {
            var obj = rows[0]
            if (obj.isMember === 'none') {
              connection.query('INSERT INTO userproyecto SET ?', [{iduser: obj.iduser, idproyecto: obj.idproyecto, etapa: obj.etapaProyecto, flag: 'Colaborador'}], function (err, rows) {
                if (err) {
                  console.log('Error deleting : %s ', err)
                  res.sendStatus(500)
                } else {
                  connection.query('UPDATE solucion SET estado = 1 WHERE idsolucion = ?', req.body.idsolucion, function (err, rows) {
                    if (err) {
                      console.log('Error selecting : %s ', err)
                      res.sendStatus(500)
                    } else {
                      connection.query('INSERT INTO actualizacion SET ?', [{contenido: obj.contenido, iduser: obj.iduser, tipo: 6, idproyecto: obj.idproyecto}], function (err,actRows){
                        if (err) {
                          console.log('Error selecting : %s ', err)
                          res.sendStatus(500)
                        } else {
                          if (obj.correo !== '') {
                            res.mailer.send('mail_newuser', {
                              to: obj.correo, // REQUIRED. This can be a comma delimited string just like a normal email to field.
                              subject: 'Fuiste agregado a un proyecto!', // REQUIRED.
                              data: {
                                iduser: obj.iduser,
                                titulo: obj.titulo,
                                idproyecto: obj.titulo,
                                contenido: obj.contenido,
                                etapa: obj.etapaProyecto,
                              }
                            }, function (err) {
                              if (err) {
                                // handle error
                                console.log(err)
                                res.send('There was an error sending the email')
                              } else res.sendStatus(200)
                            })
                          } else res.sendStatus(200)
                        }
                      })
                    }
                  })
                }
              })
            } else {
              console.log('Error selecting : %s ', err)
              res.sendStatus(500)
            }
          } else {
            console.log('Error selecting : %s ', err)
            res.sendStatus(500)
          }
        }
      })
    }
  })
})

module.exports = router;