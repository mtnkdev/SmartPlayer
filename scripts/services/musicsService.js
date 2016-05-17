'use strict';
var cp = require('child_process');
var fs = require('fs');
var uuid = require('node-uuid');
var moment = require('moment');

app.service('MusicsService', function(DbService, $q, $timeout, $rootScope){

    var that = null;
    
    this.refreshMusics = function(musicsPath){
        var that = this;
        var deferred = $q.defer();
        var files = readDir(musicsPath, []);
        //var files = readDir('/home/renatonolo/Documentos/Teste', []);

        if(files.length > 0){
            var worker = cp.fork('./scripts/workers/findTagsWorker.js');
            worker.on('message', function(msg) {
                if(msg.isLoading) deferred.notify(msg.percent);
                else {
                    var musics = msg.metadatas;
                    var percent = 0;

                    recursiveInsertMusics(that, deferred, musics, 0);
                }
            });
            worker.send({'musics': files});
        }
        return deferred.promise;
    };

    this.insert = function(musicPath, tags){
        if(tags == null) {
            tags = {
                title: "",
                artist: "",
                album: "",
                year: "",
                comment: "",
                track: "",
                genre: "",
                duration: 0
            };
        } else {
            if(typeof tags.title == "undefined") tags.title = "";
            if(typeof tags.artist == "undefined") tags.artist = [];
            if(typeof tags.album == "undefined") tags.album = "";
            if(typeof tags.albumartist == "undefined")
            if(typeof tags.year == "undefined") tags.year = "";
            if(typeof tags.comment == "undefined") tags.comment = "";
            if(typeof tags.track == "undefined") tags.track = {no: 0, of: 0};
            if(typeof tags.disk == "undefined") tags.disk = {no: 0, of: 0};
            if(typeof tags.genre == "undefined") tags.genre = [];
            if(typeof tags.duration == "undefined") tags.duration = "0";

            if(typeof tags.artist == "object") tags.artist = tags.artist.join();
            if(typeof tags.albumartist == "object") tags.albumartist = tags.albumartist.join();
            if(isNaN(tags.track) && tags.track != null) tags.track = tags.track.no + "," + tags.track.of;
            if(typeof tags.disk == "object" && tags.disk != null) tags.disk = tags.disk.no + "," + tags.disk.of;
            else tags.disk = 0;
            if(typeof tags.genre == "object") tags.genre = tags.genre.join();
        }
        var sql = "INSERT INTO tb_musics (uuid, musicPath, fileName, title, artist, album, year, comment, track, genre, duration, albumPath, artistPicture, artistUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        var bindings = [uuid.v4(), musicPath, tags.fileName, tags.title, tags.artist, tags.album, tags.year, tags.comment, tags.track, tags.genre, tags.duration, tags.picture, "", ""];
        return DbService.query(sql, bindings).then(
            function(success){
                return true;
            }, function(error){
                return false;
            }
        );
    };

    this.delete = function(){
        var sql = "DELETE FROM tb_musics";
        return DbService.query(sql).then(
            function(success){
                deleteFolderRecursive(process.env.PWD + "/SmartPlayer");
                return true;
            }, function(error){
                return false;
            }
        );
    }

    this.getAll = function(orderBy){
        var sql = "SELECT * FROM tb_musics ORDER BY " + orderBy;
        return DbService.query(sql).then(
            function(success){
                var result = DbService.fetchAll(success);
                if(result) return clearMusics(result);
                else return null;
            }, function(error){
                console.error("Error, MusicsService->getAll(): " + error.message);
                return null;
            }
        );
    }

    this.getAlbums = function(orderBy){
        var sql = "SELECT album, artist, albumPath FROM tb_musics GROUP BY album ORDER BY album";
        return DbService.query(sql).then(
            function(success){
                var result = DbService.fetchAll(success);
                if(result) return clearAlbums(result);
                else return null;
            }, function(error){
                console.error("Error, MusicsService->getAlbums(): " + error.message);
                return null;
            }
        );
    };

    this.getMusicsByArtistAlbum = function(artist, album){
        var indexOf = artist.split(" ");
        if(indexOf.length > 1) artist = indexOf[0];

        var sql = "SELECT * FROM tb_musics WHERE artist like '%" + artist + "%' AND album = ? ORDER BY title";
        if(album == "") sql = "SELECT * FROM tb_musics WHERE album = ? ORDER BY title";
        
        return DbService.query(sql, [album]).then(
            function(success){
                var result = DbService.fetchAll(success);
                if(result) return clearMusics(result);
                else return null;
            }, function(error){
                console.error("Error, MusicsService->getMusicsByArtistAlbum(): " + error.message);
                return null;
            }
        );
    }

    this.getMusicsByArtist = function(artist){
        var sql = "SELECT * FROM tb_musics WHERE artist = ? ORDER BY title";

        return DbService.query(sql, [artist]).then(
            function(success){
                var result = DbService.fetchAll(success);
                if(result) return clearMusics(result);
                else return null;
            }, function(error){
                console.error("Error, MusicsService->getMusicsByArtist(): " + error.message);
                return null;
            }
        );
    }

    this.getArtists = function(){
        var sql = "SELECT artist, artistPicture, artistUrl FROM tb_musics GROUP BY artist ORDER BY artist";

        return DbService.query(sql).then(
            function(success){
                var result = DbService.fetchAll(success);
                if(result) return clearArtist(result);
                else return null;
            }, function(error){
                console.log("Error, MusicsService->getArtists(): " + error.message);
                return null;
            }
        );
    }

    this.updateArtistPicture = function(artist, picture){
        var sql = "UPDATE tb_musics SET artistPicture = ? WHERE artist = ?";

        return DbService.query(sql, [picture, artist]).then(
            function(success){
                return true;
            }, function(error){
                console.log("Error, MusicsService->updateArtistPicture(): " + error.message);
                return false;
            }
        );
    }
});

function readDir(path, filesArr){
    var files = fs.readdirSync(path);

    if(files.length > 0){
        for(var ind = 0; ind < files.length; ind++){
            var splitName = files[ind].split(".");
            if(splitName.length > 1){
                if(splitName[1] == "mp3"){
                    filesArr.push(path + "/" + files[ind]);
                }
            } else {
                var newArr = readDir(path + "/" + files[ind], filesArr);
                if(newArr != null) filesArr.concat(newArr);
            }
        }
        return filesArr;
    } else return null;
}

function deleteFolderRecursive(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

function clearMusics(result){
    for(var i = 0; i < result.length; i++){
        result[i].durationFormatted = result[i].duration.toString().toHHMMSS(true);
        result[i].trackNum = result[i].track.split(',');
        if(result[i].trackNum.length < 2) result[i].trackNum = parseInt(result[i].track);
        else result[i].trackNum = result[i].track.split(',')[0];
        result[i].trackOf = result[i].track.split(',')[1];
        if(typeof result[i].title != "undefined" && result[i].title != "") result[i].musicName = result[i].title;
        else result[i].musicName = result[i].fileName;

        //Album Path
        result[i].shortAlbum = result[i].album;
        if(result[i].album.length > 34) result[i].shortAlbum = result[i].album.substr(0, 31) + "...";
        if(result[i].albumPath == "") result[i].albumSet = path.resolve(path.dirname()) + "/assets/images/unknown_music.jpg";
        else result[i].albumSet = result[i].albumPath;
    }
    return result;
}

function clearAlbums(result){
    for(var i = 0; i < result.length; i++){
        result[i].shortAlbum = result[i].album;
        if(result[i].album.length > 34) result[i].shortAlbum = result[i].album.substr(0, 31) + "...";
        if(result[i].albumPath == "") result[i].albumSet = path.resolve(path.dirname()) + "/assets/images/unknown_music.jpg";
        else result[i].albumSet = result[i].albumPath;
    }
    return result;
}

function clearArtist(result){
    for(var i = 0; i < result.length; i++){
        if(result[i].artistPicture == null || result[i].artistPicture == "" || result[i].artistPicture == "no picture") result[i].artistPictureSet = path.resolve(path.dirname()) + "/assets/images/unknown_artist.jpg";
        else result[i].artistPictureSet = result[i].artistPicture;
    }
    return result;
}

function recursiveInsertMusics(that, deferred, musics, i){
    that.insert(musics[i].musicPath, musics[i]).then(function(success){
        if(success) console.log("Music saved in the database...");
        else console.log("Music not saved in the database...");

        var percent = 0;
        percent = i * 100 / musics.length;
        deferred.notify(percent);

        if(i < musics.length-1){
            i++;
            recursiveInsertMusics(that, deferred, musics, i);
        } else {
            deferred.notify(100);
            deferred.resolve("Musics loaded...");
            return true;
        }

    }, null);
}