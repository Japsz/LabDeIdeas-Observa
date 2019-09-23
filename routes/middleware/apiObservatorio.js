const jwt = require('jwt-simple')

const validatorMiddleware = (req, res, next) => {
  let token = req.headers['authorization']
  if (token) {
    try {
      let decoded = jwt.decode(token, req.app.get('jwtTokenSecret'))
      req.getConnection(function (err, connection) {
        if (err) {
          console.log(err)
          res.sendStatus(500)
        } else {
          connection.query('SELECT DISTINCT idobs FROM ciudadano WHERE iduser = ?', decoded.iduser, function (err, rows) {
            if (err) {
              console.log(err)
              res.sendStatus(500)
            } else {
              if (rows && rows.length === 1) {
                req.user = {
                  ...decoded,
                  idobs: rows[0].idobs
                }
                next()
              } else {
                res.sendStatus(401)
              }
            }
          })
        }
      })
    } catch (e) {
      res.sendStatus(400)
    }
  } else {
    res.sendStatus(401)
  }
}

module.exports = validatorMiddleware