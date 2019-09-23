var express = require('express')
var router = express.Router()
var connection = require('express-myconnection')
var mysql = require('mysql')

const credentials = require('../dbCredentials')

router.use(
  connection(mysql, credentials, 'pool')
)
const validatorMiddleware = require('./middleware/api')

router.get('/getAll/:idproyecto/:len', function (req,res) {
  req.getConnection(function (err, connection) {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      connection.query('SELECT actualizacion.*,user.username,COALESCE(user.avatar_pat,"/assets/img/placeholder.png") as iconouser' +
        ' FROM actualizacion' +
        ' LEFT JOIN user ON user.iduser = actualizacion.iduser' +
        ' WHERE actualizacion.idproyecto = ? GROUP BY actualizacion.idactualizacion ORDER BY actualizacion.fecha DESC LIMIT ?,5', [req.params.idproyecto, parseInt(req.params.len)], function (err, rows) {
        if (err) {
          console.log('Error Selecting : %s ', err)
          res.sendStatus(500);
        } else {
          var hasMore
          if(rows) {
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

router.options('/add', function (req, res) {
  res.sendStatus(200)
})
router.post('/add', validatorMiddleware, function (req, res) {
  if (req.user.proyList.includes(parseInt(req.body.idproyecto))) {
    if (req.body.tipo === 4) {
      var embed = require("embed-video");
      // Crea iframe con el reproductor de video correspondiente (youtube, vimeo, dailymotion)
      req.body.principal = embed(req.body.principal,{attr:{width:"100%",height:536}});
    }
    req.body.fecha = new Date();
    delete req.body.fileLoad
    req.getConnection(function (err, connection) {
      connection.query('INSERT INTO actualizacion SET ?', [req.body], function (err, rows) {
        if (err) {
          console.log('Error Selecting : %s ', err)
          res.sendStatus(500)
        } else {
          res.sendStatus(200)
          connection.query('UPDATE proyecto SET actualizado = CURRENT_TIMESTAMP WHERE idproyecto = ?', req.body.idproyecto, function (err, rows) {
            if (err) { console.log('Error Selecting : %s ', err) }
          })
        }
      })
    })
  } else {

  }
})

module.exports = router;