var EOL = (function(eol,$) {
  var global = this;

  var toRadians = function(angleDegrees) {
    return angleDegrees * Math.PI / 180;
  };

  var toDegrees = function(angleRadians) {
    return angleRadians * 180 / Math.PI;
  };

  var polyFeature_ = null;

  var stroke_ = new ol.style.Stroke({
    color: 'blue',
    width: 3
  });

  var fill_ = new ol.style.Fill({
    color: 'rgba(0, 0, 255, 0.1)'
  });

  var numSides_ = 6;

  function setSides(n) {
    setAngle( numSides_ = n );
  }
  
  function setAngle(n) {
    num = n || numSides_;
    return toRadians(360/num/2);
  }

  var angle_ = setAngle();
  var res_ = null;
  var radiusM_ = null;
  var radius_ = null;

  function calcMapRadius(radiusMeters,view,point) {
    if (typeof view === 'undefined' || view === null) throw new Error('must have a view');
    if (typeof point === 'undefined' || point === null) point = view.getCenter();
    var pro = view.getProjection();
    var mpu = pro.getMetersPerUnit();
    var res = view.getResolution();
    var ptres = pro.getPointResolution(res, point);
    var mapRadius = radiusMeters / mpu / ptres;
    //var mapRadius = radiusMeters * res / mpu / ptres;
    return mapRadius;
  }

  function calcRadiusMeters(mapRadius,view,point) {
    if (typeof view === 'undefined' || view === null) throw new Error('must have a view');
    if (typeof point === 'undefined' || point === null) point = view.getCenter();
    var pro = view.getProjection();
    var mpu = pro.getMetersPerUnit();
    var res = view.getResolution();
    var ptres = pro.getPointResolution(res, point);
    var radiusMeters = mapRadius * mpu * ptres;
    //var radiusMeters = mapRadius * mpu * ptres / res;
    return radiusMeters;
  }

  var styleFun = function(res) {
    //console.log('styleFun res='+res+' old='+res_);

    //console.log('this'+this);console.log(this);
    //console.log('this.g'+this.getGeometry());console.log(this.getGeometry());

    //var scale = res_ / view.getResolution();

    if (!res_) res_ = res;

    var scale = res_ / res;
    //console.log('scale='+scale);

    //res_ = view.getResolution();
    res_ = res;

    radius_ *= scale;

    //console.log('radius_='+radius_);
    //console.log('radiusM='+calcRadiusMeters(radius_,view));

    return [new ol.style.Style({
      image: new ol.style.RegularShape({
        fill: fill_,
        stroke: stroke_,
        points: numSides_,
        radius: radius_,
        angle: angle_
      })
    })];

  }

  var coordinate_ = null;
  var cursor_ = 'pointer';
  var previousCursor_ = undefined;

  function polyHandleDownEvent(evt) {
    //console.log('down');

    var feature = evt.map.forEachFeatureAtPixel(evt.pixel,
      function(feature, layer) {
        //console.log('down feature='+feature);
        //console.log(feature);
        if (feature === polyFeature_)
          return feature;
      });

    if (feature) {
      coordinate_ = evt.coordinate; // save the anchor/down point
      if (evt.browserEvent.shiftKey) { // resize
        // immediate reset of size to current point
        var geometry = feature.getGeometry();
        var fc = geometry.getFirstCoordinate();
        var dX = coordinate_[0] - fc[0];
        var dY = coordinate_[1] - fc[1];
        var dist = Math.sqrt(dX*dX+dY*dY);
        //console.log('down+SHIFT!');

        // set the radius to the distance from center to current mouse location
        // disabled here due to UI klunkiness, still enabled in drag
        //radius_ = calcMapRadius(dist,evt.map.getView());
        //geometry.translate(0,0);
      }
      return true;
    }

    coordinate_ = null;
    return false;
  };

  var minRadius_ = 10;
  //var sizeChangeRate_ = 100;
  var rotateChangeRate_ = 33;

  function polyHandleDragEvent(evt) {
    //console.log('Drag');
    var dX = 0;
    var dY = 0;

    var feature = evt.map.forEachFeatureAtPixel(evt.pixel,
      function(feature, layer) {
        //console.log('drag feature='+feature);
        //console.log(feature);
        if (feature === polyFeature_)
          return feature;
      });

    if (!feature) return true;

    var geometry = feature.getGeometry();
    var fc = geometry.getFirstCoordinate();

    var transX = 0;
    var transY = 0;

    if (evt.browserEvent.shiftKey) { // resize
      //console.log('Drag+SHIFT!');
      //console.log('radius_='+radius_);

      var dX = evt.coordinate[0] - fc[0];
      var dY = evt.coordinate[1] - fc[1];
      var newDistCen = Math.sqrt(dX*dX+dY*dY);
      //console.log('newDistCen='+newDistCen);

      // fyi earlier examples using the distance from current to previous mouse location
      //   required dividing by sizeChangeRate_ to slow the change

      // set the radius to the distance from center to current mouse location,
      //   with a minimum
      // doesn't really seem to exactly track mouse location, but is smoother
      //   than dealing with distance to previous location (coordinate_)
      radius_ = Math.max(calcMapRadius(newDistCen,evt.map.getView()),minRadius_);

      //console.log('NEW radius_='+radius_);

      transX=0;transY=0; // don't move, just force a render with the new size
    }
    if (evt.browserEvent.altKey) { // rotate
      //console.log('Drag+ALT!');

      // http://stackoverflow.com/questions/21898090/calculate-angle-of-rotation
      var cenPrevX = coordinate_[0] - fc[0];
      var cenPrevY = coordinate_[1] - fc[1];
      var cenNewX = evt.coordinate[0] - fc[0];
      var cenNewY = evt.coordinate[1] - fc[1];
      var scalarProduct = cenPrevX*cenNewX + cenPrevY*cenNewY;
      var crossProduct = cenPrevX*cenNewY - cenPrevY*cenNewX;
      var rotAngle = Math.atan(crossProduct,scalarProduct);
      //console.log('angle='+angle);

      angle_ -= rotAngle/rotateChangeRate_;

      transX=0;transY=0; // don't move, just force a render with the new angle
    }
    if (!evt.browserEvent.shiftKey && !evt.browserEvent.altKey) { // move
      var dX = evt.coordinate[0] - coordinate_[0];
      var dY = evt.coordinate[1] - coordinate_[1];
      var moveDist = Math.sqrt(dX*dX+dY*dY);
      //console.log('moveDist='+moveDist);
      transX = dX;
      transY = dY;
    }

    geometry.translate(transX, transY);

    fc = geometry.getFirstCoordinate();
    //console.log('fc='+fc);
    //console.log('ec='+evt.coordinate);
    var lonlat = ol.proj.transform(fc, evt.map.getView().getProjection(), 'EPSG:4326');
    // round to 5 decimals
    lonlat[0] = Math.round(lonlat[0]*10000)/10000;
    lonlat[1] = Math.round(lonlat[1]*10000)/10000;
    radiusM_ = calcRadiusMeters(radius_,evt.map.getView());
    var radiusKm = Math.round(radiusM_/100.0)/10.0;
    change({
      center:fc, lonlat:lonlat,
      radius:radius_, radiusKm:radiusKm,
      angle:angle_, angleDeg:Math.round(toDegrees(angle_))
    });

    coordinate_[0] = evt.coordinate[0];
    coordinate_[1] = evt.coordinate[1];
  };

  function polyHandleMoveEvent(evt) {
    //console.log('Move');
    // TODO?: show vertices and/or control points
    // e.g. resize on one vertex, rotate on another, move icon in center
   if (cursor_) {
      var feature = evt.map.forEachFeatureAtPixel(evt.pixel,
          function(feature, layer) {
           if (feature === polyFeature_)
              return feature;
          });
      var element = evt.map.getTargetElement();
      if (feature) {
        if (element.style.cursor != cursor_) {
          previousCursor_ = element.style.cursor;
          element.style.cursor = cursor_;
        }
      } else if (typeof previousCursor_ !== 'undefined') {
        element.style.cursor = previousCursor_;
        previousCursor_ = undefined;
      }
    }
  };

  function polyHandleUpEvent(evt) {
    //console.log('UP');
    coordinate_ = null;
    return false;
  };

  var element_ = null;
  var changeCallback_ = null;

  function change(data) {
    //console.log('change: lonlat='+data.lonlat+';radiusKm='+data.radiusKm+';angleDeg='+data.angleDeg);
    if (changeCallback_) return changeCallback_(data);
    if (typeof element_ === 'undefined' || element_ === null) return;

    var html = '<div class="eol-polygon-location">';
    html += '<span class="eol-polygon-center">Center:&nbsp;';
    html += data.lonlat[1] + ',&nbsp;' + data.lonlat[0];
    html += '</span>, <span class="eol-polygon-radius">Radius:&nbsp;';
    html += data.radiusKm + '&nbsp;Km';
    html += '</span></div>'
    element_.innerHTML = html;
    return html;
  };

  /**
   * Create a Polygon overlay (a Point styled by a RegularShape).
   * Click to drag, SHIFT+click to resize, ALT+click to rotate, SHIFT+ALT+click for both.
   * Parameters are a Map or an options object that includes a map key
   *
   * @param {ol.Map} map The instantiated Map to which to add a polygon.
   * @param {Number} sides Number of sides (i.e. number of vertices) (default 6).
   * @param {jQuery or DOMElement or String} element The jQuery element(s), DOM element,
   *   or id string of the element on which to set polygon information (lat,lon,radius).
   * @param {function} callback A function to call when the polygon information changes.
   *   Overrides setting of element. Receives an object with center (in map units),
   *   lonlat (in degrees), radius (in map units), radiusM (in meters),
   *   angle (in radians), angleDeg (degrees).
   * @param {Number} radius Initial radius in map units.
   * @param {Number} radiusM Initial radius in meters. If neither radius nor radiusM
   *   are given, then the default radiusM is 25000.
   * @param {Number} rotateChangeRate A divisor on the rotation angle change to avoid
   *   spinning out of control. default 33.
   * @param {ol.Coordinate} center Initial center location of polygon. Default
   *   is the center of the map's view.
   * @param {ol.style.Stroke} stroke The stroke with which to style the polygon lines.
   *   default is blue, width 3.
   * @param {ol.style.Fill} fill The fill with which to style the polygon interior.
   *   default is blue at alpha 0.1.
   *
   */
  eol.createPolygon = function(options) {
    if (typeof options === 'undefined' || options === null)
      throw new Error('must have a map or options');
    if (options instanceof ol.Map) options = {map:options};
    var map = options.map;
    if (!(map instanceof ol.Map)) throw new Error('must have a map');

    if (options.sides) setSides(options.sides);

    if (options.element) {
      if ( (typeof options.element === 'string') && (typeof $ === 'function') )
        element_ = $('#'+options.element).get(0);
      else if (typeof options.element === 'function')
        element_ = options.element.get(0);
      else element_ = options.element;
    } else if (typeof options.callback === 'function')
      changeCallback_ = options.callback;

    var view = map.getView();
    res_ = view.getResolution();

    if (options.radiusM) {
      radiusM_ = options.radiusM;
      radius_ = calcMapRadius(radiusM_,view);
    } else if (options.radius) {
      radius_ = options.radius;
      radiusM_ = calcRadiusMeters(radius_,view);
    } else {
      radiusM_ = 25000;
      radius_ = calcMapRadius(radiusM_,view);
    }

    if (options.stroke) stroke_ = stroke;
    if (options.fill) fill_ = fill;

    var center = options.center || view.getCenter();
    var point = new ol.geom.Point(center);
    polyFeature_ = new ol.Feature(point);
    polyFeature_.setStyle(styleFun);

    var source = new ol.source.Vector({
      features: [polyFeature_]
    });

    var vectorLayer = new ol.layer.Vector({
      source: source
    });

    map.addLayer(vectorLayer);

    var radiusKm = Math.round(radiusM_/100.0)/10.0;
    var lonlat = ol.proj.transform(center, view.getProjection(), 'EPSG:4326');
    lonlat[0] = Math.round(lonlat[0]*10000)/10000;
    lonlat[1] = Math.round(lonlat[1]*10000)/10000;
    change({
      center:center, lonlat:lonlat,
      radius:radius_, radiusKm:radiusKm,
      angle:angle_, angleDeg:Math.round(toDegrees(angle_))
    });

    if (options.rotateChangeRate) rotateChangeRate_ = options.rotateChangeRate;

    var polyDrag = new ol.interaction.Pointer({
      handleDownEvent: polyHandleDownEvent,
      handleDragEvent: polyHandleDragEvent,
      handleMoveEvent: polyHandleMoveEvent,
      handleUpEvent: polyHandleUpEvent
    });

    map.addInteraction(polyDrag);
  }

  return eol;

})(EOL || {}, jQuery);
