var express = require('express')
var router = express.Router()
var connection = require('express-myconnection')
var mysql = require('mysql')
const jwt = require('jwt-simple')

const credentials = require('../dbCredentials')

router.use(
  connection(mysql, credentials, 'pool')
)
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
router.get('/getAll/:idproyecto/:len',validatorMiddleware, function (req,res) {
  if (req.user.proyList.includes(parseInt(req.params.idproyecto))) {
    req.getConnection(function (err, connection) {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      } else {
        connection.query('SELECT postinterno.*,user.username,COALESCE(user.avatar_pat,"/assets/img/placeholder.png") as iconouser' +
          ' FROM postinterno' +
          ' INNER JOIN user ON user.iduser = postinterno.iduser' +
          ' WHERE postinterno.idproyecto = ?' +
          ' GROUP BY postinterno.idpostinterno ORDER BY postinterno.fecha DESC LIMIT ?,5', [req.params.idproyecto, parseInt(req.params.len)], function (err, rows) {
          if (err) {
            console.log('Error Selecting : %s ', err)
            res.sendStatus(500);
          } else {
            var hasMore
            console.log(rows)
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
  } else {
    res.sendStatus(401)
  }
});

router.post('/add', validatorMiddleware, function(req, res){
  if(req.user.proyList.includes(parseInt(req.body.idproyecto)))
    req.getConnection(function (err, connection) {
      connection.query('INSERT INTO postinterno SET ? ', [req.body], function (err, rows) {
        if (err) {
          console.log('Error Inserting : %s ', err)
          res.sendStatus(500)
        } else res.header('status', '200').send({id: rows.insertId, texto1: req.body.texto1})
      })
    })
  else res.sendStatus(401)
})

router.options('/add', function(req, res){
  res.sendStatus(200)
  res.end()
})

module.exports = router;