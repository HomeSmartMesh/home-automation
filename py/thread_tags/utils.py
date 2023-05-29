import json
import yaml

def load_yaml(fileName):
    with open(fileName, "r") as stream:
        try:
            return yaml.safe_load(stream)
        except yaml.YAMLError as e:
            print(e)
    return

def load_json(fileName):
    return json.load(open(fileName))

def save_json(fileName,data):
    jfile = open(fileName, "w")
    jfile.write(json.dumps(data, indent=4))
    jfile.close()
    print(f"{len(data)} entries saved in {fileName}")
    return

def load_file(filename):
    with open(filename, "r") as file:
        return file.read()

def save_file(fileName,data):
    data_file = open(fileName, "wb")
    data_file.write(data.encode("utf-8"))
    data_file.close()
    print(f"{len(data)} bytes saved in {fileName}")
    return

def csv_to_list(csv_file_name):
    header = True
    with open(csv_file_name, "r") as csv_file:
        posts = []
        for line in csv_file:
            line = line.replace('\n','')
            if(header):
                header = False
                columns = line.split(',')
                print(f"importing csv with columns: {columns}")
            else:
                cells = line.split(',')
                fields = {}
                skip_line = False
                for index,cell in enumerate(cells):
                    if(cell == "."):
                        skip_line = True
                        break
                    col_name = columns[index]
                    if(col_name in ["time","date","Date"]):
                        fields[col_name] = cell
                    else:
                        fields[col_name] = float(cell)
                if(skip_line):
                    continue
                posts.append(fields)
        return posts

def csv_text_to_lists(csv_text,nb_lines_skip=0):
    header = True
    lists = {}
    lines = csv_text.splitlines()[nb_lines_skip:]
    for line in lines:
        line = line.replace('\n','')
        if(header):
            header = False
            columns = line.split(',')
            print(f"importing csv with columns: {columns}")
            for column in columns:
                lists[column] = []
        else:
            cells = line.split('","')
            if(len(cells) != len(columns)):
                continue
            for index,cell in enumerate(cells):
                cell_content = cell.replace('"','')
                col_name = columns[index]
                if("," in cell_content):
                    float_string = cell_content.replace('.','').replace(',','.')
                    lists[col_name].append(float(float_string))
                else:
                    lists[col_name].append(cell_content)
    return lists

def csv_date_floats_to_lists(csv_text):
    header = True
    lists = {}
    for line in csv_text:
        line = line.replace('\n','')
        if(header):
            header = False
            columns = line.split(',')
            print(f"importing csv with columns: {columns}")
            for column in columns:
                lists[column] = []
        else:
            cells = line.split(',')
            for index,cell in enumerate(cells):
                if(cell == "."):
                    break
                col_name = columns[index]
                if(col_name in ["time","date","Date"]):
                    lists[col_name].append(cell)
                else:
                    lists[col_name].append(float(cell))
    return lists

def csv_to_lists(csv_file_name):
    header = True
    with open(csv_file_name, "r") as csv_file:
        return csv_date_floats_to_lists(csv_file)
