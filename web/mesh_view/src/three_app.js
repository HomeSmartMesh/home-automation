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
var mouse = {
	"is_inside_object":false,
	"object":""
};

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
			//send_custom_event('house_config',house_config);
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
			color: 0xb5b2b9,
			emissive: 0x272524,
			specular:0x000000,
			side: THREE.FrontSide,
			flatShading: true
		});

		this.mesh = new THREE.Mesh( geometry, material );
		this.mesh.name = name;
		this.mesh.position.set(pos.x,pos.y,pos.z);
		scene.add( this.mesh );
		
		}
	setReachState(is_reachable){
		if(is_reachable){
			var emit = 0x877564;
		}
		else{
			var emit = 0x171514;
			}
		var material = new THREE.MeshPhongMaterial( {
			color: this.mesh.material.color,
			emissive: emit,
			specular: this.mesh.material.specular,
			side: this.mesh.material.side,
			flatShading: this.mesh.material.flatShading
		});
		this.mesh.material = material;

	}
	setMouseState(is_inside){
		if(is_inside){
			var spec = 0xaa0000;
		}
		else{
			var spec = 0x000000;
		}
		var material = new THREE.MeshPhongMaterial( {
			color: this.mesh.material.color,
			emissive: this.mesh.material.emissive,
			specular: spec,
			side: this.mesh.material.side,
			flatShading: this.mesh.material.flatShading
		});
		this.mesh.material = material;
		console.log("specular = ",this.mesh.material.specular);
	}
	setLightState(is_on){
		if(is_on){
			var emit = 0xb5b3b0;
		}
		else{
			var emit = 0x877564;
		}
		var material = new THREE.MeshPhongMaterial( {
			color: this.mesh.material.color,
			emissive: emit,
			specular: this.mesh.material.specular,
			side: this.mesh.material.side,
			flatShading: this.mesh.material.flatShading
		});
		this.mesh.material = material;
		console.log("specular = ",this.mesh.material.specular);
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
		loader.load( house_config.stl_model, function ( geometry ) {
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
			RoomName.add(room_name,room.text.x,room.text.y);
		}
	}

	add_light(room_name,room_config){
		var light = new THREE.PointLight( 0xffffff, 0.6, 800, 2 );
		var pos = {"x":room_config.light.x,"y":200,"z":room_config.light.y}
		light.position.set( pos.x,pos.y,pos.z );
		console.log("light set in ",room_name," at ",pos.x,",",pos.z);
		scene.add( light );
		this.lights[room_name] = light;
		this.bulbs[room_name] = new LightBulb(room_name,pos);
	}

	add_light_pos(pos,name){
		var light = new THREE.PointLight( 0xffffff, 0.6, 800, 2 );
		light.position.set( pos.x,pos.y,pos.z );
		light.castShadow = true;
		light.shadow.mapSize.width = 512;  // default
		light.shadow.mapSize.height = 512; // default
		light.shadow.camera.near = 20;       // default
		light.shadow.camera.far = 1000      // default
		scene.add( light );
		this.lights[name] = light;
		this.bulbs[name] = new LightBulb(name,pos);
		this.light_meshes.push(this.bulbs[name].mesh);
	}
	
	add_ambient_light(){
		//var a_light = new THREE.AmbientLight( 0x303030 ); // soft white light
		//scene.add( a_light );		
		var h_light = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.2 );
		//h_light.color.setHSL( 0.6, 0.6, 0.6 );
		//h_light.groundColor.setHSL( 1, 1, 0.75 );
		h_light.position.set( 0, 500, 0 );
		scene.add( h_light );	

		var dirLight = new THREE.DirectionalLight( 0xffffff, 0.05 );
		dirLight.color.setHSL( 0.1, 1, 0.95 );
		dirLight.position.set( 0, 300, 0 );
		scene.add( dirLight );
		dirLight.castShadow = true;

		dirLight.shadow.mapSize.width = 2048;
		dirLight.shadow.mapSize.height = 2048;

		var d = 600;
		dirLight.shadow.camera.left = - d;
		dirLight.shadow.camera.right = d;
		dirLight.shadow.camera.top = d;
		dirLight.shadow.camera.bottom = - d;
		dirLight.shadow.camera.far = 700;
		dirLight.shadow.bias = - 0.0001;
	}

	add_lights(){
		this.lights = {};
		this.bulbs = {};
		this.light_meshes = [];
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

function onHueGetLights(e){
	MyHome.lights = {};
	MyHome.bulbs = {};
	MyHome.light_meshes = [];
	for (const [light_id,light] of Object.entries(e.detail)) {
		console.log("id : ",light_id," name = ",light.name);
		if(light.name in house_config.lights){
			var pos = house_config.lights[light.name].pos;
			MyHome.add_light_pos(pos,light.name);
		}
	}	
}

function onHueReach(e){
	MyHome.bulbs[e.detail.name].setReachState(e.detail.reachable)
}

function onHueLightState(e){
	MyHome.bulbs[e.detail.name].setLightState(e.detail.on)
}

function onWindowResize() {
	var w = container.clientWidth;
	var h = container.clientHeight;
	camera.aspect = w / h;
	camera.updateProjectionMatrix();

	renderer.setSize( w, h );
}

function process_mouse_event(event_name, event){
	event.preventDefault();

	var rect = container.getBoundingClientRect();
	var l_mouse = new Vector2();
	l_mouse.x = ( ( event.clientX - rect.left ) / rect.width ) * 2 - 1;
	l_mouse.y = - ( ( event.clientY - rect.top ) / rect.height ) * 2 + 1;

	//the projectionMatrixInverse is required but not automatically updated !!!
	camera.projectionMatrixInverse = new THREE.Matrix4();
	camera.projectionMatrixInverse.getInverse(camera.projectionMatrix);
	raycaster.setFromCamera( l_mouse, camera );

	//var bulbs_list = [MyHome.bulbs["Office main"].mesh];
	var bulbs_list = Object.keys(house_config.lights);
	var intersects = raycaster.intersectObjects( MyHome.light_meshes, true );

	if ( intersects.length > 0 ) {
		mouse.object = intersects[ 0 ].object.name;
		if(!mouse.is_inside_object){
			send_custom_event("mesh_mouse_enter",{ type: "light", name: mouse.object});
		}
		mouse.is_inside_object = true;
		send_custom_event(event_name,{ type: "light", name: mouse.object});
	}
	else{
		if(mouse.is_inside_object){
			mouse.is_inside_object = false;
			send_custom_event("mesh_mouse_exit",{ type: "light", name: mouse.object});
		}
	}
}

function onMouseDown(event){
	process_mouse_event("mesh_mouse_down",event)
}

function onMouseMove(event){
	process_mouse_event("mesh_mouse_move",event)
}

function onMeshMouseEnter(e){
	container.style.cursor = "pointer";
	//document.getElementById('viewer').style.cursor = "pointer";
	//document.body.style.cursor = "pointer";
	//$('html,body').css('cursor', 'pointer');
	MyHome.bulbs[e.detail.name].setMouseState(true);
	console.log(`Mesh Mouse Enter : ${e.detail.name} : cursor=${container.style.cursor}`);
}

function onMeshMouseExit(e){
	container.style.cursor = "default";
	MyHome.bulbs[e.detail.name].setMouseState(false);
	console.log(`Mesh Mouse Exit : ${e.detail.name} : cursor=${container.style.cursor}`)
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
	//MyHome.add_nodes();
	//MyHome.add_lights();
	MyHome.add_ambient_light();

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
	window.addEventListener( 'mousemove', onMouseMove, false );
	window.addEventListener( 'mousedown', onMouseDown, false );
	window.addEventListener( 'hue_lights', onHueGetLights, false );
	window.addEventListener( 'hue_reach', onHueReach, false );
	window.addEventListener( 'hue_light_state', onHueLightState, false );
	
	//window.addEventListener( 'mesh_mouse_move', onMeshMouseMove, false );
	window.addEventListener( 'mesh_mouse_enter', onMeshMouseEnter, false );
	window.addEventListener( 'mesh_mouse_exit', onMeshMouseExit, false );

}

function animate() {

	requestAnimationFrame( animate );

	controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

	renderer.render( scene, camera );

}

//----------------------------------------------------------------------------------
export{init};
