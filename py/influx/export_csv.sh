influx -database 'meshNodes' -execute 'SELECT "temperature" FROM "node78" WHERE time > now() - 1y' -format 'csv' > /home/pi/share/$(date +%F)_influx_backup.csv

empty
influx -database 'mqtt' -execute 'SELECT "voltage" FROM "kitchen tag" WHERE time>'\''2020-06-14 14:05:37'\'' AND time<'\''2020-06-14 14:11:10'\'''  -format "csv" > /home/wass/share/kitchen_voltage.csv

error
influx -database 'mqtt' -execute 'SELECT "voltage" FROM "kitchen tag" WHERE time>"2020-06-14 14:05:37" AND time<"2020-06-14 14:11:10"'  -format "csv" > /home/wass/share/kitchen_voltage.csv

OK:
influx -database 'mqtt' -execute 'SELECT "voltage" FROM "kitchen tag" WHERE time>now()-1h'  -format "csv" > /home/wass/share/kitchen_voltage.csv


OK:
influx -database 'mqtt' -execute 'SELECT "voltage" FROM "kitchen tag" WHERE time>'\''2020-06-14T12:01:00.000Z'\'' AND time<'\''2020-06-14T13:01:00.000Z'\'''  -format "csv" > /home/wass/share/kitchen_voltage2.csv

OK:
influx -database 'mqtt' -execute 'SELECT "voltage" FROM "kitchen tag" WHERE time>1592136375876241919 AND time<1592136375982956033'  -format "csv" > /home/wass/share/kitchen_voltage3.csv

