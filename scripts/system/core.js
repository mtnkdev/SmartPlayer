var gui =   require('nw.gui'),
            appGUI = {};

appGUI.getGUI = gui.Window.get();

// close the App
appGUI.close = function () {
    console.log("Close");
    var guiWin = this.getGUI;
    if (process.platform !== "darwin") {
        guiWin.close(true);
    }
    else {
        guiWin.hide();
    }
};

// minimize the App
appGUI.minimize = function () {
    var guiWin = this.getGUI;
    guiWin.minimize();
};

// maximize the App
appGUI.maximize = function () {
    var guiWin = this.getGUI;
    if (guiWin.isMaximized) {
        guiWin.unmaximize();
        guiWin.isMaximized = false;
    } else {
        guiWin.maximize();
        guiWin.isMaximized = true;
    }
};