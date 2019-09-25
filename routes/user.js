var express = require('express')
var router = express.Router()
var connection = require('express-myconnection')
var mysql = require('mysql')
const jwt = require('jwt-simple');
const bcrypt = require('bcryptjs');

const credentials = require('../dbCredentials')

router.use(
  connection(mysql, credentials, 'pool')
)

router.options('/login', function(req, res) {
  console.log(req.body)
  res.sendStatus(200)
})
router.post('/login', function (req, res) {
  req.getConnection(function (err, connection) {
    if (err) {
      console.log(err)
      res.sendStatus(500)
    } else {
      if (req.body.username && req.body.password) {
        connection.query('SELECT password, iduser, username, avatar_pat FROM user WHERE username = ? LIMIT 1', req.body.username, function (err, rows) {
          if (err) {
            console.log(err)
            res.sendStatus(500)
          } else {
            if (rows.length) {
              let userObject = rows[0];

              bcrypt.compare(req.body.password, userObject.password, function(err, result) {
                if (result === true) {
                  let sevenDays = 7*24*60*60*1000;
                  // set token expiration 7 days from now
                  let expiration = new Date().getTime() + sevenDays;

                  // create JSON web token
                  let token = jwt.encode({
                      iduser: userObject.iduser,
                      username: userObject.username,
                      avatar_pat: userObject.avatar_pat,
                      exp: expiration
                    }, req.app.get('jwtTokenSecret')
                  );
                  // send data
                  res.send({
                    err: false,
                    token: token,
                    expires: expiration,
                    info: userObject,
                  });
                } else {
                  res.header('status', '403').send({
                    err:true,
                    error: `El usuario o la contraseña son inválidos.`
                  });
                }
              })
            } else {
              res.header('status', '401').send({
                err:true,
                error: `El usuario o la contraseña son inválidos.`
              })
            }
          }
        })
      } else {
        res.header('status', '401').send({
          err:true,
          error: `El usuario o la contraseña son inválidos.`
        })
      }
    }
  })
})

router.options('/checkToken', function(req,res) {
  res.sendStatus(200)
})
router.post('/checkToken', function (req, res) {
  if (req.body.token) {
    try{
      let decoded = jwt.decode(req.body.token, req.app.get('jwtTokenSecret'))
      res.header('status', '200').send(decoded)
    } catch(e){
      console.log(e)
      res.header('status', '400').send({err:true, error: 'Token Invalido'})
    }
  } else {
    res.header('status', '401').send({err: true, error: 'Token Invalido'})
  }
})

module.exports = router;
