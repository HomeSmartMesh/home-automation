import influx_utils as itl
import utils as utl


db_client_config = utl.load_json("backup_config.json")

itl.create_pandas(db_client_config)

measurements = itl.get_measurements_list()
print(measurements)


for measure in measurements:
    print(f"fetching '{measure}'")
    res = itl.get_pandas(measure)
    df = res[measure]
    print(df)
    begin = df.index[0].strftime('%Y-%m-%d')
    end = df.index[-1].strftime('%Y-%m-%d')
    filename = f"./data/{measure} {begin} {end}.pkl"
    df.to_pickle(filename)
