var express = require('express')
var router = express.Router()
var connection = require('express-myconnection')
var mysql = require('mysql')

const credentials = require('../dbCredentials')

router.use(
  connection(mysql, credentials, 'pool')
)

router.get('/getAll/:idpostinterno/:len', function (req,res) {
  req.getConnection(function (err, connection) {
    if (err) {
      console.log(err);
      res.sendStatus(500);
    } else {
      connection.query('SELECT comentinterno.*,user.username,COALESCE(user.avatar_pat, "/assets/img/placeholder.png") as avatar_pat' +
        ' FROM comentinterno' +
        ' INNER JOIN user ON user.iduser = comentinterno.iduser' +
        ' WHERE idpost  = ? GROUP BY comentinterno.idcomentinterno DESC LIMIT ?,5', [req.params.idpostinterno, parseInt(req.params.len)], function (err, rows) {
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
router.options('/add', function(req,res){
  res.sendStatus(200)
})
router.post('/add', function(req,res){
  req.getConnection(function (err, connection) {
    connection.query('INSERT INTO comentinterno SET ? ', [req.body], function (err, rows) {
      if (err) {
        console.log('Error Inserting : %s ', err)
        res.sendStatus(500)
      } else res.header('status', '200').send({id: rows.insertId, idpostinterno: req.body.idpost})
    })
  })
})
module.exports = router;