import { STLLoader } from '../js/STLLoader.js';

import {
	Matrix4,
	Raycaster,
	Vector2
} from "../js/three.module.js";

var camera, scene, renderer;

var container,controls;

var MyHome;
var nodes_config;
var house_config;
var raycaster;

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function mqtt_send(topic,payload){
	send_custom_event('mqtt_received',{ topic: topic, payload:payload });
}

function onWindowMqtt(e){
	console.log("window message on three_app> topic:",e.detail.topic," payload: ",e.detail.payload);
	MyHome.on_message(e.detail.topic);
}



function init(){
	$.getJSON("nodes.json", function(json) {
		nodes_config = json;
		console.log("loaded sensors config");
		$.getJSON("house.json", function(house_json) {
			house_config = house_json;
			console.log("loaded house config");
			world_init();
			animate();
		
		
		});
	});
}

function swap_yz(pos){
	return new THREE.Vector3(pos.x,pos.z,-pos.y);
}

class Node{
	constructor(id){
		this.id = id;
		var size = 20;
		var nb_sections = 64;
		var geometry = new THREE.SphereGeometry( size, nb_sections,nb_sections );
		//material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
		var material = new THREE.MeshPhongMaterial( {
			color: 0x156289,
			emissive: 0x072534,
			side: THREE.DoubleSide,
			flatShading: true
		});

		this.mesh = new THREE.Mesh( geometry, material );

		var wiregeom = new THREE.SphereBufferGeometry( size, 6, 5 );
		//material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
		var wirematerial = new THREE.MeshBasicMaterial( {wireframe:true, color:0x000000} );

		this.wiremesh = new THREE.Mesh( wiregeom, wirematerial );

		
		var pos;
		if(id in nodes_config)
		{
			if("position" in nodes_config[id])
			{
				pos = nodes_config[id].position;
				pos = swap_yz(pos);
				console.log("nodeid "+id+" has position : "+pos.x,pos.y,pos.z);
			}
			else
			{
				pos = {"x":0,"y":0,"z":0}
				console.log("nodeid "+id+" has no position");
			}

			this.mesh.position.set(pos.x,pos.y,pos.z);
			this.wiremesh.position.set(pos.x,pos.y,pos.z);

			//scene.add( this.wiremesh );
			scene.add( this.mesh );
		}
		else
		{
			console.log("Node(): node id not available:",id);
		}
	}
}

class LightBulb{
	constructor(name,pos){
		this.name = name;
		var size = 20;
		var nb_sections = 64;
		var geometry = new THREE.SphereGeometry( size, nb_sections,nb_sections );
		
		//material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
		var material = new THREE.MeshPhongMaterial( {
			color: 0xf5f2f9,
			emissive: 0xf7f5f4,
			side: THREE.FrontSide,
			flatShading: true
		});

		this.mesh = new THREE.Mesh( geometry, material );
		this.mesh.name = name;
		this.mesh.position.set(pos.x,pos.y,pos.z);
		scene.add( this.mesh );
		
		}
}

function center_mesh(mesh){
	var box = new THREE.Box3().setFromObject( mesh );
	//console.log( "boudning box : ",box.min, box.max, box.getSize() );
	var box_center = box.getCenter();
	mesh.position.set( -box_center.x, 0, -box_center.z );
	//console.log("tx : ",-box_center.x, " ty : ", -box_center.z );
}
class STLModel{
	static init() {
		var material = new THREE.MeshPhongMaterial( { color: 0xFFFFFF, specular: 0x111111, shininess: 10 } );

		var loader = new STLLoader();
		loader.load( 'Valery_Open.stl', function ( geometry ) {
			var mesh = new THREE.Mesh( geometry, material );
			center_mesh(mesh);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			scene.add( mesh );

		} );
	}
}

class RoomName{
	static add(name, pos_x,pos_z) {
		var loader = new THREE.FontLoader();

		loader.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {
		
			var material = new THREE.MeshPhongMaterial( { color: 0xAAAAEA, specular: 0x111171, shininess: 200 } );
			var geometry = new THREE.TextGeometry( name, {
				font: font,
				size: 40,
				height: 5,
				curveSegments: 12,
				bevelEnabled: true,
				bevelThickness: 8,
				bevelSize: 4,
				bevelOffset: 0,
				bevelSegments: 5
			} );
			var mesh = new THREE.Mesh( geometry, material );
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			//mesh.rotation.set(new THREE.Vector3(Math.PI / 2, 0, Math.PI));
			mesh.rotation.x = -Math.PI / 2;
			//mesh.rotation.z = Math.PI;
			mesh.position.set(pos_x, 20, pos_z );
			scene.add( mesh );
		} );
	}
}
class Home {
	constructor(nodes_array) {
		if(! nodes_array)
		{
			this.nodes = [];
		}
		else
		{
			this.nodes = nodes_array;
		}
		STLModel.init();
	}
  
	add_room_names(){
		for (const [room_name,room] of Object.entries(house_config.Rooms)) {
			console.log("Added Room name : ",room_name);
			RoomName.add(room_name,room.center.x,room.center.y);
		}
	}

	add_light(room_name,room_config){
		var light = new THREE.PointLight( 0xffffff, 1, 800, 2 );
		var pos = {"x":room_config.light.x,"y":200,"z":room_config.light.y}
		light.position.set( pos.x,pos.y,pos.z );
		console.log("light set in ",room_name," at ",pos.x,",",pos.z);
		scene.add( light );
		this.lights[room_name] = light;
		this.bulbs[room_name] = new LightBulb(room_name,pos);
	}

	add_light_pos(pos,name){
		var light = new THREE.PointLight( 0xffffff, 1, 800, 2 );
		light.position.set( pos.x,pos.y,pos.z );
		light.castShadow = true;
		light.shadow.mapSize.width = 512;  // default
		light.shadow.mapSize.height = 512; // default
		light.shadow.camera.near = 20;       // default
		light.shadow.camera.far = 1000      // default
		scene.add( light );
		this.lights[name] = light;
		this.bulbs[name] = new LightBulb(name,pos);
	}
	
	add_lights(){
		this.lights = {};
		this.bulbs = {};
		for (const [room_name,room_config] of Object.entries(house_config.Rooms)) {
			this.add_light(room_name,room_config)
		}
	}
	
	add_node(id){
		if(this.nodes.includes(id))
		{
			console.log("Node already available")
		}
		else
		{
			if(id in nodes_config)
			{
				new Node(id);
				this.nodes.push(id);
				console.log(this.nodes);
				console.log("On Home Added Node id > "+id);
			}
			else
			{
				console.log("add_node(): node id not available:",id);
			}
		}
	}

	add_nodes(){
		for(var i=0;i< house_config.Sensors.length;i++){
			this.add_node(house_config.Sensors[i]);
		}
	}

	on_message(mqtt_post){
		var vals = mqtt_post.split("/");
		if(vals.length == 3)
		{
			var nodeid = vals[1];
			this.add_node(parseInt(nodeid));
		}
	}

}

function add_controls(){
	controls = new THREE.OrbitControls( camera, renderer.domElement );

	//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

	controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 1.5;//0.1:too rolly, 1: smooth, 2 unstable

	controls.screenSpacePanning = false;

	controls.minDistance = 100;
	controls.maxDistance = 10000;

	controls.minPolarAngle =  10 * Math.PI / 180;
	controls.maxPolarAngle =  80 * Math.PI / 180;

	controls.rotateSpeed = 0.7;

}

function onHueLights(e){
	MyHome.lights = {};
	MyHome.bulbs = {};
	for (const [light_id,light] of Object.entries(e.detail)) {
		console.log("id : ",light_id," name = ",light.name);
		if(light.name in house_config.lights){
			var pos = house_config.lights[light.name].pos;
			MyHome.add_light_pos(pos,light.name);
		}
	}	
}

function onWindowResize() {
	var w = container.clientWidth;
	var h = container.clientHeight;
	camera.aspect = w / h;
	camera.updateProjectionMatrix();

	renderer.setSize( w, h );
}

function onMouseDown(event){
	event.preventDefault();

	var rect = container.getBoundingClientRect();
	var mouse = new Vector2();
	mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
	mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

	//the projectionMatrixInverse is required but not automatically updated !!!
	camera.projectionMatrixInverse = new THREE.Matrix4();
	camera.projectionMatrixInverse.getInverse(camera.projectionMatrix);
	raycaster.setFromCamera( mouse, camera );

	var bulbs_list = [MyHome.bulbs["Office main"].mesh];
	var intersects = raycaster.intersectObjects( bulbs_list, true );

	if ( intersects.length > 0 ) {
		send_custom_event('mesh_mousedown',{ type: "light", name: intersects[ 0 ].object.name});
	}
}

function world_init() {

	console.log("world_init()");
	if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

	container = document.getElementById('viewer');
	var w = container.clientWidth;
	var h = container.clientHeight;
	
	camera = new THREE.PerspectiveCamera( 45, w / h, 10, 2000 );
	camera.position.z = 1200;
	camera.position.y = 600;

	scene = new THREE.Scene();

	MyHome = new Home();
	MyHome.add_room_names();
	MyHome.add_nodes();
	//MyHome.add_lights();

	raycaster = new Raycaster();


	renderer = new THREE.WebGLRenderer( { antialias: true,alpha:true } );
	renderer.setSize( w, h );
	renderer.setClearColor( 0x000000, 0.0 );

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap	

	container.appendChild(renderer.domElement);

	add_controls();

	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'mqtt_received', onWindowMqtt, false );
	window.addEventListener( 'mousedown', onMouseDown, false );
	window.addEventListener( 'hue_lights', onHueLights, false );

}

function animate() {

	requestAnimationFrame( animate );

	controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

	renderer.render( scene, camera );

}

//----------------------------------------------------------------------------------
export{init};
