var express = require('express')
var router = express.Router()
var connection = require('express-myconnection')
var mysql = require('mysql')
var formidable = require('formidable')
var avance = require('./avance')
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

function isMonitor (obsList, idobs) {
  for (var i = 0; i < obsList.length; i++) {
    if (parseInt(idobs) === parseInt(obsList[i].idobservatorio)) {
      return true
    }
  }
  return false
};

router.use('/avance', avance)
// Postear una solución al muro interno
router.post('/postsol', function (req, res) {
  if (req.session.isUserLogged) {
    var input = JSON.parse(JSON.stringify(req.body))
    var data = {
      iduser: req.session.user.iduser,
      tipo: input.tipo,
      texto2: input.texto2,
      fecha: new Date()
    }
    req.getConnection(function (err, connection) {
      connection.query('SELECT GROUP_CONCAT(solucion.idsolucion, "&&", user.username, "&&", user.avatar_pat, "&&", solucion.fecha) as token,solucion.idproyecto, solucion.contenido FROM solucion INNER JOIN user ON solucion.iduser = user.iduser WHERE solucion.idsolucion = ? GROUP BY solucion.idsolucion LIMIT 1', [input.idsol], function (err, rows) {
        if (err) { console.log('Error Selecting : %s ', err) }
        data.texto1 = rows[0].contenido
        data.token = rows[0].token
        data.idproyecto = rows[0].idproyecto
        connection.query('INSERT INTO postinterno SET ?', [data], function (err, rows) {
          if (err) { console.log('Error Selecting : %s ', err) }
          res.send('si')
        })
        // console.log(query.sql);
      })
    })
  } else res.redirect('/bad_login')
})
// Enviar propuesta de avance a Administrador
router.post('/progress', function (req, res) {
  var input = JSON.parse(JSON.stringify(req.body))
  if (req.session.isUserLogged) {
    req.getConnection(function (err, connection) {
      connection.query('UPDATE postinterno SET tipo = 0 WHERE idpostinterno = ?', input.idpost, function (err, rows) {
        if (err) { console.log('Error updating : %s ', err) }
        res.send('si')
        // console.log(query.sql);
      })
      // console.log(query.sql);
    })
  } else res.redirect('/bad_login')
})
// Cargar comentarios de muro interno
router.post('/comment_stream', function (req, res) {
  var input = JSON.parse(JSON.stringify(req.body))
  if (req.session.isUserLogged || req.session.isAdminLogged) {
    req.getConnection(function (err, connection) {
      connection.query('SELECT comentinterno.*,user.username,user.avatar_pat' +
                ' FROM comentinterno' +
                ' ' +
                ' INNER JOIN user ON user.iduser = comentinterno.iduser' +
                ' WHERE idpost  = ? GROUP BY comentinterno.idcomentinterno', input.idpost, function (err, rows) {
        if (err) { console.log('Error Selecting : %s ', err) }
        if (req.session.isAdminLogged || ireq.session.isMonitLogged) {
          res.render('intcmnt_stream', { data: input.idpost, usr: req.session.user, comments: rows, admin: true })
        } else res.render('intcmnt_stream', { data: input.idpost, usr: req.session.user, comments: rows, admin: false })

        // console.log(query.sql);
      })
      // console.log(query.sql);
    })
  } else res.redirect('/bad_login')
})
// Crear un post en el muro interno de un proyecto
router.post('/add', function (req, res) {
  if (req.session.isUserLogged) {
    var input = JSON.parse(JSON.stringify(req.body))
    var data = {
      iduser: req.session.user.iduser,
      idproyecto: input.idproy,
      tipo: input.tipo,
      fecha: new Date(),
      texto1: input.texto1,
      texto2: input.texto2,
      token: input.token.replace('&amp;', '&')
    }

    req.getConnection(function (err, connection) {
      connection.query('INSERT INTO postinterno SET ?', [data], function (err, rows) {
        if (err) { console.log('Error Selecting : %s ', err) }
        res.redirect('/lab/intern/show/' + input.idproy.toString())

        // console.log(query.sql);
      })
    })
  } else res.redirect('/bad_login')
})
// Darle like a un post del muro interno.
router.post('/laik_intern', function (req, res) {
  if (req.session.isUserLogged) {
    var input = JSON.parse(JSON.stringify(req.body))
    req.getConnection(function (err, connection) {
      connection.query('SELECT postinterno.laiks,COUNT(userproyecto.iduser) as cantint, postinterno.tipo,postinterno.token,proyecto.idcreador FROM postinterno INNER JOIN userproyecto ON postinterno.idproyecto = userproyecto.idproyecto' +
                ' LEFT JOIN proyecto ON proyecto.idproyecto = postinterno.idproyecto WHERE postinterno.idpostinterno = ? GROUP BY postinterno.laiks', [input.idpost], function (err, rows) {
        if (err) { console.log('Error inserting : %s ', err) }
        var newlike, classname, numint, totvot
        if (rows) {
          numint = rows[0].cantint
          if (rows[0].laiks) {
            if (rows[0].laiks == 'fin') {
              newlike = 'fin'
              var alert = 'fin'
              if (rows[0].idcreador == req.session.user.iduser) {
                alert = 'rdy'
              }
              res.send({ html: '<i class="glyphicon glyphicon-ok"></i>', newlaik: 'btn-success', alert: alert })
            } else if (rows[0].laiks.indexOf('&' + req.session.user.iduser + '&') != -1) {
              newlike = rows[0].laiks.replace('&' + req.session.user.iduser + '&', '')
              classname = 'btn-inverse'
            } else {
              newlike = rows[0].laiks + '&' + req.session.user.iduser + '&'
              classname = 'btn-success'
            }
          } else {
            newlike = '&' + req.session.user.iduser + '&'
            classname = 'btn-success'
          }
          var tip = rows[0].tipo
          var tok = rows[0].token.split('&&')
          var creador = rows[0].idcreador
          if (newlike == '') {
            totvot = 0
          } else {
            totvot = newlike.split('&&').length
          }
          if (totvot >= ((numint - numint % 2) / 2 + 1)) { // Votación completa
            if (tip == 2) {
              connection.query('SELECT solucion.iduser,proyecto.titulo,proyecto.etapa,solucion.idproyecto,solucion.contenido,user.correo FROM solucion LEFT JOIN proyecto ON proyecto.idproyecto = solucion.idproyecto' +
                                ' LEFT JOIN user ON user.iduser = solucion.iduser WHERE idsolucion = ? GROUP BY solucion.iduser', tok[0], function (err, rows) {
                if (err) { console.log('Error inserting : %s ', err) }
                var idproj = rows[0].idproyecto
                var iduser = rows[0].iduser
                var cont = rows[0].contenido
                var dats = rows[0]
                connection.query('INSERT INTO userproyecto SET ? ', [{ iduser: rows[0].iduser, idproyecto: rows[0].idproyecto, etapa: rows[0].etapa }], function (err, rows) {
                  if (err) {
                    console.log('Error inserting : %s ', err)
                    connection.query('UPDATE postinterno SET laiks = ? WHERE idpostinterno = ?', ['fin', input.idpost], function (err, rows) {
                      if (err) { console.log('Error inserting : %s ', err) }
                      res.send({ html: '<i class="glyphicon glyphicon-ok"></i>', newlaik: 'btn-success', alert: 'sameuser' })
                    })
                  } else {
                    newlike = 'fin'
                    connection.query('UPDATE postinterno SET laiks = ? WHERE idpostinterno = ?', [newlike, input.idpost], function (err, rows) {
                      if (err) { console.log('Error updating : %s ', err) }
                      connection.query('UPDATE proyecto SET gotuser = 1 WHERE idproyecto = ?', idproj, function (err, rows) {
                        if (err) { console.log('Error updating : %s ', err) }
                        var newuser_act = {
                          iduser: iduser,
                          idproyecto: idproj,
                          tipo: 5,
                          principal: 'Se unió al proyecto!',
                          contenido: cont,
                          fecha: new Date()
                        }
                        connection.query('INSERT INTO actualizacion SET ?', newuser_act, function (err, actid) {
                          if (err) { console.log('Error insert actualizacion: %s', err) }
                          res.send({ html: '<i class="glyphicon glyphicon-ok"></i>', newlaik: 'btn-success', alert: 'newuser' })
                        })
                        res.mailer.send('mail_newuser', {
                          to: dats.correo, // REQUIRED. This can be a comma delimited string just like a normal email to field.
                          subject: 'Fuiste agregado a un proyecto!', // REQUIRED.
                          data: dats
                        }, function (err) {
                          if (err) {
                            // handle error
                            console.log(err)
                            res.send('There was an error sending the email')
                          }
                        })
                      })
                    })
                  }
                })
              })
            } else {
              newlike = 'fin'
              connection.query('UPDATE postinterno SET laiks = ? WHERE idpostinterno = ?', [newlike, input.idpost], function (err, rows) {
                if (err) { console.log('Error updating : %s ', err) }
                if (req.session.user.iduser == creador) {
                  newlike = 'rdy'
                }
                res.send({ html: '<i class="glyphicon glyphicon-ok"></i>', newlaik: 'btn-success', alert: newlike })
              })
            }
          } else { // Votación Incompleta
            connection.query('UPDATE postinterno SET laiks = ? WHERE idpostinterno = ?', [newlike, input.idpost], function (err, rows) {
              if (err) { console.log('Error updating : %s ', err) }
              res.send({ html: '<i class="glyphicon glyphicon-thumbs-up"></i>' + totvot + ' / ' + ((numint - numint % 2) / 2 + 1), newlaik: classname, alert: 'no' })
            })
          }
        } else { res.send('no') }
      })
    })
  } else res.send('no')
})

module.exports = router
