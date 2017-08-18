var map;
require([
    "esri/dijit/FeatureTable",
    "esri/dijit/editing/Editor",
    "esri/geometry/Extent",
    "esri/SpatialReference",
    "esri/TimeExtent",
    "esri/map",
    "esri/dijit/Search",
    "esri/dijit/LayerList",
    "esri/dijit/LocateButton",
    "esri/dijit/HomeButton",
    "esri/dijit/BasemapGallery",
    "esri/dijit/Scalebar",
    "esri/layers/FeatureLayer",
    "esri/layers/ArcGISTiledMapServiceLayer", "esri/tasks/query",
    "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol",
    "esri/graphic", "esri/dijit/Popup", "esri/dijit/PopupTemplate", "esri/InfoTemplate",
    "esri/urlUtils", "esri/graphicsUtils",
    "esri/Color",
    "dojo/on", "dojo/query", "dojo/parser", "dojo/dom-construct",
    "esri/sniff",
    "dojo/keys",
    "esri/dijit/Measurement",
    "dojo/dom",
    "esri/SnappingManager",
    "esri/dijit/Legend",
    "dojo/_base/array",

    "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "dijit/TitlePane",
    "dojo/domReady!"
], function (
    FeatureTable,
    Editor,
    Extent,
    SpatialReference,
    TimeExtent,
    Map,
    Search,
    LayerList,
    LocateButton,
    HomeButton,
    BasemapGallery,
    Scalebar,
    FeatureLayer,
    ArcGISTiledMapServiceLayer, Query,
    SimpleFillSymbol, SimpleLineSymbol,
    Graphic, Popup, PopupTemplate, InfoTemplate,
    urlUtils, graphicsUtils,
    Color,
    on, query, parser, domConstruct,
    has,
    keys,
    Measurement,
    dom,
    SnappingManager,
    Legend,
    arrayUtils
) {
        parser.parse();
        var getUrlParameter = function getUrlParameter(sParam) {
            var sPageURL = decodeURIComponent(window.location.search.substring(1)),
                sURLVariables = sPageURL.split('&'),
                sParameterName,
                i;

            for (i = 0; i < sURLVariables.length; i++) {
                sParameterName = sURLVariables[i].split('=');

                if (sParameterName[0] === sParam) {
                    return sParameterName[1] === undefined ? true : sParameterName[1];
                }
            }
        };

        // All layer URL
        var featureLayersURL = [getUrlParameter('layer')];
        var featureLayers = [];

        var sfs = new SimpleFillSymbol(
            SimpleFillSymbol.STYLE_SOLID,
            new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color([0, 0, 0, 0]),
                2
            ),
            new Color([0, 0, 0, 0])
        );



        var popup = new Popup({
            fillSymbol: sfs
        }, domConstruct.create("div"));

        map = new Map("map", {
            center: [-156.4096344, 20.8032468],
            zoom: 10,
            infoWindow: popup,
            basemap: "topo"
        });
        var initEditing = function (event) {
            var featureLayerInfos = arrayUtils.map(event.layers, function (layer) {
                return {
                    "featureLayer": layer.layer
                };
            });
            var settings = {
                map: map,
                layerInfos: featureLayerInfos
            };
            var params = {
                settings: settings
            };
            var editorWidget = new Editor(params, 'editorDiv');
            editorWidget.startup();
        }
        var setMapExtent = function (event) {
            event.layers.forEach(function (layer) {
                map.setExtent(layer.layer.fullExtent);
            });
        }
        var initFeatureTable = function (event) {
            event.layers.forEach(function (layer) {
                var myFeatureTable = new FeatureTable({
                    "featureLayer": layers[0],
                    "outFields": ["*"],
                    // syncSelection: false,
                    //zoomToSelection:true,
                    "map": map
                }, 'myTableNode');

                myFeatureTable.startup();
            });
        }
        var layersAdded = function (event) {
            // check for editable
            event.layers.forEach(function (layer) {
                if (layer.layer.capabilities.indexOf("Editing")==-1) {
                    $("body").addClass("no-editor");
                    window.dispatchEvent(new Event('resize'));
                }
            });
            initEditing(event);
            setMapExtent(event);
            initFeatureTable(event);
        };
        map.on("layers-add-result", layersAdded);

        // add locate
        var addLocate = function () {
            geoLocate = new LocateButton({
                map: map
            }, "locateButton");
            geoLocate.startup();
        };
        addLocate();
        // add home button
        var addHomeButton = function () {
            var home = new HomeButton({
                map: map
            }, "homeButton");
            home.startup();
        };
        addHomeButton();
        // add scale bar
        var addScaleBar = function () {
            var scalebar = new Scalebar({
                map: map,
                // "dual" displays both miles and kilometers
                // "english" is the default, which displays miles
                // use "metric" for kilometers
                scalebarUnit: "dual"
            });
        };
        addScaleBar();

        //add the basemap gallery, in this case we'll display maps from ArcGIS.com including bing maps
        var addBaseMapGallery = function () {
            var basemapGallery = new BasemapGallery({
                showArcGISBasemaps: true,
                map: map
            }, "basemapGallery");
            basemapGallery.startup();

            basemapGallery.on("error", function (msg) {
                console.log("basemap gallery error:  ", msg);
            });
        }
        addBaseMapGallery();



        //apply a popup template to the parcels layer to format popup info 

        var template = new InfoTemplate();
        template.setTitle("<b>${TMK}</b>");
        template.setContent(getTextContent);

        function getTextContent(property) {
            var tmk = property.attributes.TMK + "";
            tmk = tmk.substring(1, tmk.length) + "0000";// remove the first char and add four zero at the end
            return [
                "<span>GISAcres: ", property.attributes.GISAcres, "</span><br/>",
                "<span>Major Owner: ", property.attributes.MajorOwner, "</span><br/>",
                "<a target='_blank' href='http://qpublic9.qpublic.net/hi_maui_display.php?KEY=",
                tmk,
                , "'>Maui County Tax Info</a>"].join('');

        }


        //add the parcels layer to the map as a feature layer in selection mode we'll use this layer to query and display the selected parcels
        var layers = []
        featureLayersURL.forEach(function (item, i) {
            var layer = new FeatureLayer(item, {
                mode: FeatureLayer.MODE_ONDEMAND,
                outFields: ["*"]
            });
            featureLayers.push({ layer: layer, title: layer.name, visibility: true });
            layers.push(layer);
        });
        map.addLayers(layers);
        // layer list
        var addLayerList = function () {

            var myWidget = new LayerList({
                map: map,
                layers: featureLayers
            }, "layerList");
            myWidget.startup();
        };

        addLayerList();
        //#measurement
        var addMeasurement = function () {
            //dojo.keys.copyKey maps to CTRL on windows and Cmd on Mac., but has wrong code for Chrome on Mac
            var snapManager = map.enableSnapping({
                snapKey: has("mac") ? keys.META : keys.CTRL
            });
            snapManager.setLayerInfos(featureLayers);

            var measurement = new Measurement({
                map: map
            }, dom.byId("measurementDiv"));
            measurement.startup();
        }
        addMeasurement();
        // add search
        var addSearch = function () {
            var search = new Search({
                map: map
            }, "search");
            search.startup();
        };
        addSearch();



        //add the legend
        var addLegend = function (evt) {
            if (featureLayers.length > 0) {
                var legendDijit = new Legend({
                    map: map,
                    layerInfos: featureLayers
                }, "legendDiv");
                legendDijit.startup();
            }
        };
        addLegend();
    });