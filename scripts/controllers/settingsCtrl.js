app.controller('SettingsCtrl', function($scope, SettingsService, MusicsService, fileDialog, $location){

    $scope.savingMusics = false;

    SettingsService.get().then(
        function(result){
            console.log("Result: " + result);
            $scope.settings = result;
        }, function(error){
            $scope.settings = null;
        }
    );

    $scope.configMusicsPath = function(){
        fileDialog.openDir(
            function(dirName) {
                $scope.musicsPath = dirName;
                SettingsService.get().then(
                    function(result){
                        if(result != null) {
                            var newData = {
                                userPhoto: result.userPhoto,
                                musicsPath: dirName
                            };
                            SettingsService.update(newData).then(
                                function(result){
                                    refreshMusics();
                                }, function(error){

                                }
                            );
                        } else {
                            var newData = {
                                userPhoto: "",
                                musicsPath: dirName
                            };
                            SettingsService.insert(newData).then(
                                function(result){
                                    refreshMusics();
                                }, function(error){

                                }
                            );
                        }
                    }
                );
            }
        );
    };

    function refreshMusics(){
        MusicsService.delete().then(
            function(success){
                if(success) {
                    console.log("Musics deleted!");
                    MusicsService.refreshMusics($scope.musicsPath).then(
                        function(result){
                            $location.path("/showByMusics");
                        }, function(error){

                        }, function(update){
                            if(update == "saving") {
                                console.log("SALVANDO");
                                $scope.savingMusics = true;
                            } else $scope.loadBarMusics = update;
                        }
                    );
                } else console.log("Musics deleted error!");
            }, function(error){
                console.log("Musics deleted error!");
            }
        );
    }
});