app.service('SettingsService', function(DbService){
    
    this.get = function(){
        return DbService.query("SELECT * FROM tb_settings").then(
            function(result){
                var settings = DbService.fetch(result);
                if(settings == null) return null;
                else return settings;
            }, function(error){
                return null;
            }
        );
    };

    this.update = function(data){
        if(data.userPhoto == null || data.userPhoto == "null") data.userPhoto = "";
        if(data.musicsPath == null || data.musicsPath == "null") data.musicsPath = "";
        var sql = "UPDATE tb_settings SET userPhoto = ?, musicsPath = ? WHERE id = ?";

        return DbService.query(sql, [data.userPhoto, data.musicsPath, 1]).then(
            function(result){
                return true;
            }, function(error){
                return false;
            }
        );
    }

    this.insert = function(data){
        if(data.userPhoto == null || data.userPhoto == "null") data.userPhoto = "";
        if(data.musicsPath == null || data.musicsPath == "null") data.musicsPath = "";
        var sql = "INSERT INTO tb_settings (id, userPhoto, musicsPath) VALUES (?, ?, ?)";

        return DbService.query(sql, [1, data.userPhoto, data.musicsPath]).then(
            function(result){
                if(result) return true;
                else return false;
            }, function(error){
                return false;
            }
        );
    }
});