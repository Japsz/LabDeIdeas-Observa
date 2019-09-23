var express = require('express')
var router = express.Router()
var connection = require('express-myconnection')
var mysql = require('mysql')
const credentials = require('../dbCredentials')
const validatorMiddleware = require('./middleware/api')
const obsValidatorMiddleware = require('./middleware/apiObservatorio')

router.use(
  connection(mysql, credentials, 'pool')
)
function isMonitor (obsList, idobs) {
  for (var i = 0; i < obsList.length; i++) {
    if (parseInt(idobs) === parseInt(obsList[i].idobservatorio)) {
      return true
    }
  }
  return false
};

// Lógica ver todos los proyectos (página principal)
router.get('/getAll/:len', validatorMiddleware, function (req, res) {
  req.getConnection(function (err, connection) {
    if (err) {
      console.log(err)
      res.sendStatus(500)
    } else {
      connection.query('SELECT proyecto.*,user.username,COALESCE(user.avatar_pat,"/assets/img/placeholder.png") as iconouser, COALESCE(GROUP_CONCAT(DISTINCT tags.tag ORDER BY tags.tag),"") AS tagz,' +
            ' LOCATE(CONCAT("&", CAST( ? AS CHAR), "&")  , CONCAT("&", GROUP_CONCAT(DISTINCT proylike.iduser SEPARATOR "&&"), "&")) as laiked, COUNT(DISTINCT proylike.iduser) as lenlaik' +
            ' FROM proyecto' +
            ' LEFT JOIN tagproyecto ON proyecto.idproyecto = tagproyecto.idproyecto' +
            ' LEFT JOIN tags ON tagproyecto.idtag = tags.idtag' +
            ' INNER JOIN user ON user.iduser = proyecto.idcreador' +
            ' LEFT JOIN proylike ON proylike.idproyecto = proyecto.idproyecto' +
            ' GROUP BY proyecto.idproyecto ORDER BY proyecto.actualizado DESC LIMIT ?,3', [req.user.iduser.toString(), parseInt(req.params.len)], function (err, rows) {
        if (err) {
          console.log(err)
          res.sendStatus(500)
        } else {
          var hasMore, itemaux
          if (rows) {
            rows = rows.map(function (item) {
              itemaux = item
              itemaux.tagz = itemaux.tagz.split(',')
              return itemaux
            })
            rows.length < 3 ? hasMore = false : hasMore = true
            res.header('status', '200').send({ rows: rows, hasMore: hasMore })
          } else {
            res.sendStatus(200).send({ rows: [], hasMore: false })
          }
        }
      })
    }
  })
});
//Lógica agregar rpoyecto React
router.options('/addProy', function (req, res){
  res.sendStatus(200)
})
router.post('/addProy', obsValidatorMiddleware, function (req, res) {
  var data = {
    idcreador: req.user.iduser,
    titulo: req.body.titulo,
    descripcion: req.body.descripcion,
    idods: req.body.idods,
    idobservatorio: req.user.idobs,
    media: req.body.media
  }
  req.getConnection(function (err, connection) {
    connection.query('SELECT observatorio.idevento FROM observatorio LEFT JOIN ciudadano' +
      ' ON observatorio.idobservatorio = ciudadano.idobs WHERE ciudadano.iduser = ?' +
      ' GROUP BY observatorio.idevento LIMIT 1', parseInt(data.idcreador), function (err, rows) {
      if (err) {
        console.log(err)
        res.sendStatus(500)
      } else {
        data.idevento = rows[0].idevento
        connection.query('INSERT INTO proyecto SET ? ', data, function (err, rows) {
          if (err) {
            console.log('Error inserting : %s ', err)
            res.sendStatus(500)
          } else {
            var postid = rows.insertId
            if (req.body.tags != '') {
              var tags = req.body.tags.replace(/\s/g, '').split(',')
              var aux = []
              var query2 = 'SELECT * FROM tags WHERE tag = ?'
              for (var k = 0; k < tags.length; k++) {
                if (k >= 1) {
                  query2 += ' OR tag = ?'
                }
                aux.push([tags[k]])
              }
              connection.query('INSERT INTO tags (`tag`) VALUES ?', [aux], function (err, nada) {
                if (err) console.log('Error INSERTINg : %s ', err)
                connection.query(query2, tags, function (err, tags) {
                  if (err) {
                    console.log('Error selecting : %s ', err)
                    res.sendStatus(500)
                  } else {
                    var query = 'INSERT INTO tagproyecto (`idtag`, `idproyecto`) VALUES ?'
                    var list = []
                    for (var i = 0; i < tags.length; i++) {
                      aux = [tags[i].idtag, postid]
                      list.push(aux)
                    }
                    connection.query(query, [list], function (err, rows) {
                      if (err) {
                        console.log('Error inserting : %s ', err)
                        res.sendStatus(500)
                      } else {
                        connection.query('INSERT INTO userproyecto SET ? ', [{ iduser: data.idcreador, idproyecto: postid, etapa: 0, flag: 'Creador' }], function (err, rows) {
                          if (err) {
                            console.log('Error inserting : %s ', err)
                          } else {
                            res.header('status', '200').send(postid)
                          }
                        })
                      }
                    })
                  }
                })
              })
            } else {
              connection.query('INSERT INTO userproyecto SET ? ', [{ iduser: parseInt(data.idcreador), idproyecto: postid, etapa: 0, flag: 'Creador' }], function (err, rows) {
                if (err) { console.log('Error inserting : %s ', err) }
                res.header('status', '200').send({idproyecto: postid})
              })
            }
          }
        })
      }
    })
  })
})
// Lógica conseguir info del proyecto
router.get('/info/:idproyecto', function (req, res) {
  req.getConnection(function (err, connection) {
    connection.query('SELECT group_concat(DISTINCT user.username , "@@" , user.iduser, "@@", COALESCE(user.avatar_pat,"/assets/img/placeholder.png"),"@@",userproyecto.flag) as usuarios' +
      ' , proyecto.*, GROUP_CONCAT(DISTINCT etapas.nombre ORDER BY etapas.nro ASC) as etapas' +
      ' FROM proyecto' +
      ' LEFT JOIN userproyecto ON userproyecto.idproyecto = proyecto.idproyecto' +
      ' LEFT JOIN user ON user.iduser = userproyecto.iduser' +
      ' LEFT JOIN etapas ON etapas.idevento = proyecto.idevento' +
      ' WHERE proyecto.idproyecto = ? GROUP BY proyecto.idproyecto', [req.params.idproyecto], function (err, rows) {
      if (err) {
        console.log('Error Selecting : %s ', err)
        res.sendStatus(500)
      } else {
        if (rows) {
          rows[0].usuarios = rows[0].usuarios.split(',')
          rows[0].usuarios = rows[0].usuarios.map(function (item) {
            item = item.split('@@');
            return {
              username: item[0],
              iduser: item[1],
              avatar_pat: item[2],
              badge: item[3]
            }
          });
          var data = {
            titulo: rows[0].titulo,
            idproyecto: rows[0].idproyecto,
            descripcion: rows[0].descripcion,
            media: rows[0].media,
            etapa: rows[0].etapa,
            creacion: rows[0].creacion,
            problema: rows[0].problema,
            idcreador: rows[0].idcreador
          }
          connection.query('SELECT enunciado.enunciado, enunciado.archivo, enunciado.idenunciado' +
            ' FROM etapas' +
            ' LEFT JOIN enunciado on etapas.idetapa = enunciado.idetapa' +
            ' WHERE etapas.idevento = ? AND etapas.nro = ?', [rows[0].idevento, rows[0].etapa], function (err,enuns){
            if(err) {
              console.log(err)
              res.sendStatus(500)
            } else {
              var etapas = {
                names: rows[0].etapas.split(','),
                enuns: enuns,
              }
              res.header('status', '200').send({info: data, users: rows[0].usuarios, etapas: etapas})
            }
          })
        } else {
          res.sendStatus(500)
        }
      }
    })
  })
})
router.get('/getMine/:len', validatorMiddleware, function(req, res) {
  req.getConnection(function (err, connection) {
    if (err) {
      console.log(err)
      res.sendStatus(500)
    } else {
      connection.query('SELECT proyecto.*,user.username,COALESCE(user.avatar_pat,"/assets/img/placeholder.png") as iconouser, COALESCE(GROUP_CONCAT(DISTINCT tags.tag ORDER BY tags.tag),"") AS tagz,' +
        ' LOCATE(CONCAT("&", CAST( ? AS CHAR), "&")  , CONCAT("&", GROUP_CONCAT(DISTINCT proylike.iduser SEPARATOR "&&"), "&")) as laiked, COUNT(DISTINCT proylike.iduser) as lenlaik' +
        ' FROM proyecto' +
        ' LEFT JOIN tagproyecto ON proyecto.idproyecto = tagproyecto.idproyecto' +
        ' LEFT JOIN tags ON tagproyecto.idtag = tags.idtag' +
        ' INNER JOIN user ON user.iduser = proyecto.idcreador' +
        ' LEFT JOIN userproyecto ON userproyecto.idproyecto = proyecto.idproyecto' +
        ' LEFT JOIN proylike ON proylike.idproyecto = proyecto.idproyecto' +
        ' WHERE userproyecto.iduser = ? GROUP BY proyecto.idproyecto ORDER BY proyecto.actualizado DESC LIMIT ?,3', [req.user.iduser.toString(),req.user.iduser.toString(), parseInt(req.params.len)], function (err, rows) {
        if (err) {
          console.log(err)
          res.sendStatus(500)
        } else {
          var hasMore, itemaux
          if (rows) {
            rows = rows.map(function (item) {
              itemaux = item
              itemaux.tagz = itemaux.tagz.split(',')
              return itemaux
            })
            rows.length < 3 ? hasMore = false : hasMore = true
            res.header('status', '200').send({ rows: rows, hasMore: hasMore })
          } else {
            res.sendStatus(200).send({ rows: [], hasMore: false })
          }
        }
      })
    }
  })

})
//Añadir Like a proyecto
router.options('/addLike', function (req, res) {
  res.sendStatus(200)
})
router.post('/addLike', validatorMiddleware, function (req, res) {
  req.getConnection(function (err, connection) {
    if (err) {
      console.log(err)
      res.sendStatus(500)
    } else {
      connection.query('SELECT * FROM proylike WHERE idproyecto = ? AND iduser = ?', [req.body.idproyecto, req.user.iduser], function (err, rows) {
        if (err) {
          console.log('Error selecting : %s ', err)
          res.sendStatus(500)
        } else {
          if (rows.length) {
            connection.query('DELETE FROM proylike WHERE idproyecto = ? AND iduser = ?', [req.body.idproyecto, req.user.iduser], function (err, rows) {
              if (err) {
                console.log('Error deleting : %s ', err)
                res.sendStatus(500)
              } else {
                connection.query('SELECT COUNT(DISTINCT iduser) AS lenlaik FROM proylike WHERE idproyecto = ?', req.body.idproyecto, function (err, rows) {
                  if (err) {
                    console.log('Error selecting : %s ', err)
                    res.sendStatus(500)
                  } else {
                    res.send({ count: rows[0].lenlaik, type: 'notlaiked', idproyecto: req.body.idproyecto})
                  }
                })
              }
            })
          } else {
            connection.query('INSERT INTO proylike SET ?', { idproyecto: req.body.idproyecto, iduser: req.user.iduser }, function (err, rows) {
              if (err) {
                console.log('Error inserting : %s ', err)
                res.sendStatus(500)
              } else {
                connection.query('SELECT COUNT(DISTINCT iduser) AS lenlaik FROM proylike WHERE idproyecto = ?', req.body.idproyecto, function (err, rows) {
                  if (err) {
                    console.log('Error selecting : %s ', err)
                    res.sendStatus(500)
                  } else {
                    res.send({ count: rows[0].lenlaik, type: 'laiked', idproyecto: req.body.idproyecto})
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
// Eliminar a un proyecto
router.get('/remove/:idproy', function (req, res) {
  if (req.session.isAdminLogged) {
    req.getConnection(function (err, connection) {
      connection.query('DELETE FROM proyecto WHERE idproyecto = ?', req.params.idproy, function (err, rows) {
        if (err) { console.log('Error selecting : %s ', err) }
        res.redirect(req.header('Referer') || '/lab')
      })
    })
  } else res.send({ error: false, msg: 'HEY! ESO NO SE HACE' })
})

module.exports = router
