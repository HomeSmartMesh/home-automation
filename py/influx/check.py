import influx_utils as itl
import utils as utl


db_client_config = utl.load_json("check.json")

itl.create(db_client_config)

#res = itl.check()
#utl.save_json("info.json",res)

pd = itl.get_pandas("Flora1")
pd.head()
#itl.check_measurement("shelly tv")
