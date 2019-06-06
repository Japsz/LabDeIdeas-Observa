var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{

        host: '127.0.0.1',
        user: 'obs',
        password : 'observaproyecta',
        port : 3306,
        database:'Observapp',
        insecureAuth : true

    },'pool')
);
function isMonitor(obsList,idobs){
    for(var i = 0;i<obsList.length;i++){
        if(parseInt(idobs) === parseInt(obsList[i].idobservatorio)){
            return true;
        }
    }
    return false;
};

// Lógica ver todos los proyectos (página principal)
router.get('/',function(req, res){
    if(req.session.isUserLogged){
        req.getConnection(function(err,connection){
            if(err){
                console.log("Error Connecting : %s ",err );
            }
            connection.query('SELECT proyecto.*,user.username,COALESCE(user.avatar_pat,"/assets/img/placeholder.png") as iconouser,GROUP_CONCAT(DISTINCT tags.tag ORDER BY tags.tag) AS tagz,' +
                ' GROUP_CONCAT(DISTINCT proylike.iduser SEPARATOR "&&") as proylaik, COUNT(DISTINCT proylike.iduser) as lenlaik FROM' +
                ' proyecto LEFT JOIN tagproyecto ON proyecto.idproyecto = tagproyecto.idproyecto LEFT JOIN tags ON tagproyecto.idtag = tags.idtag' +
                ' INNER JOIN user ON user.iduser = proyecto.idcreador LEFT JOIN proylike ON proylike.idproyecto = proyecto.idproyecto' +
                ' GROUP BY proyecto.idproyecto ORDER BY proyecto.actualizado DESC LIMIT 12',function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                res.render('proyect_indx',{data :rows, usr:req.session.user,admin:false});

                //console.log(query.sql);
            });
        });
    } else res.redirect('/bad_login');
});
// Lógica Crear Proyecto
router.post('/add',function(req,res){
    if(req.session.isUserLogged){
        req.getConnection(function(err,connection){
            var input = JSON.parse(JSON.stringify(req.body));
            var data = {
                idcreador   : req.session.user.iduser,
                titulo : input.tit,
                descripcion: input.testo,
                problema: input.prob,
                idobservatorio: req.session.idobs[0].idobservatorio,
                media: input.media
            };
            connection.query("SELECT observatorio.idevento FROM observatorio LEFT JOIN ciudadano" +
                " ON observatorio.idobservatorio = ciudadano.idobs WHERE ciudadano.iduser = ?" +
                " GROUP BY observatorio.idevento LIMIT 1",req.session.user.iduser,function(err,rows){
                data.idevento = rows[0].idevento;
                connection.query("INSERT INTO proyecto SET ? ",data, function(err, rows)
                {

                    if (err)
                        console.log("Error inserting : %s ",err );
                    var postid = rows.insertId;
                    if(input.tags != ""){
                        var tags = input.tags.replace(/\s/g,'').split(",");
                        var aux = [];
                        var query2 = "SELECT * FROM tags WHERE tag = ?";
                        for(var k = 0 ; k < tags.length;k++){
                            if(k >= 1){
                                query2 += " OR tag = ?";
                            }
                            aux.push([tags[k]]);
                        }
                        connection.query("INSERT INTO tags (`tag`) VALUES ?",[aux], function(err, nada)
                        {

                            if (err)
                                console.log("Error INSERTINg : %s ",err );

                            connection.query(query2,tags, function(err, tags)
                            {

                                if (err)
                                    console.log("Error selecting : %s ",err );
                                console.log(tags);
                                var query ="INSERT INTO tagproyecto (`idtag`, `idproyecto`) VALUES ?";
                                var list = [];
                                for(var i = 0; i < tags.length;i++){
                                    aux =[tags[i].idtag,postid];
                                    list.push(aux);
                                }
                                console.log(input.cat);
                                if(input.cat != ""){
                                    list.push([input.cat,postid]);
                                }
                                connection.query(query,[list], function(err, rows)
                                {

                                    if (err)
                                        console.log("Error inserting : %s ",err );
                                    connection.query("INSERT INTO userproyecto SET ? ",[{iduser:req.session.user.iduser,idproyecto: postid,etapa: 0,flag: 'Creador'}], function(err, rows)
                                    {

                                        if (err)
                                            console.log("Error inserting : %s ",err );
                                        res.redirect('/lab');

                                    });
                                });

                            });
                        });
                    } else {
                        if(input.cat != ""){
                            connection.query("INSERT INTO tagproyecto (`idtag`, `idproyecto`) VALUES ?",[[[input.cat,postid]]], function(err, rows)
                            {

                                if (err)
                                    console.log("Error inserting : %s ",err );
                                connection.query("INSERT INTO userproyecto SET ? ",[{iduser:req.session.user.iduser,idproyecto: postid,etapa: 0}], function(err, rows)
                                {

                                    if (err)
                                        console.log("Error inserting : %s ",err );
                                    res.redirect('/lab');

                                });

                            });
                        } else {
                            connection.query("INSERT INTO userproyecto SET ? ",[{iduser:req.session.user.iduser,idproyecto: postid,etapa: 0,flag: 'Creador'}], function(err, rows)
                            {

                                if (err)
                                    console.log("Error inserting : %s ",err );
                                res.redirect('/lab');

                            });
                        }
                    }
                });
            });

        });
    }
});
// Lógica ver mis proyectos "como ciudadano"
router.get('/proy_cdd',function(req, res){
    if(req.session.isUserLogged){
        req.getConnection(function(err,connection){

            connection.query('SELECT proyecto.*,GROUP_CONCAT(DISTINCT tags.tag ORDER BY tags.tag) AS tagz FROM' +
                ' proyecto LEFT JOIN tagproyecto ON proyecto.idproyecto = tagproyecto.idproyecto LEFT JOIN tags ON tagproyecto.idtag = tags.idtag' +
                ' LEFT JOIN userproyecto ON proyecto.idproyecto = userproyecto.idproyecto LEFT JOIN user ON user.iduser = userproyecto.iduser' +
                ' WHERE user.iduser = ? GROUP BY proyecto.idproyecto ORDER BY proyecto.actualizado DESC',[req.session.user.iduser],function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                res.render('my_proy',{data :rows, usr:req.session.user,admin: false});

                //console.log(query.sql);
            });
        });
    } else res.redirect('/bad_login');
});
// Lógica ver muro público del proyecto
router.get('/get/:idproy',function(req, res){
    var int = "show_proy"; // Inicia con la versión pública del muro
    if(req.session.isUserLogged || req.session.isAdminLogged){

        req.getConnection(function(err,connection){

            connection.query('SELECT actualizacion.*,user.username,COALESCE(user.avatar_pat,"/assets/img/placeholder.png") as iconouser FROM actualizacion LEFT JOIN user ON user.iduser = actualizacion.iduser WHERE actualizacion.idproyecto = ?' +
                ' GROUP BY actualizacion.idactualizacion ORDER BY actualizacion.fecha DESC',req.params.idproy,function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                var acts = rows;
                connection.query('SELECT group_concat(DISTINCT user.username , "@" , user.iduser, "@", COALESCE(user.avatar_pat,"/assets/img/placeholder.png"),"@",userproyecto.flag) as usuarios,proyecto.*,GROUP_CONCAT(DISTINCT etapa.nombre ORDER BY etapa.nro ASC) as etapas FROM proyecto LEFT JOIN userproyecto ON userproyecto.idproyecto = proyecto.idproyecto' +
                    ' LEFT JOIN user ON user.iduser = userproyecto.iduser LEFT JOIN etapa ON etapa.idevento = proyecto.idevento WHERE proyecto.idproyecto = ? GROUP BY proyecto.idproyecto',req.params.idproy,function(err,rows)
                {
                    if(err)
                        console.log("Error Selecting : %s ",err );
                    if(rows.length){
                        console.log(rows);
                        rows[0].usuarios = rows[0].usuarios.split(",");
                        rows[0].etapas = rows[0].etapas.split(",");
                        //Revisar si soy integrante en el proyecto conseguido
                        for(var i = 0; i<rows[0].usuarios.length;i++){
                            rows[0].usuarios[i] = rows[0].usuarios[i].split("@");
                            if(rows[0].usuarios[i][1] == req.session.user.iduser){
                                //Setear la vista del muro a la versión de integrante
                                int = "mod_proy";
                            }
                        }
                        if(req.session.isAdminLogged || (req.session.isMonitLogged && isMonitor(req.session.idobs,rows[0].idobservatorio))){
                            res.render(int,{data :acts,gral : rows[0], usr:req.session.user,admin:true},function(err,html){
                                if(err)console.log(err);
                                res.send(html);
                            });
                        } else
                        res.render(int,{data :acts,gral : rows[0], usr:req.session.user,admin:false},function(err,html){
                            if(err)console.log(err);
                            res.send(html);
                        });
                    }
                });
            });
        });
    } else res.redirect('/bad_login');
});
// Añadir actualización pública a un proyecto (sólo para integrantes del proyecto donde se crea)
router.post('/act/add',function(req, res){
    if(req.session.isUserLogged){
        var input = JSON.parse(JSON.stringify(req.body));
        if(input.tipo == "4"){
            input.tit = input.tit.split("=")[1];
        }
        var data = {
            iduser: req.session.user.iduser,
            idproyecto: input.idproy,
            tipo : input.tipo,
            principal : input.tit,
            contenido: input.texto,
            fecha: new Date()
        };
        req.getConnection(function(err,connection){
            connection.query('INSERT INTO actualizacion SET ?',[data],function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                connection.query('UPDATE proyecto SET actualizado = CURRENT_TIMESTAMP WHERE idproyecto = ?',input.idproy,function(err,rows){
                    if(err)
                        console.log("Error Selecting : %s ",err );
                    console.log(rows);
                    res.redirect('/lab/proy/get/' + input.idproy.toString());
                });

                //console.log(query.sql);
            });
        });
    } else res.redirect('/bad_login');
});
// Añadir un aporte/solución  un proyecto.
router.post('/sol/add',function(req, res){
    if(req.session.isUserLogged){
        var input = JSON.parse(JSON.stringify(req.body));
        var data = {
            iduser: req.session.user.iduser,
            idproyecto: input.idproy,
            etapa : input.tipo,
            contenido: input.texto,
            fecha: new Date(),
            estado: 0
        };
        req.getConnection(function(err,connection){
            connection.query('INSERT INTO solucion SET ?',[data],function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                res.redirect('/lab/proy/sol/get/' + input.idproy);
                //console.log(query.sql);
            });
        });
    } else res.redirect('/bad_login');
});
// Conseguir todas las soluciones de un proyecto
router.get('/sol/get/:idproy',function(req, res){
    var int = "show_sol";
    if(req.session.isUserLogged || req.session.isAdminLogged){
        req.getConnection(function(err,connection){

            connection.query('SELECT solucion.*,user.username,COALESCE(user.avatar_pat,"/assets/img/placeholder.png") as iconouser FROM solucion LEFT JOIN user ON user.iduser = solucion.iduser' +
                ' WHERE solucion.idproyecto = ? GROUP BY solucion.idsolucion ORDER BY solucion.fecha DESC',req.params.idproy,function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                var acts = rows;
                connection.query('SELECT group_concat(user.username , "@" , user.iduser, "@", COALESCE(user.avatar_pat,"/assets/img/placeholder.png"), "@", userproyecto.flag) as usuarios,proyecto.*,' +
                    'etapa.token FROM proyecto LEFT JOIN userproyecto ON userproyecto.idproyecto = proyecto.idproyecto LEFT JOIN user ON user.iduser = userproyecto.iduser' +
                    ' LEFT JOIN etapa ON etapa.idevento = proyecto.idevento AND etapa.nro = proyecto.etapa WHERE proyecto.idproyecto = ? GROUP BY etapa.token',req.params.idproy,function(err,rows)
                {
                    if(err)
                        console.log("Error Selecting : %s ",err );
                    if(rows.length){
                        rows[0].usuarios = rows[0].usuarios.split(",");
                        for(var i = 0; i<rows[0].usuarios.length;i++){
                            rows[0].usuarios[i] = rows[0].usuarios[i].split("@");
                            if(rows[0].usuarios[i][1] == req.session.user.iduser){
                                int = "mod_sol";
                            }
                        }
                        if(req.session.isAdminLogged || (req.session.isMonitLogged && isMonitor(req.session.idobs,rows[0].idobservatorio))){
                            res.render(int,{data :acts,gral : rows[0], usr:req.session.user,admin:true},function(err,html){
                                if(err)console.log(err);
                                res.send(html);
                            });
                        } else
                            res.render(int,{data :acts,gral : rows[0], usr:req.session.user,admin:false},function(err,html){
                                if(err)console.log(err);
                                res.send(html);
                            });
                    }

                });

                //console.log(query.sql);
            });
        });
    } else res.redirect('/bad_login');
});
// Cargar mas proyectos
router.post('/proy_stream', function(req,res){
    if(req.session.isUserLogged){
        var input = JSON.parse(JSON.stringify(req.body));
        var htmlobj = {};
        req.getConnection(function(err,connection){

            connection.query('SELECT proyecto.*,user.username,user.avatar_pat as iconouser,GROUP_CONCAT(DISTINCT tags.tag ORDER BY tags.tag) AS tagz,' +
                ' GROUP_CONCAT(DISTINCT proylike.iduser SEPARATOR "&&") as proylaik, COUNT(DISTINCT proylike.iduser) as lenlaik FROM proyecto' +
                ' LEFT JOIN tagproyecto ON proyecto.idproyecto = tagproyecto.idproyecto' +
                ' LEFT JOIN tags ON tagproyecto.idtag = tags.idtag' +
                ' INNER JOIN user ON user.iduser = proyecto.idcreador' +
                ' LEFT JOIN proylike ON proylike.idproyecto = proyecto.idproyecto' +
                ' WHERE proyecto.actualizado < ? GROUP BY proyecto.idproyecto ORDER BY proyecto.actualizado DESC LIMIT 9',[new Date(input.idpost)],function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                if(rows.length){
                    var sep = rows.length - rows.length%3;
                    var tot = rows.length;
                    sep = sep/3;
                    sep += 1;
                    if(sep == 0){
                        sep = 1;
                    }
                    res.render('proy_stream',{data:rows.slice(0,sep), usr:req.session.user,sep:"u"},function (err,html) {
                        if(err) console.log("Error rendering: %s",err);
                        htmlobj.uno = html;
                        res.render('proy_stream',{data:rows.slice(sep,2*sep), usr:req.session.user,sep:"d"},function (err,html) {
                            if(err) console.log("Error rendering: %s",err);
                            htmlobj.dos = html;
                            res.render('proy_stream',{data:rows.slice(2*sep,tot), usr:req.session.user,sep:"t"},function (err,html) {
                                if(err) console.log("Error rendering: %s",err);
                                htmlobj.tres = html;
                                res.send({html: htmlobj, newval: rows[rows.length - 1].actualizado});
                            });
                        });
                    });
                } else {
                    res.send({html: "<p>No hay Mas Proyectos</p>", newval: "nada"});
                }


                //console.log(query.sql);
            });
        });
    }
});
// Renderizar barra de información de un proyecto.
router.post('/render_proyinfo', function(req,res){
    if(req.session.isUserLogged){
        var input = JSON.parse(JSON.stringify(req.body));

        req.getConnection(function(err,connection){
            connection.query('SELECT group_concat(DISTINCT user.username , "@" , user.iduser, "@", user.avatar_pat, "@", userproyecto.flag) as usuarios,proyecto.*,evento.likes FROM postinterno RIGHT JOIN proyecto ON postinterno.idproyecto = proyecto.idproyecto' +
                ' LEFT JOIN userproyecto ON userproyecto.idproyecto = proyecto.idproyecto LEFT JOIN user ON user.iduser = userproyecto.iduser LEFT JOIN evento ON proyecto.idevento = evento.idevento WHERE postinterno.idpostinterno = ? GROUP BY proyecto.idproyecto',input.idpost,function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                if(rows.length){
                    rows[0].usuarios = rows[0].usuarios.split(",");
                    for(var i = 0; i<rows[0].usuarios.length;i++){
                        rows[0].usuarios[i] = rows[0].usuarios[i].split("@");
                    }
                    res.render("proyinfo",{gral : rows[0]});
                }

            });
        });
    } else res.redirect('/bad_login');

});
// Agregar un Like a un proyecto
router.post('/laik_p',function (req, res) {
    if(req.session.isUserLogged){
        var input = JSON.parse(JSON.stringify(req.body));
        req.getConnection(function (err, connection) {
            connection.query("SELECT * FROM proylike WHERE idproyecto = ? AND iduser = ?",[input.idpost,req.session.user.iduser], function(err, rows)
            {

                if (err)
                    console.log("Error selecting : %s ",err );
                if(rows.length){
                    connection.query("DELETE FROM proylike WHERE idproyecto = ? AND iduser = ?",[input.idpost,req.session.user.iduser],function(err,rows){
                        if (err)
                            console.log("Error deleting : %s ",err );
                        connection.query("SELECT COUNT(DISTINCT iduser) AS lenlaik FROM proylike WHERE idproyecto = ?",input.idpost,function(err,rows){
                            if (err)
                                console.log("Error selecting : %s ",err );
                            res.send({html: '<i class="glyphicon glyphicon-thumbs-up"></i> ' + rows[0].lenlaik,newlaik: "btn-inverse"});
                        });

                    });
                } else {
                    connection.query("INSERT INTO proylike SET ?",{idproyecto: input.idpost, iduser: req.session.user.iduser},function(err,rows){
                        if (err)
                            console.log("Error inserting : %s ",err );
                        connection.query("SELECT COUNT(DISTINCT proylike.iduser) AS lenlaik,proyecto.gotlaik,proyecto.idcreador, evento.likes, proyecto.etapa FROM proylike LEFT JOIN proyecto ON proyecto.idproyecto = proylike.idproyecto LEFT JOIN evento ON proyecto.idevento = evento.idevento WHERE proylike.idproyecto = ? GROUP BY proyecto.etapa",input.idpost,function(err,rows){
                            if (err)
                                console.log("Error selecting : %s ",err );
                            if(rows[0].lenlaik >= rows[0].etapa*rows[0].likes && rows[0].gotlaik == 0){
                                var proyobj = rows[0];
                                connection.query("UPDATE proyecto SET gotlaik = 1 WHERE idproyecto = ?",input.idpost,function(err,rows){
                                    if (err)
                                        console.log("Error updating : %s ",err );
                                    res.send({html: '<i class="glyphicon glyphicon-thumbs-up"></i> ' + proyobj.lenlaik,newlaik: "btn-success"});
                                });
                            } else
                                res.send({html: '<i class="glyphicon glyphicon-thumbs-up"></i> ' + rows[0].lenlaik,newlaik: "btn-success"});
                        });

                    });
                }
            });
        });
    } else res.send("no");
});
// Eliminar a un proyecto
router.get('/remove/:idproy',function (req, res) {
    if(req.session.isAdminLogged){
        req.getConnection(function (err, connection) {
            connection.query("DELETE FROM proyecto WHERE idproyecto = ?", req.params.idproy, function (err, rows) {
                if (err)
                    console.log("Error selecting : %s ", err);
                res.redirect(req.header("Referer") || '/lab');
            });
        });
    } else res.send({error:false,msg:"HEY! ESO NO SE HACE"});
});

module.exports = router;
