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
    } catch (e) {
      res.sendStatus(400)
    }
  } else {
    res.sendStatus(401)
  }
}

module.exports = validatorMiddleware