sudo apt-get update && sudo apt-get upgrade -y
# -------- git -------- 
if [ -x "$(command git)" ]; then
    echo "git available"
else
    echo "Installing git"
    sudo apt-get install git -y
fi

git clone https://github.com/HomeSmartMesh/raspi.git
cd raspi
sudo sh setup.sh
