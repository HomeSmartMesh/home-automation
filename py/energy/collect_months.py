import pandas as pd
import os
import energy_utils as etl
import utils as utl

def collect_months(filename,div_60_wh):
    print(f"fetching file '{filename}'")
    df = pd.read_pickle(filename)
    raw_energy = df.energy.dropna()
    if(div_60_wh):
        raw_energy = raw_energy.div(60)
    cumul = etl.cumulate(raw_energy)
    daily = etl.daily(cumul)
    monthly = etl.monthly(daily)
    monthly_json = etl.monthly_json(monthly)
    filename_json = filename.replace(".pkl",".json")
    utl.save_json(filename_json,monthly_json)
    return


directory = "./data/"
for file in os.listdir(directory):
     filename = os.fsdecode(file)
     if filename.endswith(".pkl"):
        if filename.startswith("shelly"): 
            collect_months(os.path.join(directory, filename),True)
        else:
            collect_months(os.path.join(directory, filename),False)
