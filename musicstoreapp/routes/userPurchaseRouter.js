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
            next(new Error("No puedes comprar tu propia canción"));
            return;
        }

        let purchaseFilter = {user: req.session.user, song_id: songId};
        songsRepository.getPurchases(purchaseFilter, {}).then(purchases => {
            if (purchases.length > 0) {
                next(new Error("Ya has comprado esta canción"));
            } else {
                next();
            }
        }).catch(error => {
            next({error, message: "Error al buscar las canciones ya compradas", status: error.status, stack: error.stack});
        });
    }).catch(error => {
        next({error, message: "Error al buscar la canción", status: error.status, stack: error.stack});
    });
});

module.exports = userPurchaseRouter;