import pandas as pd
from collections import OrderedDict

def cumulate(raw_energy):
    total_energy = []
    total_energy_index = []
    history = 0
    prev = 0
    for index, item in raw_energy.iteritems():
        if(item < prev):
            history += prev
        prev = item
        total_energy_index.append(index)
        total_energy.append(item+history)
    return pd.Series(total_energy, index=total_energy_index)

def daily(cumul):
    days_list = []
    days_energy_list = []
    for idx, day in cumul.groupby(cumul.index.date):
        diff_day = day[-1] - day[0]
        days_list.append(idx)
        days_energy_list.append(diff_day)
    return pd.Series(days_energy_list, index = pd.to_datetime(days_list))

def monthly(daily):
    months_groups = daily.groupby(pd.Grouper(freq='1M')).sum()
    months_groups.index = months_groups.index.strftime('%B %Y')
    return months_groups

def monthly_json(monthly):
    result = OrderedDict()
    for index, item in monthly.iteritems():
        result[index] = item
    return result
