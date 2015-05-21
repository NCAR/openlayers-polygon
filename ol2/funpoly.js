var FUNPOLY = (function() {
  var poly = {};

  // many/most of these should be declared at use
  // here for now for easier debugging
  var pointFeature, lineFeature, polygonFeature;
  var polygonLayer, vectorLayer;
  var point, pointList, linearRing;
  var dragF, polygonControl;
  var nav,panel;
  var pro4 = new OpenLayers.Projection('EPSG:4326');  // WGS84, GPS, longlat
  var xformControl;
  var mapPoint;

  function dragStart(f,p) {
   console.log('dragStart');
   console.log(f);
   console.log(p);
  }
  function dragDrag(f,p) {
   console.log('dragDrag');
   console.log(f);
   console.log(p);
  }
  function dragComplete(f,p) {
   console.log('dragComplete');
   console.log(f);
   console.log(p);
  }
  function dragEnter(f,p) {
   console.log('dragEnter');
   console.log(f);
   console.log(p);
  }
  function dragLeave(f,p) {
   console.log('dragLeave');
   console.log(f);
   console.log(p);
  }

  poly.init = function(map,sides,addTransformer) {
    //return map;
    if (sides === null || sides === undefined) sides = 6;
    addTransformer = true === addTransformer;

    polygonLayer = new OpenLayers.Layer.Vector('Polygon Layer');
    map.addLayers([polygonLayer]);

    var style_blue = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
    style_blue.strokeColor = 'blue'; 
    style_blue.fillColor = 'blue'; 
    var style_green = {
        strokeColor: '#339933',
        strokeOpacity: 1,
        strokeWidth: 3,
        pointRadius: 6,
        pointerEvents: 'visiblePainted'
    };

    var vectorOptions = {};
    if (addTransformer) {
      vectorOptions = {
        styleMap: new OpenLayers.StyleMap({
          // a nice style for the transformation box
          "transform": new OpenLayers.Style({
              display: "${getDisplay}",
              cursor: "${role}",
              pointRadius: 5,
              fillColor: "white",
              fillOpacity: 1,
              strokeColor: "black"
          }, {
              context: {
                  getDisplay: function(feature) {
                      // hide the resize handle at the south-east corner
                      return feature.attributes.role === "se-resize" ? "none" : "";
                  }
              }
          }),
          "rotate": new OpenLayers.Style({
              display: "${getDisplay}",
              pointRadius: 10,
              fillColor: "#ddd",
              fillOpacity: 1,
              strokeColor: "black"
          }, {
              context: {
                  getDisplay: function(feature) {
                      // only display the rotate handle at the south-east corner
                      return feature.attributes.role === "se-rotate" ? "" : "none";
                  }
              }
          })
      }),
      renderers: OpenLayers.Layer.Vector.prototype.renderers
      }
    }

    vectorLayer = new OpenLayers.Layer.Vector('Simple Geometry',vectorOptions);

    // create a point feature
    //point = new OpenLayers.Geometry.Point(-105.2403,40.0374);
    point = new OpenLayers.Geometry.Point(-103.945213,40.083225);
    mapPoint =  point.transform(pro4, map.getProjectionObject());
    pointFeature = new OpenLayers.Feature.Vector(mapPoint, null, style_blue);

    // create a polygon feature from a linear ring of points
    pointList = [];
    for(var p=0; p<sides; ++p) {
        var a = p * (2 * Math.PI) / sides;
        var r = 25000;
        var newPoint = new OpenLayers.Geometry.Point(mapPoint.x + (r * Math.cos(a)),
                                                     mapPoint.y + (r * Math.sin(a)));
        pointList.push(newPoint);
    }
    pointList.push(pointList[0]);

    linearRing = new OpenLayers.Geometry.LinearRing(pointList);
    polygonFeature = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.Polygon([linearRing])
        );


    vectorLayer.addFeatures([pointFeature, polygonFeature]);
    map.addLayer(vectorLayer);

    if (!addTransformer) {
      dragF = new OpenLayers.Control.DragFeature(vectorLayer,
        {
         onStart: dragStart ,
         onDrag: dragDrag ,
         onComplete: dragComplete ,
         onEnter: dragEnter ,
         onLeave: dragLeave
      });

      polygonControl = new OpenLayers.Control.DrawFeature(polygonLayer,
                                      OpenLayers.Handler.RegularPolygon,
                                      {handlerOptions: {
                                        sides: sides,
                                        radius: 25
                                        }
                                      }
                                    );

      panel = new OpenLayers.Control.Panel({
        defaultControl: dragF,
        controls:[dragF,polygonControl],
      });
      panel.addControls([dragF,polygonControl]);
      map.addControl(panel);
    }

    if (addTransformer) {

      xformControl = new OpenLayers.Control.TransformFeature(vectorLayer, {
        renderIntent: 'transform',
        rotationHandleSymbolizer: 'rotate',
        preserveAspectRatio: true,
        //box:
        center: mapPoint,
        //dragControl:
        irregular: false,
      });
      map.addControl(xformControl);

      //xformControl.setFeature(polygonFeature, {rotation: 45, scale: 0.5, ratio: 1.5});
      //xformControl.setFeature(polygonFeature, {rotation: 360/sides});
      xformControl.setFeature(polygonFeature);

    }

    return map;
  };

  return poly;
}());
