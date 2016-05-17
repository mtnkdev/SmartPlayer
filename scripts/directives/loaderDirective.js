app.directive("loader", function(){
    return {
        restrict: 'E',
        templateUrl: 'views/common/loaderDirective.html',
        scope: {
            value: '@',
            infinite: '='
        },
        link: function(scope, element, attr) {
            if(attr.value > 0 && attr.value <= 100){
                var loaderBar = element.find()
                element.css({
                    display: 'block'
                });
                element.find('#loaderBar').css({
                    width: attr.value+"%"
                });
            } else {
                element.css({
                    display: 'none'
                });
            }

            scope.$watch('value', function(value){
                if(value > 0 && value < 100){
                    element.css({
                        display: 'block'
                    });
                } else {
                    element.css({
                        display: 'none'
                    });
                }
                element.find('#loaderBar').css({
                    width: value+"%",
                });
            }, true);
        }
    };
});