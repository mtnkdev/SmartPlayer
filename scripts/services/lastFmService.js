var http = require('http');

app.service('LastFmService', function(DbService, $q){

    this.getArtistInfo = function(artist, i){
        var that = this;
        var deferred = $q.defer();
        deferred.notify("Getting");

        var request = 'http://ws.audioscrobbler.com/2.0/?format=json&method=artist.getinfo&lang=en&api_key=ae9dc375e16f12528b329b25a3cca3ee&artist=' + artist;
        
        http.get(request, function(result){
            if(result.statusCode == "200"){
                var body = "";
                result.on("data", function(data){
                    body += data;
                });

                result.on("end", function(){
                    var parsed = JSON.parse(body);
                    if(typeof i != "undefined"){
                        parsed.i = i;
                        parsed.request = request;
                    }
                    body = JSON.stringify(parsed);

                    if(typeof parsed.error == "undefined") deferred.resolve(body);
                    else deferred.reject(body);
                });
            }
        });
        return deferred.promise;
    }
});