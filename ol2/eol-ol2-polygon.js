var EOL = (function(eol,$) {
  var global = this;

  var map_ = null;
  var vectorLayer_ = null;
  var polygonFeature_ = null;
  var xformControl_ = null;
  var pro4_ = new OpenLayers.Projection('EPSG:4326');  // WGS84, GPS, longlat
  var mappro_ = new OpenLayers.Projection('EPSG:3857');  // default == OSM G**gle/900913
  var element_ = null;
  var changeCallback_ = null;

  function llround(x) {
    return Math.round(x*10000)/10000;
  }

  function xformFun(e) {
    //if (e.center)
    //if (e.scale)
    //if (e.ratio)
    //if (e.rotation)

    // e.object is the olControlTransformFeature, not the registered polygonFeature
    afterXform({feature:e.object.feature});

    return true;
  }

  function afterXform(e) {
    //console.log('afterXform e='+e);
    //console.log(e);
    var lr=e.feature.geometry.components[0];
    var c=lr.getCentroid();
    var ll=c.transform(mappro_,pro4_);

    // don't use lr.getLength() -- weird units
    var p0 = lr.components[0];
    var p1 = lr.components[1];
    var dx = p0.x - p1.x;
    var dy = p0.y - p1.y;
    var r = Math.sqrt(dx * dx + dy * dy);
    var rkm = Math.round(r/100.0)/10.0;

    return changeInfo({
      center:c, lonlat:ll,
      radius:r, radiusKm:rkm,
      angle:null, angleDeg:null
    });
  }

  function changeInfo(data) {
    if (changeCallback_) return changeCallback_(data);
    if (typeof element_ === 'undefined' || element_ === null) return false;

    var txt = ''
    if (data) txt = 'C='+llround(data.lonlat.y)+','+llround(data.lonlat.x)+',R='+data.radiusKm+'Km';

    //console.log(txt);
    element_.innerHTML=txt;
    return true;
  }

  eol.activatePolygon = function(map) {
    if (typeof map === 'undefined' || map === null) map = map_;
    if (typeof map === 'undefined' || map === null) throw new Error('must have a map');
    if (!vectorLayer_) throw new Error('cannot activate polygon before creating the layer');
    if (!polygonFeature_) throw new Error('cannot activate polygon before creating it');
    if (!xformControl_) throw new Error('polygon control is not defined');

    mappro_ = map.getProjectionObject();

    if (map.getLayer(vectorLayer_.id)) return true; // already activated
    if (!map.addLayer(vectorLayer_)) return false;  // map error

    if (!polygonFeature_.geometry.getBounds().intersectsBounds(map.getExtent())) {
      var c = map.getCenter();
      polygonFeature_.move(c);
    }

    map.addControl(xformControl_);
    xformControl_.setFeature(polygonFeature_);
    afterXform({feature:polygonFeature_});

    return true;
  };

  eol.deactivatePolygon = function(map) {
    if (typeof map === 'undefined' || map === null) map = map_;
    if (typeof map === 'undefined' || map === null) throw new Error('must have a map');

    if (!map.getLayer(vectorLayer_.id)) return true; // already deactivated

    changeInfo('');
    xformControl_.unsetFeature();
    xformControl_.deactivate();
    return map.removeLayer(vectorLayer_);
  };

  eol.createPolygon = function(options) {
    if (typeof options === 'undefined' || options === null)
      throw new Error('must have a map or options');
    if (options instanceof OpenLayers.Map) options = {map:options};
    var map = options.map;

    if (!(map instanceof OpenLayers.Map) && !(options.center instanceof OpenLayers.LonLat))
      throw new Error('must have a map or a center');

    if (map) map_ = map;

    var sides = options.sides || 6;
    var activate = true === options.activate;

    var vectorOptions = {};

    vectorOptions = {
      renderers: OpenLayers.Layer.Vector.prototype.renderers,
      styleMap: new OpenLayers.StyleMap({
        // a nice style for the transformation box
        "transform": new OpenLayers.Style({
            display: "${getDisplay}",
            cursor: "${role}",
            pointRadius: 6,
            fillColor: "white",
            fillOpacity: 1,
            strokeColor: "black"
        }, {
            context: {
                getDisplay: function(feature) {
                    // hide the resize handle at the south-east corner
                    //return feature.attributes.role === "se-resize" ? "none" : "";
                    if (feature.attributes.role === 'se-resize') return 'none';
                    if (feature.attributes.role === 'nw-resize') return 'none';
                    if (feature.attributes.role === 'n-resize') return 'none';
                    if (feature.attributes.role === 's-resize') return 'none';
                    if (feature.attributes.role === 'e-resize') return 'none';
                    if (feature.attributes.role === 'w-resize') return 'none';
                    return '';
                }
            }
        }),
        "rotate": new OpenLayers.Style({
            display: "${getDisplay}",
            pointRadius: 8,
            fillColor: "#ddd",
            fillOpacity: 1,
            strokeColor: "black"
        }, {
            context: {
                getDisplay: function(feature) {
                    // only display the rotate handle at the south-east corner
                    if (feature.attributes.role === 'se-rotate') return '';
                    if (feature.attributes.role === 'nw-rotate') return '';
                    return 'none';
                }
            }
        })
      })
    }

    vectorLayer_ = new OpenLayers.Layer.Vector('EOL polygon',vectorOptions);

    // create a point feature
    var center = options.center || map.getCenter();
    var mapPoint = new OpenLayers.Geometry.Point(center.lon,center.lat);

    // radius (length for a hexagon) in map units
    var r = options.radius || 25000;

    // create a polygon feature from a linear ring of points
    var pointList = [];
    for(var p=0; p<sides; ++p) {
        var a = p * (2 * Math.PI) / sides;
        var newPoint = new OpenLayers.Geometry.Point(
          mapPoint.x + (r * Math.cos(a)),
          mapPoint.y + (r * Math.sin(a))
          );
        pointList.push(newPoint);
    }
    pointList.push(pointList[0]);

    var linearRing = new OpenLayers.Geometry.LinearRing(pointList);
    if (options.pointUp) linearRing.rotate(180/sides,mapPoint);

    var style_blue = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
    style_blue.strokeColor = 'blue'; 
    style_blue.fillColor = 'blue'; 
    style_blue.fillOpacity = 0.1;
    style_blue.strokeWidth = 2;

    polygonFeature_ = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.Polygon([linearRing]),
        {},
        style_blue
        );

    vectorLayer_.addFeatures([polygonFeature_]);

    xformControl_ = new OpenLayers.Control.TransformFeature(vectorLayer_, {
      renderIntent: 'transform',
      rotationHandleSymbolizer: 'rotate',
      preserveAspectRatio: true,
      irregular: false,
    });
    xformControl_.events.register('transform',polygonFeature_,xformFun);
    xformControl_.events.register('transformcomplete',polygonFeature_,afterXform);

    if (options.element) {
      if (typeof options.element === 'string') {
        if (typeof $ === 'function')
          element_ = $('#'+options.element).get(0);
        else element_ = document.getElementById(options.element);
      } else if (typeof options.element === 'function')
        element_ = options.element.get(0);
      else element_ = options.element;
    } else if (typeof options.callback === 'function')
      changeCallback_ = options.callback;

    if (activate) eol.activatePolygon();

    return polygonFeature_;
  };

  return eol;
})(EOL || {}, (typeof jQuery === 'undefined' ? null : jQuery));
