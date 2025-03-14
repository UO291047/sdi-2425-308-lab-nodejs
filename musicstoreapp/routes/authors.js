module.exports = function(app) {

    app.get('/authors/add', function (req, res) {
        let roles = [{
            "rol": "Violinista"
        }, {
            "rol": "Cantante"
        }, {
            "rol": "Pianista"
        }];

        let response = {
            roles: roles
        };

        res.render("authors/add.twig", response);
    });

    app.post('/authors/add', function(req, res){
        let response = "";

        if(req.body.name == null || typeof(req.body.name) == "undefined" || req.body.name === ""){
            response += "Parámetro 'name' no enviado en la petición." + " <br> ";
        }
        if(req.body.group == null || typeof(req.body.group) == "undefined" || req.body.group === ""){
            response += "Parámetro 'group' no enviado en la petición." + " <br> ";
        }
        if(req.body.rol == null || typeof(req.body.rol) == "undefined"){
            response += "Parámetro 'rol' no enviado en la petición." + " <br> ";
        }

        if(response === ""){
            response = "Autor agregado: " + req.body.name + " <br> "
                + " Grupo: " + req.body.group + " <br> "
                + " Rol: " + req.body.rol;
        }

        res.send(response);
    })

    app.get('/authors/filter/:rol', function (req, res) {
        let authors = [{
            "name": "Author 1",
            "group": "Group A",
            "rol": "Violinista"
        }, {
            "name": "Author 2",
            "group": "Group A",
            "rol": "Violinista"
        }, {
            "name": "Author 3",
            "group": "Group A",
            "rol": "Cantante"
        }];

        let authorsFilter = [];

        for (const author of authors) {
            if(author.rol === req.params.rol)
                authorsFilter.push(author);
        }

        let response = {
            authors: authorsFilter
        };

        res.render("authors/authors.twig", response);
    });

    app.get('/authors/', function (req, res) {
        let authors = [{
            "name": "Author 1",
            "group": "Group A",
            "rol": "Violinista"
        }, {
            "name": "Author 2",
            "group": "Group A",
            "rol": "Violinista"
        }, {
            "name": "Author 3",
            "group": "Group A",
            "rol": "Cantante"
        }];

        let response = {
            authors: authors
        };

        res.render("authors/authors.twig", response);
    });

    app.get('/author*', function (req, res) {
        res.redirect("/authors/");
    });
    app.get('/authors/*', function (req, res) {
        res.redirect("/authors/");
    });

};