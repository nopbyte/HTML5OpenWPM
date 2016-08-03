#!/bin/bash
# This file has been modified so that it can be automatically executed without user interaction.
# NOw we rely on the flash variable instead of the answer from a user...
#
set -e
flash=false
sudo apt-get update
sudo apt-get install -y firefox htop git python-dev libxml2-dev libxslt-dev libffi-dev libssl-dev build-essential xvfb libboost-python-dev libleveldb1 libleveldb-dev libjpeg-dev wget
if [ "$flash" = true ]; then
    sudo apt-get install -y adobe-flashplugin
fi

# Check if we're running on continuous integration
# Python requirements are already installed by .travis.yml on Travis
if [ "$TRAVIS" != "true" ]; then
	wget https://bootstrap.pypa.io/get-pip.py
	sudo -H python get-pip.py
	rm get-pip.py
	sudo pip install -U -r requirements.txt
fi

# Install specific version of Firefox known to work well with the selenium version above
wget https://ftp.mozilla.org/pub/firefox/releases/45.0.1/linux-x86_64/en-US/firefox-45.0.1.tar.bz2
tar jxf firefox*.tar.bz2
mv firefox firefox-bin
rm firefox*.tar.bz2
