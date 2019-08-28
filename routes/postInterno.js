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

router.get('/getAll/:idproyecto/:len', function (req,res) {
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
});

router.post('/add', function(req, res){
  req.getConnection(function (err, connection) {
    connection.query('INSERT INTO postinterno SET ? ', [req.body], function (err, rows) {
      if (err) {
        console.log('Error Inserting : %s ', err)
        res.sendStatus(500)
      } else res.header('status', '200').send({id: rows.insertId, texto1: req.body.texto1})
    })
  })
})
router.options('/add', function(req, res){
  res.sendStatus(200)
  res.end()
})

module.exports = router;