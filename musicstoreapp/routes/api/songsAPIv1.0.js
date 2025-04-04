const {ObjectId} = require("mongodb");
module.exports = function (app, songsRepository, usersRepository) {

    var userInSession = null;

    app.get("/api/v1.0/songs", function (req, res) {
        let filter = {};
        let options = {};
        songsRepository.getSongs(filter, options).then(songs => {
            res.status(200);
            res.send({songs: songs})
        }).catch(error => {
            res.status(500);
            res.json({ error: "Se ha producido un error al recuperar las canciones." })
        });
    });

    app.get("/api/v1.0/songs/:id", function (req, res) {
        try {
            let songId = new ObjectId(req.params.id)
            let filter = {_id: songId};
            let options = {};
            songsRepository.findSong(filter, options).then(song => {
                if (song === null) {
                    res.status(404);
                    res.json({error: "ID inválido o no existe"})
                } else {
                    res.status(200);
                    res.json({song: song})
                }
            }).catch(error => {
                res.status(500);
                res.json({error: "Se ha producido un error a recuperar la canción."})
            });
        } catch (e) {
            res.status(500);
            res.json({error: "Se ha producido un error :" + e})
        }
    });

    app.delete('/api/v1.0/songs/:id', function (req, res) {
        try {
            let songId = new ObjectId(req.params.id);
            let filter = {_id: songId};
            let song = {
                _id: req.params.id,
                author: userInSession.email
            };

            songsRepository.findSong(filter, {}).then(existingSong => {
                if (existingSong.author !== song.author) {
                    let errors = [];
                    errors.push({
                        "value": song.author,
                        "msg": "No está autorizado para eliminar esta canción.",
                        "param": "author",
                        "location": "body"
                    });
                    res.status(403);
                    res.json({errors: errors});
                } else {
                    songsRepository.deleteSong(filter, {}).then(result => {
                        if (result === null || result.deletedCount === 0) {
                            res.status(404);
                            res.json({errors: "ID inválido o no existe, no se ha borrado el registro."});
                        } else {
                            res.status(200);
                            res.send(JSON.stringify(result));
                        }
                    })
                }
            })
        } catch (e) {
            res.status(500);
            res.json({errors: "Se ha producido un error, revise que el ID sea válido."});
        }
    });

    app.post('/api/v1.0/songs', function (req, res) {
        try {
            let song = {
                title: req.body.title,
                kind: req.body.kind,
                price: req.body.price,
                author: res.user
            }
            validatorInsertSong(song, function (errors) {
                if (errors !== null && errors.length > 0) {
                    res.status(422);
                    res.json({errors: errors})
                } else {
                    songsRepository.insertSong(song, function (result) {
                        if (result.songId === null) {
                            let errors = [];
                            errors.push({
                                "value": "User",
                                "msg": "No se ha podido crear la canción, recurso ya existe",
                                "param": "author",
                                "location": "token"
                            })
                            res.status(409);
                            res.json({errors: errors});
                        } else {
                            res.status(201);
                            res.json({
                                message: "Canción añadida correctamente",
                                _id: result.songId
                            })
                        }
                    });
                }
            });
        } catch (e) {
            let errors = [];
            errors.push({
                "value": "None",
                "msg": "Se ha producido un error al intentar crear la canción",
                "param": "None",
                "location": "app"
            });
            res.status(500);
            res.json({errors: errors})
        }
    });


    function validatorInsertSong(song, callbackFunction) {
        let errors = [];
        if (song.title === null || typeof song.title === 'undefined' || song.title.trim().length === 0)
            errors.push({
                "value": song.title,
                "msg": "El titulo de la canción no puede estar vacio",
                "param": "title",
                "location": "body"
            })
        if (song.kind === null || typeof song.kind === 'undefined' || song.kind.trim().length === 0)
            errors.push({
                "value": song.kind,
                "msg": "el género de la canción no puede estar vacio",
                "param": "kind",
                "location": "body"
            })
        if (song.price === null || typeof song.price === 'undefined' || song.price < 0 ||
            song.price.toString().trim().length === 0)
            errors.push({
                "value": song.price,
                "msg": "El precio de la canción no puede ser negativo",
                "param": "price",
                "location": "body"
            })
        if (errors.length <= 0)
            callbackFunction(null);
        else
            callbackFunction(errors);
    }

    app.put('/api/v1.0/songs/:id', function (req, res) {
        try {
            let songId = new ObjectId(req.params.id);
            let filter = {_id: songId};
            const options = {upsert: false};
            let song = {
                author: userInSession.email
            };
            if (typeof req.body.title !== "undefined" && req.body.title !== null)
                song.title = req.body.title;
            if (typeof req.body.kind !== "undefined" && req.body.kind !== null)
                song.kind = req.body.kind;
            if (typeof req.body.price !== "undefined" && req.body.price !== null)
                song.price = req.body.price;

            validatorInsertSong(song, function (errors) {
                if (errors !== null && errors.length > 0) {
                    res.status(422);
                    res.json({errors: errors});
                } else {
                    songsRepository.updateSong(song, filter, options).then(result => {
                        if (result === null) {
                            res.status(404);
                            res.json({errors: "ID inválido o no existe, no se ha actualizado la canción."});
                        } else if (result.modifiedCount === 0) {
                            res.status(409);
                            res.json({errors: "No se ha modificado ninguna canción."});
                        } else {
                            res.status(200);
                            res.json({
                                message: "Canción modificada correctamente.",
                                result: result
                            });
                        }
                    }).catch(error => {
                        res.status(500);
                        res.json({errors: "Se ha producido un error al modificar la canción."});
                    });
                }
            });
        } catch (e) {
            res.status(500);
            res.json({errors: "Se ha producido un error al intentar modificar la canción: " + e});
        }
    });

    app.post('/api/v1.0/users/login', function(req, res) {
        try {
            let securePassword = app.get('crypto').createHmac('sha256', app.get('clave'))
                .update(req.body.password).digest('hex');
            let filter = {
                email: req.body.email,
                password: securePassword
            };
            let options = {};
            usersRepository.findUser(filter, options).then(user => {
                if (user == null) {
                    res.status(401); //Unauthorized
                    res.json({
                        message: "usuario no autorizado",
                        authenticated: false
                    })
                } else {
                    userInSession = user;
                    let token = app.get('jwt').sign(
                        {user: user.email, time: Date.now() / 1000},
                        "secreto");
                    res.status(200);
                    res.json({
                        message: "usuario autorizado",
                        authenticated: true,
                        token: token
                    })
                }
            }).catch(error => {
                res.status(401);
                res.json({
                    message: "Se ha producido un error al verificar credenciales",
                    authenticated: false
                })
            })
        } catch (e) {
            res.status(500);
            res.json({
                message: "Se ha producido un error al verificar credenciales",
                authenticated: false
            })
        }
    });

}