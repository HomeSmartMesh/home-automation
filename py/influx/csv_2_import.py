import sys
import os

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
def import_csv(data):
    header = True
    with open(csv_file_name, "r") as csv_file:
        posts = []
        for line in csv_file:
            line = line.replace('\n','')
            if(header):
                header = False
                columns = line.split(',')
                print(columns)
            else:
                cells = line.split(',')
                fields = {}
                measurement = ""
                time = 0
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
        return posts

def export_txt(posts,fileName,dbName):
    with open(fileName, 'w', newline='\n') as efile:
        efile.write("# DDL\n")
        efile.write("\n")
        efile.write(f"CREATE DATABASE {dbName}\n")
        efile.write("\n")
        efile.write("# DML\n")
        efile.write("\n")
        efile.write(f"# CONTEXT-DATABASE: {dbName}\n")
        efile.write("\n")

        for post in posts:
            name = post["measurement"]
            name.replace(' ','\\ ')
            line = f"{name} "
            for filed_name,field_val in post["fields"].items():
                line = line + f"{filed_name}={field_val} "
            line = line + post["time"]
            efile.write(line+'\n')
    return

# -------------------- influxDB client -------------------- 
csv_file_name = sys.argv[1]
dbName = sys.argv[2]

#csv_file = "D:\\Dev\\HomeSmartMesh\\kitchen_voltage.csv"
posts = import_csv(csv_file_name)

pre, ext = os.path.splitext(csv_file_name)
export_file = pre + '.txt'


export_txt(posts,export_file,dbName)

#influx -database 'test' -execute 'SELECT "voltage" FROM "kitchen tag"'
