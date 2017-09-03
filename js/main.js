import { scene, camera, renderer } from './common/scene';
import { setEvents } from './common/setEvents';
import { convertToXYZ, getEventCenter, geodecoder } from './common/geoHelpers';
import { mapTexture } from './common/mapTexture';
import { getTween, memoize } from './common/utils';
import topojson from 'topojson';
import THREE from 'THREE';
import d3 from 'd3';


d3.json('data/world.json', function(err, data) {

    d3.select("#loading").transition().duration(500)
        .style("opacity", 0).remove();

    var currentCountry, overlay;

    var segments = 155; // number of vertices. Higher = better mouse accuracy

    // Setup cache for country textures
    var countries = topojson.feature(data, data.objects.countries);
    var geo = geodecoder(countries.features);

    var textureCache = memoize(function(cntryID, color) {
        var country = geo.find(cntryID);
        return mapTexture(country, color);
    });

    // Base globe with blue "water"
    let blueMaterial = new THREE.MeshPhongMaterial({ color: '#2B3B59', transparent: true });
    let sphere = new THREE.SphereGeometry(200, segments, segments);
    let baseGlobe = new THREE.Mesh(sphere, blueMaterial);
    baseGlobe.rotation.y = Math.PI;
    baseGlobe.addEventListener('click', onGlobeClick);
    baseGlobe.addEventListener('mousemove', onGlobeMousemove);

    // add base map layer with all countries
    let worldTexture = mapTexture(countries, '#647089');
    let mapMaterial = new THREE.MeshPhongMaterial({ map: worldTexture, transparent: true });
    var baseMap = new THREE.Mesh(new THREE.SphereGeometry(200, segments, segments), mapMaterial);
    baseMap.rotation.y = Math.PI;

    // create a container node and add the two meshes
    var root = new THREE.Object3D();
    root.scale.set(2.5, 2.5, 2.5);
    root.add(baseGlobe);
    root.add(baseMap);
    scene.add(root);

    function onGlobeClick(event) {

        // Get pointc, convert to latitude/longitude
        var latlng = getEventCenter.call(this, event);

        // Get new camera position
        var temp = new THREE.Mesh();
        temp.position.copy(convertToXYZ(latlng, 900));
        temp.lookAt(root.position);
        temp.rotateY(Math.PI);

        for (let key in temp.rotation) {
            if (temp.rotation[key] - camera.rotation[key] > Math.PI) {
                temp.rotation[key] -= Math.PI * 2;
            } else if (camera.rotation[key] - temp.rotation[key] > Math.PI) {
                temp.rotation[key] += Math.PI * 2;
            }
        }

        var tweenPos = getTween.call(camera, 'position', temp.position);
        d3.timer(tweenPos);

        var tweenRot = getTween.call(camera, 'rotation', temp.rotation);
        d3.timer(tweenRot);
    }

    function onGlobeMousemove(event) {
        var map, material;
        var countryEvidence = {


            "Nigeria": '<a data-flickr-embed="true"  href="https://www.flickr.com/photos/images-twiston/36795739976/in/explore-2017-09-02/" title="A tranquil dawn"><img src="https://farm5.staticflickr.com/4388/36795739976_28f48170e1_k.jpg" width="2048" height="1363" alt="A tranquil dawn"></a><script async src="//embedr.flickr.com/assets/client-code.js" charset="utf-8"></script>',
            "Egypt": '<a href="about:blank"> DOC </a>'
        };
        window.countryEvidence = countryEvidence;
        // Get pointc, convert to latitude/longitude
        var latlng = getEventCenter.call(this, event);

        // Look for country at that latitude/longitude
        var country = geo.search(latlng[0], latlng[1]);

        if (country !== null && country.code !== currentCountry) {

            // Track the current country displayed
            currentCountry = country.code;

            // Update the html
            d3.select("#msg").html(country.code);
            if (window.countryEvidence[country.code] !== undefined) {

                d3.select("#msg2").html(countryEvidence[country.code]);
            } else {
                d3.select("#msg2").html("<p></p>");
            }
            // Overlay the selected country
            map = textureCache(country.code, '#CDC290');
            material = new THREE.MeshPhongMaterial({ map: map, transparent: true });
            if (!overlay) {
                overlay = new THREE.Mesh(new THREE.SphereGeometry(201, 40, 40), material);
                overlay.rotation.y = Math.PI;
                root.add(overlay);
            } else {
                overlay.material = material;
            }
        }
    }

    setEvents(camera, [baseGlobe], 'click');
    setEvents(camera, [baseGlobe], 'mousemove', 10);
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();