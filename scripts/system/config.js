app.constant('DB_CONFIG', {
    name: 'DB',
    tables: [
        {
            name: 'tb_settings',
            columns: [
                {name: 'id', type: 'integer primary key'},
                {name: 'userPhoto', type: 'text'},
                {name: 'musicsPath', type: 'text'}
            ],
            rebuild: false
        },
        {
            name: 'tb_musics',
            columns: [
                {name: 'uuid', type: 'text primary key'},
                {name: 'musicPath', type: 'text'},
                {name: 'fileName', type: 'text'},
                {name: 'title', type: 'text'},
                {name: 'artist', type: 'text'},
                {name: 'album', type: 'text'},
                {name: 'year', type: 'text'},
                {name: 'comment', type: 'text'},
                {name: 'track', type: 'text'},
                {name: 'genre', type: 'text'},
                {name: 'duration', type: 'real'},
                {name: 'albumPath', type: 'text'},
                {name: 'artistPicture', type: 'text'},
                {name: 'artistUrl', type: 'text'}
            ],
            rebuild: false
        }
    ]
});