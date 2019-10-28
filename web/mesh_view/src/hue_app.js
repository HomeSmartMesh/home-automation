
var hue = jsHue();
var user;
var lights;

function init(){
    $.getJSON("house.json", function(house_json) {
        console.log("hue_app>loaded house config");
        var bridge = hue.bridge(house_json.hue.ip);
        $.getJSON("user.json", function(user_data) {
            user = bridge.user(user_data.username);

            user.getLights().then(data => {
                console.log("getLights response");
                lights = data;
                var event = new CustomEvent('hue_lights', {detail:lights});
                window.dispatchEvent(event);
        });
    });
});
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

//----------------------------------------------------------------------------------
export{init,create_user};
