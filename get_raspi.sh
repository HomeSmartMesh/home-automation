sudo apt-get update && sudo apt-get upgrade -y
# -------- git -------- 
if [ -x "$(command --version git)" ]; then
    echo "git available"
else
    echo "Installing docker"
    sudo apt-get install git
fi

git clone https://github.com/HomeSmartMesh/raspi.git
cd raspi
sudo sh setup.sh
