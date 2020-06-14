from influxdb import InfluxDBClient
import influxdb
import requests
import sys

def inject_print(df):
    header = True
    with open(csv_file_name, "r") as csv_file:
        for line in csv_file:
            print("-----------------")
            if(header):
                header = False
                line = line.replace('\n','')
                columns = line.split(',')
                print(columns)
            else:
                cells = line.split(',')
                for index,cell in enumerate(cells):
                    col_name = columns[index]
                    print(f"{index} >{col_name}:{cell}")
# -------------------- mqtt events -------------------- 
def inject(data):
    header = True
    with open(csv_file_name, "r") as csv_file:
        posts = []
        for line in csv_file:
            print("-----------------")
            if(header):
                header = False
                line = line.replace('\n','')
                columns = line.split(',')
                print(columns)
            else:
                cells = line.split(',')
                fields = {}
                for index,cell in enumerate(cells):
                    col_name = columns[index]
                    if(col_name == "name"):
                        measurement = cell
                    elif(col_name == "time"):
                        time = cell
                    else:
                        fields[col_name] = cell
                posts.append(
                    {
                        "measurement": measurement,
                        "time": time,
                        "fields": fields
                    }
                )
        try:
            clientDB.write_points(posts)
            print(f"{measurement} @ {index} posted")
        except requests.exceptions.ConnectionError:
            print("ConnectionError")
        except influxdb.exceptions.InfluxDBServerError:
            print("InfluxDBServerError")
        except influxdb.exceptions.InfluxDBClientError as e:
            print("InfluxDBClientError")
        print(f"written {len(posts)} posts")

# -------------------- influxDB client -------------------- 
clientDB = InfluxDBClient("10.0.0.3",8086,'root', 'root',"test")

#csv_file = "D:\\Dev\\HomeSmartMesh\\kitchen_voltage.csv"
csv_file_name = sys.argv[1]
inject(csv_file_name)

#influx -database 'test' -execute 'SELECT "voltage" FROM "kitchen tag"'
