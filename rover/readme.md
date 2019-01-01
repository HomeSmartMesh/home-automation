# MQTT commands
subscribe

    mosquitto_sub -t 'jNodes/75/#' -t 'Nodes/75/#' -v | ts

publish on rov

    mosquitto_pub -t 'jNodes/75/rov' -m '{"alpha":2, "norm":0.3}'

