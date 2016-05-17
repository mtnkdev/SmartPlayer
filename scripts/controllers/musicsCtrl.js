var gui =   require('nw.gui');

var win = gui.Window.get();

app.controller('MusicsCtrl', function($scope, $window, fileDialog, SettingsService, MusicsService, LastFmService){

    /**
     * Variables
     */
    $scope.loadBarMusics = 0;
    $scope.showMusicsAlbum = false;
    $scope.savingMusics = false;
    var player = document.getElementById("audioPlayer");
    var popupOptions = document.getElementById('popupOptions');
    var popupProperties = document.getElementById('popupProperties');
    var popupBtnProperties = document.getElementById('popupBtnProperties');
    var bkgPopup = document.getElementById('bkgPopup');
    var _artist = "";
    var _album = "";
    var shiftPressed = false;
    var indexLastClicked = -1;
    var musicsSelected = [];

    /**
     * Get the musicsPath from the tb_settings table to set the
     * view to show or not the musics path config div.
     */
    SettingsService.get().then(
        function(result){
            if(result != null && result.musics_path != '') {
                $scope.isSettedMusicsPath = true;
                $scope.musicsPath = result.musicsPath;
                $scope.showMusics(false);
            } else {
                $scope.isSettedMusicsPath = false;
            }
        }, function(error){
            $scope.isSettedMusicsPath = false;
        }
    );

    popupBtnProperties.onclick = btnPropertiesOnClick;
    bkgPopup.onclick = bkgPopupOnClick;

    /**
     * Save the musics path in the tb_settings selected in the view
     * @return {null}
     */
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
                            SettingsService.update(newData).then(musicsPathSaved);
                        } else {
                            var newData = {
                                userPhoto: "",
                                musicsPath: dirName
                            };
                            SettingsService.insert(newData).then(musicsPathSaved);
                        }
                    }
                );
            }
        );
    };

    /**
     * Show the musics based on the type of the view selected.
     * The view can be: showByMusics, showByAlbums or showByArtists.
     * @param  {Boolean} refresh If it is true, then the tb_musics rows is deleted
     * and the a new table is poppuled based in the musicsPath setted before.
     * @return {null}
     */
    $scope.showMusics = function(refresh){
        if(refresh){
            MusicsService.delete().then(
                function(success){
                    if(success) {
                        console.log("Musics deleted!");
                        MusicsService.refreshMusics($scope.musicsPath).then(
                            function(result){
                                console.log(result);
                                $window.location.reload();
                            }, function(error){

                            }, function(update){
                                $scope.loadBarMusics = update;
                            }
                        );
                    } else console.log("Musics deleted error!");
                }, function(error){
                    console.log("Musics deleted error!");
                }
            );
        } else {
            //View: Show By Musics
            if($scope.view == "showByMusics"){
                MusicsService.getAll("fileName").then(
                    function(result){
                        if(result == null) {
                            console.log("Musics null...");
                            $scope.isSettedMusicsPath = false;
                        } else {
                            if(result.length > 0){
                                console.log("Musics: " + result.length);
                                $scope.musics = result;
                                $scope.musics.sort(orderByAlbum);
                            } else $scope.isSettedMusicsPath = false;
                        }
                    }, function(error){
                        console.log(error);
                    }
                );
            } 
            //View: Show By Albums
            else if($scope.view == "showByAlbums"){
                MusicsService.getAlbums().then(
                    function(result){
                        if(result == null) console.log("Albums null...");
                        else {
                            console.log("Albums: " + result.length);
                            $scope.albums = result;
                        }
                    }, function(error){
                        console.log(error);
                    }
                );
            }
            //View: Show By Artists
            else if($scope.view == "showByArtists"){
                MusicsService.getArtists('artist').then(
                    function(result){
                        if(result == null) console.log("Artists null...");
                        else {
                            console.log("Artists: " + result.length);
                            
                            var that = this;
                            for(var i = 0; i < result.length; i++){
                                
                                if((result[i].artistPicture == null || result[i].artistPicture == "") && result[i].artist != ""){
                                    result[i].artistPicture = "no picture";
                                    
                                    /*******************************
                                     * Get LastFm artist picture
                                     *******************************/
                                    LastFmService.getArtistInfo(result[i].artist, i).then(
                                        function(success){
                                            var parsed = JSON.parse(success);
                                            for(var j = 2; j >= 0; j--){
                                                if(typeof parsed.artist.image[j] != "undefined" && parsed.artist.image[j]["#text"] != ""){
                                                    result[parsed.i].artistPictureSet = parsed.artist.image[j]["#text"];
                                                    MusicsService.updateArtistPicture(result[parsed.i].artist, result[parsed.i].artistPictureSet).then(
                                                        function(success){
                                                            console.log("Saved artist picture: " + result[parsed.i].artist + " - " + result[parsed.i].artistPictureSet);
                                                        }, function(error){
                                                            console.log("Fail to save artist picture: " + result[parsed.i].artist + " - " + result[parsed.i].artistPictureSet);
                                                        }
                                                    );
                                                    break;
                                                }
                                            }
                                        }, function(error){
                                            var parsed = JSON.parse(error);
                                            console.log("Cannot get artist picture: " + result[parsed.i].artist);
                                        }
                                    );
                                    /********************************
                                     * End of get artist picture
                                     ********************************/
                                }
                            }

                            $scope.artists = result;
                        }
                    }, function(error){
                        console.log(error);
                    }
                );
            }
        }
    };

    /**
     * Handle the click in a music table row to play the music
     * and emit a handle message to playerController
     * or only select a range of the musics (if the shift key is pressed)
     * @param  {String} uuid      UUID of the music table row
     * @param  {String} musicPath Path of the music table row
     * @return {null}
     */
    $scope.musicPlayClick = function(uuid, musicPath){
        popupOptions.style.display = 'none';
        popupProperties.style.display = 'none';
        bkgPopup.style.display = 'none';
        if(shiftPressed) {
            selectMultiLines(uuid);
            return;
        } else {
            indexLastClicked = getIndexFromMusicClicked(uuid);
            musicsSelected = [];
        }

        if($scope.view == "showByAlbums"){
            $scope.$emit('handleEmit', {type: 'loadMusicsByAlbum', artist: _artist, album: _album});
            $scope.$emit('handleEmit', {type: 'reorderMusics', orderBy: 'track'});
        } else if($scope.view == "showByArtists"){
            $scope.$emit('handleEmit', {type: 'loadMusicsByArtist', artist: _artist});
            $scope.$emit('handleEmit', {type: 'reorderMusics', orderBy: 'track'});
        }
        $scope.$emit('handleEmit', {type: 'playMusic', uuid: uuid, musicPath: musicPath});
    };

    /**
     * Handle the order by click (on the head of the musics table)
     * and emit a handle message to playerController
     * @param  {String} order Type of the order (Can be: album, track, title or duration)
     * @return {null}
     */
    $scope.orderBy = function(order){
        switch(order){
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
        $scope.$emit('handleEmit', {type: 'reorderMusics', orderBy: order});
    };

    /**
     * Open an album musics view clicked on the albums view
     * @param  {String} artist Artist of the album
     * @param  {String} album  Album title
     * @return {null}
     */
    $scope.openAlbum = function(artist, album){
        _artist = artist;
        _album = album;
        MusicsService.getMusicsByArtistAlbum(artist, album).then(
            function(result){
                console.log("Musics: " + result.length);
                $scope.showMusicsAlbum = true;
                $scope.musics = result;
                $scope.musics.sort(orderByTrack);
            }, function(error){
                $scope.showMusicsAlbum = false;
                console.log("Erro: " + error);
            }
        );
    };

    /**
     * Open an artist musics view clicked in the artists view
     * @param  {String} artist  Artist name
     * @param  {String} picture Artist picture path
     * @return {null}
     */
    $scope.openArtist = function(artist, picture){
        $scope.artistPicture = picture;
        _artist = artist;
        MusicsService.getMusicsByArtist(artist).then(
            function(result){
                console.log("Musics: " + result.length);
                $scope.showMusicsArtist = true;
                $scope.musics = result;
                $scope.musics.sort(orderByTrack);
            }, function(error){
                $scope.showMusicsArtist = false;
                $scope.artistPicture = null;
                console.log("Erro: " + error);
            });
    };

    /**
     * Back from album musics view to albums view
     * @return {null}
     */
    $scope.backToAlbums = function(){
        $scope.showMusicsAlbum = false;
        $scope.musics = null;
        musicsSelected = [];
    };

    /**
     * Back from artist musics view to artists view
     * @return {null}
     */
    $scope.backToArtists = function(){
        $scope.showMusicsArtist = false;
        $scope.musics = null;
        musicsSelected = [];
    };

    /**
     * Handle the KeyDown event from the general div
     * @param  {[type]} event Event of the key
     * @return {null}
     */
    $scope.onKeyDown = function(event){
        var keydown = getKeyboardEventResult(event);
        if(keydown == 16) shiftPressed = true;
    }

    /**
     * Handle the KeyUp event from the general div
     * @param  {Object} event Event of the key
     * @return {null}
     */
    $scope.onKeyUp = function(event){
        var keyup = getKeyboardEventResult(event);
        if(keyup == 16) shiftPressed = false;
    }

    /**
     * Handle the Right Click on the table row
     * @param  {String} uuid UUID from the music row
     * @return {[type]}      TODO
     */
    $scope.onRightClick = function(event, music){
        popupProperties.style.display = 'none';
        bkgPopup.style.display = 'none';
        if(!isSelected(music.uuid)){
            musicsSelected = [];
            indexLastClicked = getIndexFromMusicClicked(music.uuid);
            unselectAllMusics();
            selectMusics(music);
        }

        showOptionsPopup();
    }

    /**
     * Handle the broadcast messages from other controllers
     */
    $scope.$on('handleBroadcast', function(event, args){
        if(args.type == 'musicPlaying'){
            selectMusicPlaying(args.uuid);
        }
    });

    /**
     * Select the music that is playing
     * @param  {String} UUID of the music playing
     * @return {null}
     */
    function selectMusicPlaying(uuid){
        var divTable = document.getElementById('contentTableMusics');
        var rows = document.getElementsByClassName("rows");
        var row = document.getElementById("row_" + uuid);
        var musicPlaying = document.getElementById("txtMusicPlaying");
        musicPlaying.value = uuid;
        if(rows.length == 0) return;
        for(var i = 0; i < rows.length; i++) rows[i].style.backgroundColor = "transparent";
        
        if(row) row.style.backgroundColor = "#E91E63";
    }

    /**
     * Calls the show musics if the musics path is saved
     * @param  {Object} result Result of musics configMusicsPath
     * @return {null}
     */
    function musicsPathSaved(result){
        if(result == true || typeof result == "undefined") $scope.showMusics(true);
    }

    /**
     * Order musics by album
     * @param  {Object} a music a
     * @param  {Object} b music b
     * @return {int}   -1 to b > a... 0 to same... 1 to a > b...
     */
    function orderByAlbum(a, b){
        if(a.album.toLowerCase() < b.album.toLowerCase()) return -1;
        else if(a.album.toLowerCase() > b.album.toLowerCase()) return 1;
        else if(a.album.toLowerCase() == b.album.toLowerCase()){
            return a.track - b.track;
        }
    }

    /**
     * Order musics by track number
     * @param  {Object} a music a
     * @param  {Object} b music b
     * @return {int}   -1 to b > a... 0 to same... 1 to a > b...
     */
    function orderByTrack(a, b){
        var aInt = a.track;
        var bInt = b.track;
        if(typeof aInt == "string") aInt = parseInt(aInt.split(',')[0]);
        if(typeof bInt == "string") bInt = parseInt(bInt.split(',')[0]);
        return aInt - bInt;
    }

    /**
     * Order musics by title
     * @param  {Object} a music a
     * @param  {Object} b music b
     * @return {int}   -1 to b > a... 0 to same... 1 to a > b...
     */
    function orderByTitle(a, b){
        if(a.title.toLowerCase() < b.title.toLowerCase()) return -1;
        else if(a.title.toLowerCase() > b.title.toLowerCase()) return 1;
        return 0;
    }

    /**
     * Order musics by duration
     * @param  {Object} a music a
     * @param  {Object} b music b
     * @return {int}   -1 to b > a... 0 to same... 1 to a > b...
     */
    function orderByDuration(a, b){
        return a.duration - b.duration;
    }

    /**
     * Key the code of the keyEvent
     * @param  {event} keyEvent Event of the key
     * @return {int}         Code of the event 
     */
    function getKeyboardEventResult(keyEvent){
      return (window.event ? keyEvent.keyCode : keyEvent.which);
    }

    /**
     * Select all lines between indexLastClicked and actual click in row of the table musics
     * @param  {String} uuid UUID of the row clicked
     * @return {null}
     */
    function selectMultiLines(uuid){
        var index = getIndexFromMusicClicked(uuid);
        if(index > indexLastClicked){
            for(var i = indexLastClicked; i <= index; i++){
                selectMusics($scope.musics[i]);
            }
        } else if(index < indexLastClicked){
            for(var i = indexLastClicked; i >= index; i--){
                selectMusics($scope.musics[i]);
            }
        }
    }

    /**
     * Check if the actual row is on the musicsSelected array.
     * If not, them add this to the array and select the row
     * in the table.
     * @param  {Object} music Music to be selected
     * @return {null}
     */
    function selectMusics(music){
        for(var i = 0; i < musicsSelected.length; i++) if(musicsSelected[i].uuid == music.uuid) return;
        console.log(music.uuid);
        musicsSelected.push(music);
        var row = document.getElementById("row_" + music.uuid);
        if(row) row.style.backgroundColor = "#E91E63";
    }

    /**
     * Get the index in the $scope.musics array by the UUID
     * of the music clicked
     * @param  {String} uuid UUID of the music clicked
     * @return {int}         Index from music
     */
    function getIndexFromMusicClicked(uuid){
        var index = -1;
        for(var i = 0; i < $scope.musics.length; i++){
            if(uuid == $scope.musics[i].uuid){
                index = i;
                break;
            }   
        }
        return index;
    }

    /**
     * Check if the music is selected by UUID
     * @param  {String}  uuid UUID of the music
     * @return {Boolean}      True to selected. False to not selected.
     */
    function isSelected(uuid){
        var musicPlaying = document.getElementById("txtMusicPlaying");
        if(musicPlaying.value == uuid) return true;

        for(var i = 0; i < musicsSelected.length; i++){
            if(musicsSelected[i].uuid == uuid) return true;
        }
        return false;
    }

    /**
     * Unselect all musics (only put the backgroundColor in transparent)
     * @return {null}
     */
    function unselectAllMusics(){
        var row = null;
        for(var i = 0; i < $scope.musics.length; i++){
            row = document.getElementById('row_' + $scope.musics[i].uuid);
            if(row) row.style.backgroundColor = 'transparent';
            row = null;
        }
    }

    /**
     * Hide background popup and popups openned
     * @return {null}
     */
    function bkgPopupOnClick(){
        bkgPopup.style.display = 'none';
        var popups = document.getElementsByClassName('popup');

        if(popups.length == 0) return;

        for(var i = 0; i < popups.length; i++) popups[i].style.display = 'none';
    }

    /**
     * Show the popup with options
     * @return {null}
     */
    function showOptionsPopup(){
        var width = 150;
        var height = 40;

        var LeftPosition = (window.innerWidth) ? (window.innerWidth-width) / 2 : 0;
        var TopPosition = (window.innerHeight) ? (window.innerHeight-height) / 2 : 0;

        popupOptions.style.width = width + "px";
        popupOptions.style.height = height + "px";
        popupOptions.style.top = TopPosition + "px";
        popupOptions.style.left = LeftPosition + "px";

        popupOptions.style.display = 'block';
        bkgPopup.style.display = 'block';
    }

    /**
     * Function of button properties
     * @return {null}
     */
    function btnPropertiesOnClick(){
        if(musicsSelected.length == 0) return;

        var width = 200;
        var height = 350;

        var LeftPosition = (window.innerWidth) ? (window.innerWidth-width) / 2 : 0;
        var TopPosition = (window.innerHeight) ? (window.innerHeight-height) / 2 : 0;

        popupProperties.style.width = width + "px";
        popupProperties.style.height = height + "px";
        popupProperties.style.top = TopPosition + "px";
        popupProperties.style.left = LeftPosition + "px";

        var txtFileName = document.getElementById('fileName');
        var txtTitle = document.getElementById('title');
        var txtArtist = document.getElementById('artist');
        var txtAlbum = document.getElementById('album');
        var txtYear = document.getElementById('year');
        var txtComment = document.getElementById('comment');
        var txtTrack = document.getElementById('track');
        var txtGenre = document.getElementById('genre');

        var trackSplit = musicsSelected[0].track.split(',');
        if(trackSplit.length > 0) trackNum = trackSplit[0];

        var fileName = musicsSelected[0].fileName;
        var title = musicsSelected[0].title;
        var artist = musicsSelected[0].artist;
        var album = musicsSelected[0].album;
        var year = musicsSelected[0].year;
        var comment = musicsSelected[0].comment;
        var track = trackNum;
        var genre = musicsSelected[0].genre;
        trackSplit = "";

        txtFileName.readOnly = false;
        txtFileName.style.color = '#000';
        txtTitle.readOnly = false;
        txtTitle.style.color = '#000';
        txtArtist.readOnly = false;
        txtArtist.style.color = '#000';
        txtAlbum.readOnly = false;
        txtAlbum.style.color = '#000';
        txtYear.readOnly = false;
        txtYear.style.color = '#000';
        txtComment.readOnly = false;
        txtComment.style.color = '#000';
        txtTrack.readOnly = false;
        txtTrack.style.color = '#000';
        txtGenre.readOnly = false;
        txtGenre.style.color = '#000';

        for(var i = 0; i < musicsSelected.length; i++){
            trackSplit = musicsSelected[i].track.split(',');
            if(trackSplit.length > 0) trackNum = trackSplit[0];
            else trackNum = musicsSelected[i].track;

            if(musicsSelected[i].fileName != fileName) {
                fileName = "<Diversos>";
                txtFileName.readOnly = true;
                txtFileName.style.color = '#aaa';
            }
            if(musicsSelected[i].title != title) {
                title = "<Diversos>";
                txtTitle.readOnly = true;
                txtTitle.style.color = '#aaa';
            }
            if(musicsSelected[i].artist != artist) {
                artist = "<Diversos>";
                txtArtist.readOnly = true;
                txtArtist.style.color = '#aaa';
            }
            if(musicsSelected[i].album != album) {
                album = "<Diversos>";
                txtAlbum.readOnly = true;
                txtAlbum.style.color = '#aaa';
            }
            if(musicsSelected[i].year != year) {
                year = "<Diversos>";
                txtYear.readOnly = true;
                txtYear.style.color = '#aaa';
            }
            if(musicsSelected[i].comment != comment) {
                comment = "<Diversos>";
                txtComment.readOnly = true;
                txtComment.style.color = '#aaa';
            }
            if(trackNum != track) {
                track = "<Diversos>";
                txtTrack.readOnly = true;
                txtTrack.style.color = '#aaa';
            }
            if(musicsSelected[i].genre != genre) {
                genre = "<Diversos>";
                txtGenre.readOnly = true;
                txtGenre.style.color = '#aaa';
            }
        }

        txtFileName.value = fileName;
        txtTitle.value = title;
        txtArtist.value = artist;
        txtAlbum.value = album;
        txtYear.value = year;
        txtComment.value = comment;
        txtTrack.value = track;
        txtGenre.value = genre;

        popupProperties.style.display = 'block';
        bkgPopup.style.display = 'block';
    }
});