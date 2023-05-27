import influx_utils as itl
import utils as utl

def get_measurements():

    measurements = itl.get_measurements_list()
    print(measurements)
    utl.save_json("measurements_silent.json",measurements)
    return

def backup_measurements():
    measurements = utl.load_json("measurements_silent.json")
    for measure in measurements:
        print(f"fetching '{measure}'")
        #res = itl.get_pandas_range(measure,'2022-01-01 00:00:00','2023-01-01 00:00:00')
        #res = itl.get_pandas_range(measure,'2022-01-01 00:00:00','2022-07-01 00:00:00')
        #res = itl.get_pandas_range(measure,'2022-07-01 00:00:00','2023-01-01 00:00:00')
        #res = itl.get_pandas_range(measure,'2023-01-01 00:00:00','2023-04-01 00:00:00')
        res = itl.get_pandas_range(measure,'2023-04-01 00:00:00','2023-05-27 00:00:00')
        res = itl.get_pandas(measure)
        if(measure in res):
            df = res[measure]
            print(df)
            begin = df.index[0].strftime('%Y-%m-%d')
            end = df.index[-1].strftime('%Y-%m-%d')
            filename = f"./data/{measure} {begin} {end}.pkl"
            df.to_pickle(filename)
        else:
            print(f"measurement '{measure}' out of range")
    return


db_client_config = utl.load_json("backup_config.json")
itl.create_pandas(db_client_config)

#get_measurements()
backup_measurements()
