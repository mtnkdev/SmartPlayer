var mm = require('musicmetadata');
var fs = require('fs');
var uuid = require('node-uuid');

process.on('message', function(msg){
    getMetadatas(msg.musics);
});

var FindTagsWorker = function(){

    var albuns = [];
    var albunsPath = [];
    
    this.get = function(musics, i, metadatas, lastPercent, callback){
        var self = this;
        var percent = 0;
        var splitFileName = [];

        mm(fs.createReadStream(musics[i]), {duration: true}, function(err, data){
            if(data){
                data.musicPath = musics[i];
                splitFileName = musics[i].split("/");
                splitFileName = splitFileName[splitFileName.length-1].split(".");
                data.fileName = splitFileName[0];

                data.picture = self.storeImage(data.artist + "-" + data.album, data.picture);

                metadatas.push(data);

                percent = parseInt(i * 100 / musics.length);
                if(lastPercent != percent){
                    process.send({isLoading: true, percent: percent});
                    lastPercent = percent;
                }
            }
            i++;
            if(i < musics.length) self.get(musics, i, metadatas, lastPercent, callback);
            else return callback(metadatas);
        });
    };

    this.storeImage = function(album, image){
        if(typeof image == "undefined") return "";
        if(typeof image == "object" && (image.length == 0 || (image.length > 0 && image[0].format == ""))) return "";
        
        var exists = false;
        var path = "";
        for(var i = 0; i < albuns.length; i++) {
            if(albuns[i] == album) {
                exists = true;
                path = albunsPath[i];
            }
        }

        if(!exists){
            path = process.env.PWD + "/SmartPlayer/pictures/" + uuid.v4() + "." + image[0].format;
            var self = this;
            try{
                var fileCreated = fs.writeFileSync(path, image[0].data, 'base64');
                albuns.push(album);
                albunsPath.push(path);
            } catch(e){
                fs.mkdirSync(process.env.PWD + "/SmartPlayer");
                fs.mkdirSync(process.env.PWD + "/SmartPlayer/pictures");
                self.storeImage(image);
            }
        }
        return path;
    };
};

function getMetadatas(musics){
    var findTagsWorker = new FindTagsWorker();
    findTagsWorker.get(musics, 0, [], null, function(metadatas){
        process.send({isLoading: true, percent: 100});
        process.send({isLoading: false, 'metadatas': metadatas});
    });
}