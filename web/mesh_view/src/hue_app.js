
var hue = jsHue();
var user;
var lights;
var light_ids;
var house_config;

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function init(){
    $.getJSON("house.json", function(house_json) {
        house_config = house_json;
        console.log("hue_app>loaded house config");
        var bridge = hue.bridge(house_json.hue.ip);
        $.getJSON("user.json", function(user_data) {
            user = bridge.user(user_data.username);

            user.getLights().then(data => {
                console.log("getLights response");
                lights = data;
                send_custom_event('hue_lights',lights);
                light_ids = {};
                for (const [light_id,light] of Object.entries(lights)) {
                    light_ids[light.name] = light_id;
                    }
                check_lights_states();
            });
        });
    });
    window.addEventListener( 'mesh_mouse_down', onMeshMouseDown, false );

}

function check_lights_states(){
    console.log("===>> check_lights_states()")
    for(let l_name in house_config.lights){
        console.log(l_name)
        let l_id = light_ids[l_name];
        user.getLight(l_id).then(data => {
            console.log(`getLight(${l_id} ${l_name})`);
            console.log(data);
            send_custom_event("hue_reach",{name:l_name,reachable:data.state.reachable})
        });
    }
    

}

//once, manual user creation, call this exported function from main and save the username in user.json
function create_user(){
    $.getJSON("house.json", function(house_json) {
        console.log("hue_app>loaded house config bridge ip = ",house_json.hue.ip);
        var bridge = hue.bridge(house_json.hue.ip);
        // create user account (requires link button to be pressed)
        bridge.createUser('mesh_view#dell').then(data => {
            // extract bridge-generated username from returned data
            var username = data[0].success.username;

            console.log('New username:', username);
            // instantiate user object with username
            user = bridge.user(username);
        });
    });
}

function onMeshMouseDown(event){
    if(event.detail.type == "light"){
        console.log("Mesh Light Mouse Down Event !! for ",event.detail.name);
        var l_id = light_ids[event.detail.name];
        user.getLight(l_id).then(data => {
            console.log("getLight ",data);
            if(data.state.reachable == true) {
                var light_set_state;
                if(data.state.on == true){
                    light_set_state = false;
                }
                else{
                    light_set_state = true;
                }
                user.setLightState(l_id, { on: light_set_state }).then(data => {
                    console.log("SetLightState ",data);
                });
                send_custom_event("hue_light_state",{name:event.detail.name,on:light_set_state})
            }
        });
    }
}
//----------------------------------------------------------------------------------
export{init,create_user};
