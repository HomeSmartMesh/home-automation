influx -execute 'DROP DATABASE test'
influx -execute 'CREATE DATABASE test'
influx -execute 'SELECT * INTO test.."kitchen tag" FROM mqtt.."kitchen tag"'

