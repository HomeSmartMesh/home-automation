import json

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

