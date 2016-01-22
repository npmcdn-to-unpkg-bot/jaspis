(function() {
'use strict';

angular
    .module('gridjs-test.editor')
    .directive('editorArrange', editorArrangeDirective)
    .controller('EditorArrangeMenuController', [EditorArrangeMenuController])
    .directive('editorArrangeMenu', editorArrangeMenuDirective)
    .controller('EditorArrangeController', ['$scope', 'arrangedFilter', EditorArrangeController]);

function editorArrangeMenuDirective() {
    return {
        templateUrl: 'editor/layout/arrange-menu.html',
        scope: {
            dataset: '=',
            availableUnits: '=',
            getStep: '=',
            resetNewElement: '=',
            arrange: '='
        },
        controller: 'EditorArrangeMenuController',
        bindToController: true,
        controllerAs: 'menu'
    };
}

function EditorArrangeMenuController() {
    if (!this.arrange) {
        this.arrange = {};
    }
    var arrange = this.arrange;

    arrange.zoom = 1;
    arrange.width = 600;

    this.adjustZoomAfterScaleChange = function() {
        if (!arrange.shouldScaleDown) {
            arrange.zoom = 1;
        }
    };
}

function editorArrangeDirective() {
    return {
        templateUrl: 'editor/layout/arrange.html',
        scope: {
            dataset: '=',
            elements: '=',
            selectElement: '=',
            selectedElementIndex: '=',
            units: '=',
            arrange: '=',
        },
        controller: 'EditorArrangeController',
        controllerAs: 'vm',
        bindToController: true,
    };
}

function EditorArrangeController($scope, arranged) {
    this._adjustZoomThrottled = null;

    this.arrange.zoom = this.arrange.zoom || 1;

    this.arrange.addItem = this.addItem.bind(this);
    this.arrange.removeItem = this.removeItem.bind(this);
}

EditorArrangeController.prototype.getContainerCssSize = function() {
    this.adjustZoomThrottled();

    var width = this.getContainerWidth();
    var maxWidth = this.getContainerMaxWidth();
    var height = this.getContainerHeight();

    return {
        width: width,
        'max-width': maxWidth,
        height: height,
    };
};

EditorArrangeController.prototype.getContainerWidth = function() {
    return this.arrange.shouldScaleDown ?
        '100%' :
        this.arrange.width * this.arrange.zoom + this.units.width;
};

EditorArrangeController.prototype.getContainerHeight = function() {
    var farthestElement = _.max(this.elements, distance);
    if (farthestElement === -Infinity) return '0' + this.units.height;
    var height = Math.floor(distance(farthestElement) * this.arrange.zoom);
    return height + this.units.height;
};

EditorArrangeController.prototype.getContainerMaxWidth = function() {
    return this.arrange.shouldScaleDown ? this.arrange.width + 'px' : 'auto';
};

EditorArrangeController.prototype.adjustZoom = function() {
    if (this.arrange.shouldScaleDown) {
        var zoom = this.readWidth() / this.arrange.width;
        this.arrange.zoom = zoom < 1 ? zoom : 1;
    }
};

EditorArrangeController.prototype.adjustZoomThrottled = 
    _.throttle(EditorArrangeController.prototype.adjustZoom, 20);

EditorArrangeController.prototype.getElementClass = function(element) {
    return {
        'element--positioned': true, 
        'element--selected': element.index === this.selectedElementIndex 
    };
};

EditorArrangeController.prototype.getElementCss = function(element) {
    var width = Math.floor(element.width * this.arrange.zoom);
    var height = Math.floor(element.height * this.arrange.zoom);
    var left = Math.floor(element.left * this.arrange.zoom);
    var top = Math.floor(element.top * this.arrange.zoom);

    return {
        width: width + this.units.width,
        height: height + this.units.height,
        left: left + this.units.width,
        top: top + this.units.height,
    };
};

EditorArrangeController.prototype.addItem = function(element) {
    var elements = _.filter(this.elements, { isArranged: true });
    var farthestElement = _.max(elements, function(element) {
        return element.top + element.height;
    });
    var height = _.max([this.dataset.rowHeight, farthestElement.height || 0]);
    var top = farthestElement !== -Infinity && farthestElement.top !== null ?
        farthestElement.top + height : 0;

    element.left = 0;
    element.top = top;

    element.isArranged = true;
};

EditorArrangeController.prototype.removeItem = function(element) {
    element.left = null;
    element.top = null;

    element.isArranged = false;
};

EditorArrangeController.prototype.moveElement = function(direction, element) {
    switch (direction) {
        case 'left': element.left -= this.dataset.columnWidth; break;
        case 'top': element.top -= this.dataset.rowHeight; break;
        case 'right': element.left += this.dataset.columnWidth; break;
        case 'bottom': element.top += this.dataset.rowHeight; break;
    }
};

EditorArrangeController.prototype.canMove = function(direction, element) {
    var isEdge = false;
    var wontCollide = false;
    var moved = null;

    switch (direction) {
        case 'left': 
            isEdge = !(element.left > 0); 
            var movedLeft = element.left - this.dataset.columnWidth;
            moved = _.merge({}, element, { left: movedLeft });
            break;
        case 'top': 
            isEdge = !(element.top > 0);
            var movedTop = element.top - this.dataset.rowHeight;
            moved = _.merge({}, element, { top: movedTop });
            break;
        case 'right': 
            isEdge = !(element.left + element.width < this.arrange.width);
            var movedRight = element.left + this.dataset.columnWidth;
            moved = _.merge({}, element, { left: movedRight });
            break;
        case 'bottom': 
            isEdge = false; 
            var movedBottom = element.top + this.dataset.rowHeight;
            moved = _.merge({}, element, { top: movedBottom });
            break;
    }

    if (isEdge) return false;

    var elements = _.filter(this.elements, { isArranged: true });
    wontCollide = !willCollide(moved, elements)

    return wontCollide;
};

function willCollide(element, elements) {
    var overlappingElems = getHeightOverlappingElements(element, elements);

    if (!overlappingElems.length) return false;
    
    overlappingElems = getWidthOverlappingElements(element, overlappingElems);

    return overlappingElems.length > 0;
}

function getHeightOverlappingElements(element, elements) {
    return _.filter(elements, function (otherElem) {
        if (element.index === otherElem.index) return false;
        var doesOverlap = isOverlappingVertically({
            top: element.top,
            bottom: element.top + element.height,
        }, {
            top: otherElem.top,
            bottom: otherElem.top + otherElem.height,
        });
        return doesOverlap;
    })
};

function getWidthOverlappingElements(element, elements) {
    return _.filter(elements, function (otherElem) {
        if (element.index === otherElem.index) return false;
        var doesOverlap = isOverlappingHorizontally({
            left: element.left,
            right: element.left + element.width,
        }, {
            left: otherElem.left,
            right: otherElem.left + otherElem.width,
        });
        return doesOverlap;
    })
};

function isOverlappingVertically(elem, otherElem) {
    var first = otherElem.top > elem.top ? elem : otherElem;
    var second = first === elem ? otherElem : elem;
    return (second.top >= first.top && second.top < first.bottom)
        || (second.bottom > first.top && second.bottom <= first.bottom)
        || (second.top < first.top && second.bottom > first.bottom);
}

function isOverlappingHorizontally(elem, otherElem) {
    var first = otherElem.left > elem.left ? elem : otherElem;
    var second = first === elem ? otherElem : elem;
    return (second.left >= first.left && second.left < first.right)
        || (second.right > first.left && second.right <= first.right)
        || (second.left < first.left && second.right > first.right);
}

EditorArrangeController.prototype.isHorizontalEdge = function(element) {
    return element.left > 0 && 
        element.left + element.width < this.arrange.width;
};

EditorArrangeController.prototype.isVerticalEdge = function(element) {
    return element.top > 0;
};

function distance(element) {
    return element.height + element.top;
}

}());