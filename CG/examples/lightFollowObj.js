import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import KeyboardState from '../libs/util/KeyboardState.js';
import {initRenderer, 
        InfoBox,
        initCamera,
        createGroundPlaneXZ,
        onWindowResize} from "../libs/util/util.js";

let scene, renderer, camera, orbit, keyboard; 
scene = new THREE.Scene();    
renderer = initRenderer();    
camera = initCamera(new THREE.Vector3(0,60,80));
orbit = new OrbitControls( camera, renderer.domElement ); 
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );
keyboard = new KeyboardState();
showInformation();

// Set lights
scene.add( new THREE.AmbientLight("rgb(255,255,255)", 0.2) );

let spotLight = new THREE.SpotLight( "rgb(255,255,255)", 700.0);
    spotLight.position.copy(new THREE.Vector3(0.0, 25, 0));
    spotLight.penumbra = 1.8;    
    spotLight.angle = THREE.MathUtils.degToRad(35);   
    spotLight.castShadow = true;
scene.add(spotLight);

// Set environment
let object = buildObject(4.0)
scene.add(object);
scene.add( createGroundPlaneXZ(100, 100, 50, 50, "rgb(170, 206, 226)") )

// Make the spotlight point to the object
spotLight.target.position.copy(object.position);
scene.add(spotLight.target);

render();

function buildObject(size) {
   let geometry = new THREE.BoxGeometry(size, size, size);
   let material = new THREE.MeshLambertMaterial({ color: "red" });
   let obj = new THREE.Mesh(geometry, material);

   geometry = new THREE.ConeGeometry( size/2, size, 50 );
   material = new THREE.MeshLambertMaterial( {color: 0xffff00} );
   let cone = new THREE.Mesh( geometry, material );
      cone.rotateX( Math.PI/2 );
      cone.position.z+=size
   obj.add(cone);

   obj.castShadow = true;
   cone.castShadow = true;
   obj.position.set(0, size / 2 + 0.1, 0);
   return obj;
}

function keyboardUpdate() {

  keyboard.update();

  if ( keyboard.pressed("up") )    object.translateZ(  1 );
  if ( keyboard.pressed("down") )  object.translateZ( -1 );

  var angle = THREE.MathUtils.degToRad(10);
  if ( keyboard.pressed("left") )  object.rotateY(  angle );
  if ( keyboard.pressed("right") ) object.rotateY( -angle );

}

function showInformation()
{
  var controls = new InfoBox();
    controls.add("Light target following object");
    controls.addParagraph();
    controls.add("Use mouse to rotate/pan/zoom the camera");
    controls.add("Up / Arrow to walk");
    controls.add("Left / Right arrow to turn");
    controls.show();
}

function render()
{
   keyboardUpdate();

   // Update spotlight target position
   spotLight.target.position.copy(object.position);

   requestAnimationFrame(render)
   renderer.render(scene, camera)
}
