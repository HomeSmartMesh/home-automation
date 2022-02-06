import influx_utils as itl
import utils as utl


db_client_config = utl.load_json("check.json")

itl.create(db_client_config)

res = itl.check()
utl.save_json("nrf_mesh_info.json",res)
