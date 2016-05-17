app.controller('PlayerCtrl', function($scope, fileDialog, SettingsService, MusicsService){

    var player = document.getElementById("audioPlayer");
    var audioLoaderBar = document.getElementById("audioProgressBar");
    var audioLoaderBarPreview = document.getElementById("audioProgressBarPreview");
    var audioBubbleProgress = document.getElementById("audioBubbleProgress");
    var bkgAudioProgressBar = document.getElementById("bkgAudioProgressBar");
    var invisibleBkgAudioProgressBar = document.getElementById("invisibleBkgAudioProgressBar");
    var spanCurrentTime = document.getElementById('spanCurrentTime');
    var musicsPlayed = [];
    var actualMusic = 0;
    var audioMouseClicked = false;
    $scope.currentTime = "0:00";

    setEventListeners();

    MusicsService.getAll("fileName").then(
        function(result){
            if(result == null) {
                console.log("Musics null...");
                $scope.musics = null;
            } else {
                console.log("Musics: " + result.length);
                $scope.musics = result;
                $scope.musics.sort(orderByAlbum);
            }
        }, function(error){
            console.log(error);
        }
    );

    $scope.$on('handleBroadcast', function(event, args){
        if(args.type == 'playMusic'){
            $scope.playMusic(args.uuid, args.musicPath);
        } else if(args.type == 'loadMusicsByAlbum'){
            MusicsService.getMusicsByArtistAlbum(args.artist, args.album).then(
                function(result){
                    $scope.musics = result;
                    $scope.musics.sort(orderByTrack);
                }, function(error){
                    console.log("Musics is null..");
                }
            );
        } else if(args.type == 'loadMusicsByArtist'){
            MusicsService.getMusicsByArtist(args.artist).then(
                function(result){
                    $scope.musics = result;
                    $scope.musics.sort(orderByTrack);
                }, function(error){
                    console.log("Musics is null..");
                }
            );
        } else if(args.type == 'reorderMusics'){
            switch(args.orderBy){
                case "album":
                    $scope.musics.sort(orderByAlbum);
                    break;
                case 'track':
                    $scope.musics.sort(orderByTrack);
                    break;
                case 'title':
                    $scope.musics.sort(orderByTitle);
                    break;
                case 'duration':
                    $scope.musics.sort(orderByDuration);
                    break;
            }
        }
    });

    $scope.playMusic = function(uuid, musicPath){
        var txtUuid = document.getElementById("txtMusicPlaying");
        txtUuid.value = uuid;

        if(player != null){
            if(!player.ended){
                player.pause();
            }
            player.src = musicPath;
            player.play();
            $scope.$emit('handleEmit', {type: 'musicPlaying', uuid: uuid, musicPath: musicPath});
        }
    }

    $scope.btnPlayClick = function(){
        var playButton = document.getElementById("playButton");

        if(playButton.innerHTML == "\uE036") player.pause();
        else player.play();
    }

    $scope.btnNextClick = function(){
        playNextMusic();
    }

    $scope.btnPreviousClick = function(){
        var randomEnabled = document.getElementById("txtRandomEnabled");

        if(randomEnabled.value == "0"){
            var uuid = document.getElementById("txtMusicPlaying");
            var musicPrevious = null;

            for(var i = 0; i < $scope.musics.length; i++){
                if($scope.musics[i].uuid == uuid.value && i == 0){
                    musicPrevious = $scope.musics[$scope.musics.length-1];
                    break
                } else if($scope.musics[i].uuid == uuid.value){
                    musicPrevious = $scope.musics[i-1];
                    break;
                }
            }

            if(musicPrevious != null) $scope.playMusic(musicPrevious.uuid, musicPrevious.musicPath);
        } else {
            if(actualMusic > 1){
                actualMusic--;
                $scope.playMusic(musicsPlayed[actualMusic-1].uuid, musicsPlayed[actualMusic-1].musicPath);
            }
        }
    }

    $scope.btnRandomClick = function(){
        var randomEnabled = document.getElementById("txtRandomEnabled");
        var btnRandom = document.getElementById("btnRandom");

        if(randomEnabled.value == "0") {
            randomEnabled.value = "1";
            btnRandom.style.color = "#E91E63";
        } else {
            randomEnabled.value = "0";
            btnRandom.style.color = "#DDD";
        }
    }

    $scope.btnLoopClick = function(){
        var loopEnabled = document.getElementById("txtLoopEnabled");
        var btnLoop = document.getElementById("btnLoop");

        if(loopEnabled.value == "0") {
            loopEnabled.value = "1";
            btnLoop.style.color = "#E91E63";
        } else {
            loopEnabled.value = "0";
            btnLoop.style.color = "#DDD";
        }
    }

    function setEventListeners(){
        var eventsCreated = document.getElementById("txtEventsCreated");
        if(eventsCreated.value == "0"){
            txtEventsCreated.value = "1";

            player.ontimeupdate = onTimeUpdate;

            player.onplay = onPlay;

            player.onpause = onPause;

            player.onended = onEnded;

            invisibleBkgAudioProgressBar.addEventListener("click", audioChangeTime);
            invisibleBkgAudioProgressBar.addEventListener("mousemove", audioMouseMove);
            invisibleBkgAudioProgressBar.addEventListener("mouseleave", audioMouseLeave);
        }
    }

    function onTimeUpdate(){
        spanCurrentTime.innerHTML = player.currentTime.toString().toHHMMSS(true);
        var totalBar = bkgAudioProgressBar.offsetWidth;
        var duration = player.duration;
        var position = (player.currentTime * totalBar / duration);

        audioLoaderBar.style.width = position + "px";
        
        if(!audioMouseClicked) {
            if(position < totalBar - 10) audioBubbleProgress.style.marginLeft = position + "px";
            else audioBubbleProgress.style.marginLeft = (totalBar-10) + "px";
        }
    }

    function onPlay(){
        var playButton = document.getElementById("playButton");
        playButton.innerHTML = "&#xE036;";

        var musicName = document.getElementById("txtMusicName");
        var musicArtist = document.getElementById("txtMusicArtist");
        var musicAlbum = document.getElementById("txtMusicAlbum");
        var imgAlbum = document.getElementById("imgAlbum");
        var music = getActualMusic();

        if(music != null){
            musicName.innerHTML = music.musicName;
            musicArtist.innerHTML = music.artist;
            musicAlbum.innerHTML = music.album;
            
            imgAlbum.src = music.albumSet;
        }
    }

    function onPause(){
        var playButton = document.getElementById("playButton");
        playButton.innerHTML = "&#xE039;";
    }

    function onEnded(){
        var loopEnabled = document.getElementById("txtLoopEnabled");

        if(loopEnabled.value == 1){
            var musicPlaying = getActualMusic();
            if(musicPlaying != null) $scope.playMusic(musicPlaying.uuid, musicPlaying.musicPath);
        } else playNextMusic();
    }

    function getActualMusic(){
        var uuid = document.getElementById("txtMusicPlaying");
        var music = null;
        
        for(var i = 0; i < $scope.musics.length; i++){
            if($scope.musics[i].uuid == uuid.value){
                music = $scope.musics[i];
                break;
            }
        }

        return music;
    }

    function audioChangeTime(e){
        if(player.src == "") return;
        var x = e.clientX;
        var music = getActualMusic();
        var duration = music.duration;
        var totalBar = bkgAudioProgressBar.offsetWidth;

        var position = parseInt(duration * x / totalBar);

        player.currentTime = position;
        if(audioMouseClicked) audioMouseClicked = false;
    }

    function audioMouseLeave(e){
        audioLoaderBarPreview.style.width = "0px";
    }

    function audioMouseMove(e){
        if(player.src == "") return;
        var x = e.clientX;
        audioLoaderBarPreview.style.width = x + "px";
    }

    function orderByAlbum(a, b){
        if(a.album.toLowerCase() < b.album.toLowerCase()) return -1;
        else if(a.album.toLowerCase() > b.album.toLowerCase()) return 1;
        else if(a.album.toLowerCase() == b.album.toLowerCase()){
            return a.track - b.track;
        }
    }

    function orderByTrack(a, b){
        var aInt = a.track;
        var bInt = b.track;
        if(typeof aInt == "string") aInt = parseInt(aInt.split(',')[0]);
        if(typeof bInt == "string") bInt = parseInt(bInt.split(',')[0]);
        return aInt - bInt;
    }

    function orderByTitle(a, b){
        if(a.title.toLowerCase() < b.title.toLowerCase()) return -1;
        else if(a.title.toLowerCase() > b.title.toLowerCase()) return 1;
        return 0;
    }

    function orderByDuration(a, b){
        return a.duration - b.duration;
    }

    function playNextMusic(){
        var randomEnabled = document.getElementById("txtRandomEnabled");
        
        if(randomEnabled.value == "0"){ //If the random is disabled, get the next music in sequence
            var uuid = document.getElementById("txtMusicPlaying");
            var musicNext = null;

            for(var i = 0; i < $scope.musics.length; i++){
                if(i == $scope.musics.length-1) {
                    musicNext = $scope.musics[0];
                    break;
                } else if($scope.musics[i].uuid == uuid.value){
                    musicNext = $scope.musics[i+1];
                    break;
                }
            }

            if(musicNext != null) $scope.playMusic(musicNext.uuid, musicNext.musicPath);
        } else { //If random is enabled, get the musics historical to get the next music to play
            if(actualMusic < musicsPlayed.length){
                var music = musicsPlayed[actualMusic];
                actualMusic++;
                $scope.playMusic(music.uuid, music.musicPath);
            } else {
                var validRandom = false;
                var random = 0;
                var music = null;

                if(musicsPlayed.length >= $scope.musics.length) musicsPlayed = [];

                while(!validRandom){
                    random = Math.floor((Math.random() * $scope.musics.length) + 1);
                    music = $scope.musics[random-1];
                    if(musicsPlayed.length > 0){
                        validRandom = true;
                        for(var i = 0; i < musicsPlayed.length; i++){
                            if(music.uuid == musicsPlayed[i].uuid){
                                validRandom = false;
                                break;
                            }
                        }
                    } else validRandom = true;
                }
                
                musicsPlayed.push(music);
                actualMusic++;
                $scope.playMusic(music.uuid, music.musicPath);
            }
        }
    }
});