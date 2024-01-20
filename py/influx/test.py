import influx_utils as itl
import utils as utl


db_client_config = utl.load_json("backup_config.json")

itl.create(db_client_config)

res = itl.get_measurements_list()
print(res)
