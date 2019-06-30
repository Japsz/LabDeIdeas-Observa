var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');
var formidable = require('formidable');
var fs = require('fs');
router.use(
    connection(mysql,{

        host: '127.0.0.1',
        user: 'root',
        password : 'observaproyecta',
        port : 3306,
        database:'Observapp',
        insecureAuth : true

    },'pool')
);

router.post('/save',function(req,res){
   if(req.session.isUserLogged){
        var input = req.body;
        console.log(input);
        req.getConnection(function(err,connection){
            if(err){
                console.log(err);
                res.send({err:true});
            } else connection.query("INSERT INTO avance SET ?",[{estado:'propuesto',idproyecto:input.idproyecto,iduser: req.session.user.iduser}],function(err,rows){
                if(err){
                    console.log(err);
                    res.send({err:true});
                } else {
                    input.answers.map(function(val){
                        val.push(rows.insertId);
                        return val;
                    });
                    connection.query("INSERT INTO respuesta (`idenunciado`,`contenido`,`idavance`) VALUES ?",[input.answers],function(err,rows){
                        if(err){
                            console.log(err);
                            res.send({err:true});
                        } else {
                            res.send({err:false,urlRedirect:"/lab/intern/avance/show/" + input.idproyecto});
                        }
                    });

                }

            });
        });
   } else res.render('bad_login');
});

router.get("/show/:idproyecto",function(req,res){
   if(req.session.isUserLogged){
       req.getConnection(function(err,connection){
           if(err){
               console.log(err);
               res.send({err:true});
           } else {
               connection.query("SELECT GROUP_CONCAT(etapas.nombre ORDER BY etapas.nro ASC SEPARATOR '@@') as etapas FROM proyecto RIGHT JOIN etapas ON proyecto.idevento = etapas.idevento WHERE proyecto.idproyecto = ? GROUP BY proyecto.idproyecto",req.params.idproyecto,function(err,etapas) {
                   if (err){
                       console.log("Error Selecting : %s ", err);
                   } else {
                       connection.query("SELECT avance.*,GROUP_CONCAT(DISTINCT enunciado.enunciado,'@@',enunciado.archivo,'@@',respuesta.contenido SEPARATOR '&&') AS ansToken" +
                           " ,GROUP_CONCAT(DISTINCT user.username,'@@',COALESCE(user.avatar_pat,'/assets/img/placeholder.png')) AS userToken,etapas.nro" +
                           " FROM avance" +
                           " LEFT JOIN respuesta ON respuesta.idavance = avance.idavance" +
                           " LEFT JOIN enunciado ON enunciado.idenunciado = respuesta.idenunciado" +
                           " LEFT JOIN user ON user.iduser = avance.iduser" +
                           " LEFT JOIN etapas ON etapas.idetapa = enunciado.idetapa" +
                           " WHERE avance.idproyecto = ? GROUP BY avance.idavance",[req.params.idproyecto],function(err,rows){
                           if(err){
                               console.log(err);
                               res.send({err:true});
                           } else {
                               if(rows.length){
                                   rows.map(function(val){
                                       val.ansToken = val.ansToken.split('&&');
                                       val.ansToken.map(function(string){
                                           string = string.split("@@");
                                           return string;
                                       });
                                       val.userToken = val.userToken.split('@@');
                                       return val;
                                   });
                                   var avant = rows;
                                   connection.query('SELECT group_concat(DISTINCT user.username , "@" , user.iduser, "@", COALESCE(user.avatar_pat,"/assets/img/placeholder.png"), "@", userproyecto.flag) as usuarios,proyecto.*,etapas.likes,GROUP_CONCAT(DISTINCT enunciado.enunciado ,"@@", enunciado.archivo,"@@",enunciado.idenunciado SEPARATOR "&&") AS token' +
                                       ' FROM proyecto LEFT JOIN userproyecto ON userproyecto.idproyecto = proyecto.idproyecto' +
                                       ' LEFT JOIN user ON user.iduser = userproyecto.iduser' +
                                       ' LEFT JOIN etapas ON proyecto.idevento = etapas.idevento' +
                                       ' LEFT JOIN enunciado ON enunciado.idetapa = etapas.idetapa' +
                                       ' WHERE proyecto.idproyecto = ? AND etapas.nro = proyecto.etapa GROUP BY proyecto.idproyecto',req.params.idproyecto,function(err,rows) {
                                       if (err)
                                           console.log("Error Selecting : %s ", err);
                                       if (rows.length) {
                                           var int = false;
                                           rows[0].token = rows[0].token.split("&&");
                                           rows[0].usuarios = rows[0].usuarios.split(",");
                                           for (var i = 0; i < rows[0].usuarios.length; i++) {
                                               rows[0].usuarios[i] = rows[0].usuarios[i].split("@");
                                               if (parseInt(rows[0].usuarios[i][1]) === parseInt(req.session.user.iduser)) {
                                                   int = true;
                                               }
                                           }

                                           if(int){
                                               res.render('muro_avances',{data:avant,gral:rows[0],etapas: etapas[0].etapas.split("@@"),admin:false,usr:req.session.user},function(err,html){
                                                   if(err) console.log(err);
                                                   res.send(html);
                                               });
                                           } else res.redirect('/bad_login');
                                       } else res.redirect('/bad_login');
                                   });
                               } else {
                                   connection.query('SELECT group_concat(DISTINCT user.username , "@" , user.iduser, "@", COALESCE(user.avatar_pat,"/assets/img/placeholder.png"), "@", userproyecto.flag) as usuarios,proyecto.*,etapas.likes,GROUP_CONCAT(DISTINCT enunciado.enunciado ,"@@", enunciado.archivo,"@@",enunciado.idenunciado SEPARATOR "&&") AS token' +
                                       ' FROM proyecto LEFT JOIN userproyecto ON userproyecto.idproyecto = proyecto.idproyecto' +
                                       ' LEFT JOIN user ON user.iduser = userproyecto.iduser' +
                                       ' LEFT JOIN etapas ON proyecto.idevento = etapas.idevento' +
                                       ' LEFT JOIN enunciado ON enunciado.idetapa = etapas.idetapa' +
                                       ' WHERE proyecto.idproyecto = ? AND etapas.nro = proyecto.etapa GROUP BY proyecto.idproyecto',req.params.idproyecto,function(err,rows) {
                                       if (err)
                                           console.log("Error Selecting : %s ", err);
                                       if (rows.length) {
                                           var int = false;
                                           rows[0].token = rows[0].token.split("&&");
                                           rows[0].usuarios = rows[0].usuarios.split(",");
                                           for (var i = 0; i < rows[0].usuarios.length; i++) {
                                               rows[0].usuarios[i] = rows[0].usuarios[i].split("@");
                                               if (parseInt(rows[0].usuarios[i][1]) === parseInt(req.session.user.iduser)) {
                                                   int = true;
                                               }
                                           }
                                           if(int){
                                               res.render('muro_avances',{data:[],gral:rows[0],etapas: etapas[0].etapas.split("@@"),admin:false,usr:req.session.user})
                                           } else res.redirect('/bad_login');
                                       } else res.redirect('/bad_login');
                                   });
                               }
                           }
                       });
                   }
               });
           }
       })
   } else res.redirect('/bad_login');
});

router.post('/subir_file', function (req,res) {
    var f_gen = new Date();
    var newname = "user" + req.session.user.iduser.toString() + "-" + f_gen.getTime() + ".jpg";
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if (err){
            console.log(err);
            res.send({err:true,errMsg:err});
        } else {
            console.log(files['file-0']);
            var oldpath = files['file-0'].path;
            var newpath = './public/web-img/' + newname;
            fs.rename(oldpath, newpath, function (err) {
                if (err){
                    console.log(err);
                    res.send({err:true,errMsg:err});
                } else {
                    res.send({err:false,savedpath:"/web-img/" + newname});
                }
            });
        }
    });
});
module.exports = router;
