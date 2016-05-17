var path = require('path');

var app = angular.module("AppModule", ['ui.router', 'DWand.nw-fileDialog']);

String.prototype.toHHMMSS = function (hiddenHours) {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}

    var time = hours+':'+minutes+':'+seconds;
    if(hiddenHours == true && hours == "00") time = minutes+':'+seconds;
    return time;
}

app.config(function($stateProvider, $urlRouterProvider){

    $urlRouterProvider.otherwise('/');

    $stateProvider
        .state('showByMusics', {
            url: '/',
            templateUrl: 'views/musics/showByMusics.html',
            controller: 'MusicsCtrl'
        }).state('showByArtists', {
            url: '/showByArtists',
            templateUrl: 'views/musics/showByArtists.html',
            controller: 'MusicsCtrl'
        }).state('showByAlbums', {
            url: '/showByAlbums',
            templateUrl: 'views/musics/showByAlbums.html',
            controller: 'MusicsCtrl'
        }).state('showSettings', {
            url: '/showSettings',
            templateUrl: 'views/system/showSettings.html',
            controller: 'SettingsCtrl'
        });
});

app.run(function(DbService, $rootScope){
    DbService.init();

    $rootScope.$on('handleEmit', function(event, args) {
        $rootScope.$broadcast('handleBroadcast', args);
    });
});