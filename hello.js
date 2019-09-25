var express = require('express');
var http = require('http');
var path = require('path');
var multer = require('multer')
var cors = require('cors');
var app = express(), mailer = require("express-mailer");

var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');

mailer.extend(app, {
    from: 'no-reply@example.com',
    host: 'smtp.gmail.com', // hostname
    secureConnection: true, // use SSL
    port: 465, // port for secure SMTP
    transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
    auth: {
        user: 'observaciudadania17@gmail.com',
        pass: 'observa2020'
    }
});

// view engine setup
app.set('port', process.env.PORT || 8081);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('jwtTokenSecret', 'el-secreto-secretoso');
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("usuarios"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
    name: 'session',
    keys: ['usuarios']
}));
app.use(cors())

app.use('/quantumapi/', require('./routes/index'));
app.use('/quantumapi/proy', require('./routes/proyectos'));
app.use('/quantumapi/intern',require('./routes/intern'));
app.use('/quantumapi/internPost',require('./routes/postInterno'));
app.use('/quantumapi/internComment',require('./routes/commentInterno'));
app.use('/quantumapi/acts', require('./routes/actualizaciones'));
app.use('/quantumapi/sol', require('./routes/solucion'));
app.use('/quantumapi/avance', require('./routes/avance'))
app.use('/quantumapi/user', require('./routes/user'))

app.options('/quantumapi/upload', function (req,res) {
    res.sendStatus(200)
})
app.post('/quantumapi/upload', function (req,res) {
    var upload = multer({ storage: storage }).single('file')
    upload(req,res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(500).json(err)
        } else if (err) {
            return res.status(500).json(err)
        }
        return res.status(200).send(req.file)
    });
})
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
});
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/quantumapi/web-img')
    },
    filename: function (req, file, cb) {
        var str = file.originalname
        str = str.replace(' ', '').replace(',', '').replace('/', '').replace('\\', '')
        cb(null, Date.now() + '-' + str )
    }
})
// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('bad_login');
});

var server  = http.createServer(app);

server.listen(app.get('port'), function(){
    console.log('The game starts on port ' + app.get('port'));
});