const express = require('express');
const path = require("path");
const {ObjectId} = require("mongodb");
const songsRepository = require("../repositories/songsRepository");
const userPurchaseRouter = express.Router();

userPurchaseRouter.use(function (req, res, next) {
    let songId = path.basename(req.originalUrl);
    let filter = {_id: new ObjectId(songId)};

    songsRepository.findSong(filter, {}).then(song => {

        let isAuthor = song.author === req.session.user;
        if (isAuthor) {
            res.send("No puedes comprar tu propia canción");
            return;
        }

        let purchaseFilter = {user: req.session.user, song_id: songId};
        songsRepository.getPurchases(purchaseFilter, {}).then(purchases => {
            if (purchases.length > 0) {
                res.send("Ya has comprado esta canción");
            } else {
                next();
            }
        }).catch(error => {
            res.send("Se ha producido un error al verificar las compras del usuario: " + error);
        });
    }).catch(error => {
        res.send("Se ha producido un error al buscar la canción: " + error);
    });
});

module.exports = userPurchaseRouter;