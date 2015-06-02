var FUNPOLYINFO = (function() {
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

  function xformFun(e) {
    console.log('xformFun e='+e);
    console.log(e);

    if (e.center) {
      console.log('center='+e.center);
      console.log(e.center);
    }

    if (e.scale) {
      console.log('scale='+e.scale);
      console.log(e.scale);
    }

    if (e.ratio) {
      console.log('ratio='+e.ratio);
      console.log(e.ratio);
    }

    if (e.rotation) {
      console.log('rotation='+e.rotation);
      console.log(e.rotation);
    }

    // e.object is the olControlTransformFeature, not the registered polygonFeature
    afterXform({feature:e.object.feature});

    return true;
  }

  function afterXform(e) {
    console.log('afterXform e='+e);
    console.log(e);
    var l=e.feature.geometry.components[0];
    var c=l.getCentroid();
    var ll=c.transform(map.getProjectionObject(),pro4);
    var r=Math.round(l.getLength()/1000.0)/10.0;
    var txt = 'C='+llround(ll.y)+','+llround(ll.x)+',R='+r+'Km';
    console.log(txt);
    var d = document.getElementById('polygonInfo');
    if (d) d.innerHTML=txt;
    return true;
  }

  function llround(x) {
    return Math.round(x*10000)/10000;
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
    //point = new OpenLayers.Geometry.Point(-103.945213,40.083225);
    //mapPoint =  point.transform(pro4, map.getProjectionObject());
    var center = map.getCenter();
    mapPoint = new OpenLayers.Geometry.Point(center.lon,center.lat);

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


    //vectorLayer.addFeatures([pointFeature, polygonFeature]);
    vectorLayer.addFeatures([ polygonFeature]);
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
      xformControl.events.register('transform',polygonFeature,xformFun);
      xformControl.events.register('transformcomplete',polygonFeature,afterXform);
      map.addControl(xformControl);

      //xformControl.setFeature(polygonFeature, {rotation: 45, scale: 0.5, ratio: 1.5});
      xformControl.setFeature(polygonFeature, {rotation: 360/sides});
      //xformControl.setFeature(polygonFeature);

      afterXform({feature:polygonFeature});

    }

    return map;
  };

  return poly;
}());
