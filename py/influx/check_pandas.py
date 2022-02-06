import influx_utils as itl
import utils as utl


db_client_config = utl.load_json("check.json")

itl.create_pandas(db_client_config)

pd = itl.get_pandas("Flora1")
print(type(pd["Flora1"]))
print(pd["Flora1"])
