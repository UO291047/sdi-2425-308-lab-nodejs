const {ObjectId} = require("mongodb");
module.exports = function(app, songsRepository) {

    app.get("/songs", function(req, res) {
        let songs = [{
            "title": "Blank space",
            "price": "1.2"
        }, {
            "title": "See you again",
            "price": "1.3"
        }, {
            "title": "Uptown Funk",
            "price": "1.1"
        }];

        let response = {
            seller: 'Tienda de canciones',
            songs: songs
        };
        res.render("shop.twig", response);
    });

    app.get('/add', function(req, res) {
        let response = parseInt(req.query.num1) + parseInt(req.query.num2);

        res.send(String(response));
    });

    app.get('/songs/add', function (req, res) {
        res.render("songs/add.twig");
    });

    app.post('/songs/add', function(req, res, next){
        let song = {
            title: req.body.title,
            kind: req.body.kind,
            price: req.body.price,
            author: req.session.user
        }
        songsRepository.insertSong(song, function(result) {
            if(result.songId !== null && result.songId !== undefined) {
                if (req.files != null) {
                    let image = req.files.cover;
                    image.mv(app.get("uploadPath") + '/public/covers/' + result.songId + '.png')
                        .then(() => {
                            if (req.files.audio != null) {
                                let audio = req.files.audio;
                                audio.mv(app.get("uploadPath") + '/public/audios/' + result.songId + '.mp3')
                                    .then(res.redirect("/publications"))
                                    .catch(error => next({error, message: "Error con el archivo de audio", status: error.status, stack: error.stack}));
                            }else {
                                res.redirect("/publications");
                            }
                        })
                        .catch(error => next({error, message: "Error con la portada", status: error.status, stack: error.stack}));
                } else {
                    res.redirect("/publications");
                }
            } else{
                next({error: result.error, message: "Error con la portada", status: result.error.status, stack: result.error.stack});
            }
        });
    });

    app.get('/songs/edit/:id', function(req, res, next) {
        let filter = {_id: new ObjectId(req.params.id)};
        let options = {};
        songsRepository.findSong(filter, options).then(song => {
            res.render("songs/edit.twig", {song: song});
        }).catch(error => {
            next({error, message: "Error al buscar la canción", status: error.status, stack: error.stack})
        });
    });
    app.post('/songs/edit/:id', function (req, res, next) {
        let song = {
            title: req.body.title,
            kind: req.body.kind,
            price: req.body.price,
            author: req.session.user
        }
        let songId = req.params.id;
        let filter = {_id: new ObjectId(songId)};
        //que no se cree un documento nuevo, si no existe
        const options = {upsert: false}
        songsRepository.updateSong(song, filter, options).then(result => {
            step1UpdateCover(req.files, songId, function (result) {
                if (result == null) {
                    next(new Error("Error al actualizar la portada o el audio de la canción"));
                } else {
                    res.redirect("/publications");
                }
            });
        }).catch(error => {
            next({error, message: "Error al actualizar la canción", status: error.status, stack: error.stack})
        });
    });

    function step1UpdateCover(files, songId, callback) {
        if (files && files.cover != null) {
            let image = files.cover;
            image.mv(app.get("uploadPath") + '/public/covers/' + songId + '.png', function (err) {
                if (err) {
                    callback(null); // ERROR
                } else {
                    step2UpdateAudio(files, songId, callback); // SIGUIENTE
                }
            });
        } else {
            step2UpdateAudio(files, songId, callback); // SIGUIENTE
        }
    }

    function step2UpdateAudio(files, songId, callback) {
        if (files && files.audio != null) {
            let audio = files.audio;
            audio.mv(app.get("uploadPath") + '/public/audios/' + songId + '.mp3', function (err) {
                if (err) {
                    callback(null); // ERROR
                } else {
                    callback(true); // FIN
                }
            });
        } else {
            callback(true); // FIN
        }
    }

    app.get('/songs/delete/:id', function (req, res, next) {
        let filter = {_id: new ObjectId(req.params.id)};
        songsRepository.deleteSong(filter, {}).then(result => {
            if (result === null || result.deletedCount === 0) {
                next(new Error("No se ha podido eliminar el registro"));
            } else {
                res.redirect("/publications");
            }
        }).catch(error => {
            next({error, message: "Error al borrar la canción", status: error.status, stack: error.stack})
        });
    })

    app.post('/songs/buy/:id', function (req, res, next) {
        let songId = new ObjectId(req.params.id);
        let shop = {
            user: req.session.user,
            song_id: songId
        }
        songsRepository.buySong(shop).then(result => {
            if (result.insertedId === null || typeof (result.insertedId) === undefined) {
                next(new Error("Se ha producido un error al comprar la canción"));
            } else {
                res.redirect("/purchases");
            }
        }).catch(error => {
            next({error, message: "Error al comprar la canción", status: error.status, stack: error.stack})
        })
    });

    app.get('/songs/:id', function (req, res, next) {
        let songId = new ObjectId(req.params.id);
        let user = req.session.user;
        let filter = {_id: songId};
        let options = {};
        songsRepository.findSong(filter, options).then(song => {
            userCanBuySong(user, songId, function (canBuySong) {
                let settings = {
                    url: "https://api.currencyapi.com/v3/latest?apikey=cur_live_IOY8VqYL9kgls2tQVAJ4XTrlgRx7Gc5nuitJKi2u&base_currency=EUR&currencies=USD",
                    method: "get",
                }
                let rest = app.get("rest");
                rest(settings, function (error, response, body) {
                    console.log("cod: " + response.statusCode + " Cuerpo :" + body);
                    let responseObject = JSON.parse(body);
                    let rateUSD = responseObject.data.USD.value;
                    // nuevo campo "usd" redondeado a dos decimales
                    let songValue = song.price / rateUSD
                    song.usd = Math.round(songValue * 100) / 100;
                    res.render("songs/song.twig", {song: song, canBuySong: canBuySong});
                })
            })
        }).catch(error => {
            next({error, message: "Se ha producido un error al buscar la canción", status: error.status, stack: error.stack})
        });
    });

    function userCanBuySong(user, songId, callback) {
        let filter = {_id: new ObjectId(songId)};
        songsRepository.findSong(filter, {}).then(song => {
            let isAuthor = song.author === user;
            if (isAuthor) {
                callback(false); // No puede comprar su propia canción
                return;
            }

            let purchaseFilter = {user: user, song_id: songId};
            songsRepository.getPurchases(purchaseFilter, {}).then(purchases => {
                let hasPurchased = purchases.length > 0;
                callback(!hasPurchased); // Puede comprar si no ha comprado antes
            }).catch(error => {
                callback(false); // Error al buscar compras, no puede comprar
            });
        }).catch(error => {
            callback(false); // Error al buscar la canción, no puede comprar
        });
    }

    app.get('/songs/:kind/:id', function(req, res) {
        let response = 'id: ' + req.params.id + '<br>'
            + 'Tipo de música: ' + req.params.kind;
        res.send(response);
    });

    app.get('/promo*', function (req, res) {

        res.send('Respuesta al patrón promo*');
    });
    app.get('/pro*ar', function (req, res) {
        res.send('Respuesta al patrón pro*ar');
    });

    app.get('/shop', function(req, res, next) {
        let filter = {};
        let options = {sort: { title: 1}};
        if(req.query.search != null && typeof(req.query.search) != "undefined" && req.query.search !== ""){
            filter = {"title": {$regex: ".*" + req.query.search + ".*"}};
        }
        let page = parseInt(req.query.page); // Es String !!!
        if (typeof req.query.page === "undefined" || req.query.page === null || req.query.page === "0") {
            //Puede no venir el param
            page = 1;
        }
        songsRepository.getSongsPg(filter, options, page).then(result => {
            let lastPage = result.total / 4;
            if (result.total % 4 > 0) { // Sobran decimales
                lastPage = lastPage + 1;
            }
            let pages = []; // paginas mostrar
            for (let i = page - 2; i <= page + 2; i++) {
                if (i > 0 && i <= lastPage) {
                    pages.push(i);
                }
            }
            let response = {
                songs: result.songs,
                pages: pages,
                currentPage: page
            }
            res.render("shop.twig", response);
        }).catch(error => {
            next({error, message: "Error al obtener las canciones", status: error.status, stack: error.stack})
        });
    });

    app.get('/publications', function (req, res, next) {
        let filter = {author : req.session.user};
        let options = {sort: {title: 1}};
        songsRepository.getSongs(filter, options).then(songs => {
            res.render("publications.twig", {songs: songs});
        }).catch(error => {
            next({error, message: "Se ha producido un error al listar las publicaciones del usuario", status: error.status, stack: error.stack})
        });
    });

    app.get('/purchases', function (req, res, next) {
        let filter = {user: req.session.user};
        let options = {projection: {_id: 0, song_id: 1}};
        songsRepository.getPurchases(filter, options).then(purchasedIds => {
            const purchasedSongs = purchasedIds.map(song => song.song_id);
            let filter = {"_id": {$in: purchasedSongs}};
            let options = {sort: {title: 1}};
            songsRepository.getSongs(filter, options).then(songs => {
                res.render("purchase.twig", {songs: songs});
            }).catch(error => {
                next({error, message: "Se ha producido un error al listar las publicaciones del usuario", status: error.status, stack: error.stack})
            });
        }).catch(error => {
            next({error, message: "Se ha producido un error al listar las publicaciones del usuario", status: error.status, stack: error.stack})
        });
    })


};